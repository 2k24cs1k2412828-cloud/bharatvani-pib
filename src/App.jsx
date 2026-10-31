import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  Sparkles, 
  RotateCw, 
  AlertCircle, 
  BookmarkCheck, 
  Inbox, 
  Layers, 
  CheckCircle,
  Sprout,
  Terminal,
  Volume2,
  Radio,
  X,
  UserCheck
} from 'lucide-react';

import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import CategoryPills from './components/CategoryPills';
import SearchBar from './components/SearchBar';
import NewsCard from './components/NewsCard';
import ArticleModal from './components/ArticleModal';
import VideoPlayerModal from './components/VideoPlayerModal';
import FactSheetModal from './components/FactSheetModal';
import AudioPlayerBar from './components/AudioPlayerBar';
import Footer from './components/Footer';
import SplashScreen from './components/SplashScreen';
import LanguageSelectionModal from './components/LanguageSelectionModal';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';

import { translations } from './translations';
import { speakFemaleVoice, stopAllSpeech, pauseSpeech, resumeSpeech } from './utils/voiceEngine';
import { subscribeToLiveNews, supabase, isSupabaseClientConfigured } from './utils/supabaseClient';

export default function App() {
  // Onboarding & Splash States
  const [showSplash, setShowSplash] = useState(() => !localStorage.getItem('bharatvani_splash_seen'));
  const [showLanguageOnboarding, setShowLanguageOnboarding] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Auth & Profile Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bharatvani_user') || 'null');
    } catch {
      return null;
    }
  });

  // App Settings persisted in localStorage
  const [lang, setLang] = useState(() => localStorage.getItem('pib_lang') || 'hi');
  const [theme, setTheme] = useState(() => localStorage.getItem('pib_theme') || 'light');
  const [mode, setMode] = useState(() => localStorage.getItem('pib_mode') || 'kisan');
  const [fontScale, setFontScale] = useState(() => {
    const saved = localStorage.getItem('pib_font_scale');
    if (!saved) return 1;
    const val = parseFloat(saved);
    return isNaN(val) ? 1 : Math.min(Math.max(val, 0.85), 1.15);
  });
  
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modals for news detail, video, fact-check
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [videoArticle, setVideoArticle] = useState(null);
  const [factArticle, setFactArticle] = useState(null);
  
  // Real-time notification toast from Supabase
  const [realtimeNotification, setRealtimeNotification] = useState(null);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pib_bookmarks') || '[]');
    } catch {
      return [];
    }
  });

  // Audio Speech Synthesis state
  const [audioState, setAudioState] = useState({
    isPlaying: false,
    isPaused: false,
    currentArticle: null,
    rate: 1,
  });

  const t = translations[lang];

  // Sync settings to localStorage and HTML DOM
  useEffect(() => {
    localStorage.setItem('pib_lang', lang);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('pib_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('pib_mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('pib_font_scale', fontScale.toString());
    document.documentElement.style.setProperty('--font-scale', fontScale.toString());
  }, [fontScale]);

  useEffect(() => {
    localStorage.setItem('pib_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Listen to Supabase Auth State Changes
  useEffect(() => {
    if (isSupabaseClientConfigured() && supabase) {
      // Get initial session
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setCurrentUser(user);
          localStorage.setItem('bharatvani_user', JSON.stringify(user));
        }
      });

      // Subscribe to login/logout events
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          setCurrentUser(session.user);
          localStorage.setItem('bharatvani_user', JSON.stringify(session.user));
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          localStorage.removeItem('bharatvani_user');
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Fetch News Feed from API
  const fetchNews = async (force = false) => {
    if (force) setIsRefreshing(true);
    else setLoading(true);

    try {
      const res = await axios.get(`/api/news?lang=${lang}&force=${force}`);
      if (res.data.success && Array.isArray(res.data.data)) {
        setArticles(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load news:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews(false);
  }, [lang]);

  // Real-time Supabase WebSocket Listener
  useEffect(() => {
    const unsubscribe = subscribeToLiveNews((newArticle) => {
      // Prepend to state if not duplicate
      setArticles((prev) => {
        if (prev.some((a) => a.id === newArticle.id || a.prid === newArticle.prid)) {
          return prev;
        }
        return [newArticle, ...prev];
      });

      // Show live broadcast notification banner
      setRealtimeNotification({
        title: newArticle.title,
        article: newArticle,
        time: new Date().toLocaleTimeString(),
      });
    }, lang);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [lang]);

  // Splash Screen Complete -> Trigger Language Onboarding if first time
  const handleSplashComplete = () => {
    localStorage.setItem('bharatvani_splash_seen', 'true');
    setShowSplash(false);
    if (!localStorage.getItem('bharatvani_onboarding_done')) {
      setShowLanguageOnboarding(true);
    }
  };

  // Language Onboarding Complete -> Prompt Auth or enter App
  const handleLanguageOnboardingComplete = (selectedCode) => {
    setLang(selectedCode);
    setShowLanguageOnboarding(false);
    localStorage.setItem('bharatvani_onboarding_done', 'true');
    if (!currentUser) {
      setShowAuthModal(true);
    }
  };

  // Bookmarking Toggle
  const toggleBookmark = (article) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.id === article.id);
      if (exists) {
        return prev.filter((b) => b.id !== article.id);
      } else {
        return [...prev, article];
      }
    });
  };

  // Speech Synthesis Controller with Pure Female AI Voice
  const stopAudio = () => {
    stopAllSpeech();
    setAudioState((prev) => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentArticle: null,
    }));
  };

  const playAudio = (article) => {
    if (audioState.isPlaying && audioState.currentArticle?.id === article.id) {
      if (audioState.isPaused) {
        resumeSpeech();
        setAudioState((prev) => ({ ...prev, isPaused: false }));
      } else {
        pauseSpeech();
        setAudioState((prev) => ({ ...prev, isPaused: true }));
      }
      return;
    }

    stopAudio();

    const textToSpeak = article.textToRead || `${article.title}. ${article.description || ''}`;

    speakFemaleVoice({
      text: textToSpeak,
      lang: lang,
      rate: audioState.rate,
      onEnd: () => {
        setAudioState((prev) => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          currentArticle: null,
        }));
      },
      onError: () => {
        setAudioState((prev) => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          currentArticle: null,
        }));
      },
    });

    setAudioState((prev) => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      currentArticle: article,
    }));
  };

  const togglePauseAudio = () => {
    if (audioState.isPaused) {
      resumeSpeech();
      setAudioState((prev) => ({ ...prev, isPaused: false }));
    } else {
      pauseSpeech();
      setAudioState((prev) => ({ ...prev, isPaused: true }));
    }
  };

  const changeAudioRate = (newRate) => {
    setAudioState((prev) => ({ ...prev, rate: newRate }));
    if (audioState.isPlaying && audioState.currentArticle) {
      playAudio(audioState.currentArticle);
    }
  };

  const openVideoPlayer = (article) => {
    stopAudio();
    setVideoArticle(article);
  };

  // Category counts
  const counts = useMemo(() => {
    const res = { all: articles.length };
    articles.forEach((a) => {
      res[a.category] = (res[a.category] || 0) + 1;
    });
    return res;
  }, [articles]);

  // Filtered list based on active category & search query
  const filteredArticles = useMemo(() => {
    let list = articles;

    if (activeCategory === 'bookmarks') {
      list = bookmarks;
    } else if (activeCategory !== 'all') {
      list = list.filter((a) => a.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((a) =>
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q)) ||
        (a.prid && a.prid.toString().includes(q))
      );
    }

    return list;
  }, [articles, bookmarks, activeCategory, searchQuery]);

  // Spotlight article
  const spotlightArticle = useMemo(() => {
    if (articles.length > 0 && activeCategory === 'all' && !searchQuery) {
      return articles[0];
    }
    return null;
  }, [articles, activeCategory, searchQuery]);

  const gridArticles = useMemo(() => {
    if (spotlightArticle && activeCategory === 'all' && !searchQuery) {
      return filteredArticles.slice(1);
    }
    return filteredArticles;
  }, [filteredArticles, spotlightArticle, activeCategory, searchQuery]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Animated Splash Screen */}
      {showSplash && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}

      {/* 2. Onboarding Language Selection Gateway */}
      {showLanguageOnboarding && (
        <LanguageSelectionModal
          currentLang={lang}
          onSelectLanguage={(l) => setLang(l)}
          onComplete={handleLanguageOnboardingComplete}
          isModal={true}
        />
      )}

      {/* 3. Regular Language Switcher Modal */}
      {showLanguageModal && (
        <LanguageSelectionModal
          currentLang={lang}
          onSelectLanguage={(l) => setLang(l)}
          onComplete={() => setShowLanguageModal(false)}
          isModal={true}
        />
      )}

      {/* 4. Top Sticky Navigation */}
      <Navbar
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        mode={mode}
        setMode={setMode}
        fontScale={fontScale}
        setFontScale={setFontScale}
        onRefresh={() => fetchNews(true)}
        isRefreshing={isRefreshing}
        bookmarkCount={bookmarks.length}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        user={currentUser}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenLanguageModal={() => setShowLanguageModal(true)}
      />

      {/* Real-time Live PIB Press Release Toast Banner */}
      {realtimeNotification && (
        <div style={{
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
          color: '#ffffff',
          padding: '0.65rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'slideDown 0.3s ease',
          fontSize: '0.88rem',
          zIndex: 90,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, overflow: 'hidden' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <Radio size={12} style={{ animation: 'pulse 1.5s infinite' }} /> LIVE
            </span>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lang === 'hi' ? 'ताज़ा विज्ञप्ति:' : 'New Release:'} {realtimeNotification.title}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <button
              onClick={() => {
                setSelectedArticle(realtimeNotification.article);
                setRealtimeNotification(null);
              }}
              style={{
                background: '#ffffff',
                color: '#1e3c72',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {lang === 'hi' ? 'अभी देखें' : 'View Now'}
            </button>
            <button
              onClick={() => setRealtimeNotification(null)}
              style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex' }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="container" style={{ flex: 1, paddingBottom: '3rem' }}>
        {/* Hero Spotlight Announcement */}
        {spotlightArticle && (
          <HeroBanner
            article={spotlightArticle}
            lang={lang}
            onOpenArticle={(art) => setSelectedArticle(art)}
            onPlayAudio={(art) => playAudio(art)}
            onWatchVideo={(art) => openVideoPlayer(art)}
            onOpenFactSheet={(art) => setFactArticle(art)}
            isPlaying={audioState.isPlaying}
            currentAudioId={audioState.currentArticle?.id}
          />
        )}

        {/* Category Pills Filters */}
        <div style={{ marginTop: spotlightArticle ? '1.5rem' : '1.25rem' }}>
          <CategoryPills
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            counts={counts}
            lang={lang}
            bookmarkCount={bookmarks.length}
          />
        </div>

        {/* Search Bar & Result Status */}
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalResults={filteredArticles.length}
          lang={lang}
        />

        {/* Mode Indicator Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: mode === 'kisan' ? 'var(--gov-green-bg)' : 'var(--gov-navy-light)',
          border: `1px solid ${mode === 'kisan' ? 'var(--gov-green-border)' : 'var(--gov-navy-border)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '0.65rem 1rem',
          margin: '0.75rem 0 1.25rem 0',
          fontSize: '0.85rem',
          color: mode === 'kisan' ? 'var(--gov-green)' : 'var(--gov-navy)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
            {mode === 'kisan' ? <Sprout size={16} /> : <Terminal size={16} />}
            <span>{mode === 'kisan' ? t.kisanModeDesc : t.proModeDesc}</span>
          </div>

          <button
            onClick={() => setMode(mode === 'kisan' ? 'pro' : 'kisan')}
            style={{
              fontWeight: '700',
              textDecoration: 'underline',
              color: 'inherit',
              fontSize: '0.82rem',
            }}
          >
            {mode === 'kisan' ? `👉 ${t.proMode}` : `👉 ${t.kisanMode}`}
          </button>
        </div>

        {/* News Cards Grid or Loading / Empty States */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            <RotateCw size={32} className="spin-icon" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
            <h3>{lang === 'hi' ? 'पीआईबी से ताज़ा विज्ञप्तियां लोड हो रही हैं...' : 'Fetching live press releases from PIB...'}</h3>
          </div>
        ) : gridArticles.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 1.5rem',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginTop: '1.5rem',
          }}>
            <Inbox size={48} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              {activeCategory === 'bookmarks' ? t.noBookmarksTitle : t.noNewsTitle}
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 1.5rem auto', fontSize: '0.92rem' }}>
              {activeCategory === 'bookmarks' ? t.noBookmarksDesc : t.noNewsDesc}
            </p>
            {(activeCategory !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setSearchQuery('');
                }}
                className="btn btn-primary"
              >
                {t.viewAll}
              </button>
            )}
          </div>
        ) : (
          <div className="news-grid">
            {gridArticles.map((article) => {
              const isBookmarked = bookmarks.some((b) => b.id === article.id);
              return (
                <NewsCard
                  key={article.id}
                  article={article}
                  mode={mode}
                  lang={lang}
                  onOpenArticle={(art) => setSelectedArticle(art)}
                  onPlayAudio={(art) => playAudio(art)}
                  onWatchVideo={(art) => openVideoPlayer(art)}
                  onOpenFactSheet={(art) => setFactArticle(art)}
                  isPlaying={audioState.isPlaying}
                  currentAudioId={audioState.currentArticle?.id}
                  isBookmarked={isBookmarked}
                  onToggleBookmark={toggleBookmark}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Article Detail Reading Modal */}
      {selectedArticle && (
        <ArticleModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          lang={lang}
          mode={mode}
          onPlayAudio={(art) => playAudio(art)}
          onWatchVideo={(art) => openVideoPlayer(art)}
          onOpenFactSheet={(art) => setFactArticle(art)}
          isPlaying={audioState.isPlaying}
          currentAudioId={audioState.currentArticle?.id}
          isBookmarked={bookmarks.some((b) => b.id === selectedArticle.id)}
          onToggleBookmark={toggleBookmark}
        />
      )}

      {/* Full-screen AI Video Storyboard Player */}
      {videoArticle && (
        <VideoPlayerModal
          article={videoArticle}
          articles={filteredArticles.length > 0 ? filteredArticles : articles}
          onSelectArticle={(nextArt) => setVideoArticle(nextArt)}
          onClose={() => setVideoArticle(null)}
          lang={lang}
        />
      )}

      {/* Fact Sheet & Grounding Verification Modal */}
      {factArticle && (
        <FactSheetModal
          article={factArticle}
          onClose={() => setFactArticle(null)}
          lang={lang}
        />
      )}

      {/* Floating Audio Player Bar */}
      {audioState.isPlaying && audioState.currentArticle && !videoArticle && (
        <AudioPlayerBar
          currentArticle={audioState.currentArticle}
          isPlaying={audioState.isPlaying}
          isPaused={audioState.isPaused}
          onTogglePause={togglePauseAudio}
          onStop={stopAudio}
          rate={audioState.rate}
          onChangeRate={changeAudioRate}
          lang={lang}
        />
      )}

      {/* Auth Modal (Sign Up / Sign In / Google OAuth) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setShowAuthModal(false);
        }}
      />

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={currentUser}
        onUpdateProfile={(updatedUser) => setCurrentUser(updatedUser)}
        onSignOut={() => setCurrentUser(null)}
        bookmarkCount={bookmarks.length}
      />

      {/* Footer */}
      <Footer lang={lang} mode={mode} />
    </div>
  );
}
