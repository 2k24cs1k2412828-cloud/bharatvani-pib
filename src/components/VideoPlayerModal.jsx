import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Smartphone, 
  Tv, 
  Video, 
  Film,
  ExternalLink,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  Layers,
  Check
} from 'lucide-react';
import { translations } from '../translations';
import { speakFemaleVoice, stopAllSpeech } from '../utils/voiceEngine';
import NewsAnchor3D from './NewsAnchor3D';

// Precise Single-Word Karaoke Subtitles (Accessible & High Contrast)
function PreciseWordCaptions({ text, progress, lang, accentColor = '#2563eb' }) {
  const words = useMemo(() => {
    if (!text) return [];
    return text.trim().split(/\s+/).filter(Boolean);
  }, [text]);

  const activeWordIdx = Math.min(
    Math.floor(progress * words.length),
    Math.max(0, words.length - 1)
  );

  return (
    <div 
      className="captions-container"
      style={{
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '0.65rem 0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        minHeight: '80px',
        maxHeight: '140px',
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.68rem',
        color: '#16a34a',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Volume2 size={13} />
          <span>{lang === 'hi' ? 'लाइव AI समाचार वाचन' : 'LIVE AI VOICE CAPTIONS'}</span>
        </div>
        <span style={{ color: '#64748b', fontWeight: '600' }}>
          {lang === 'hi' ? 'शब्द-दर-शब्द मिलान' : 'Word-by-word sync'}
        </span>
      </div>

      <p style={{
        fontSize: '0.92rem',
        lineHeight: 1.55,
        color: '#0f172a',
        margin: 0,
        fontFamily: lang === 'hi' ? 'var(--font-hindi)' : 'var(--font-sans)',
        wordBreak: 'break-word',
      }}>
        {words.map((word, idx) => {
          const isActive = idx === activeWordIdx;
          const isPassed = idx < activeWordIdx;

          if (isActive) {
            return (
              <span
                key={idx}
                style={{
                  background: '#fef08a', // Lemon yellow high-contrast focus
                  color: '#0f172a',
                  fontWeight: '800',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  display: 'inline-block',
                  margin: '0 2px',
                  transition: 'background 0.1s ease',
                }}
              >
                {word}{' '}
              </span>
            );
          }

          return (
            <span
              key={idx}
              style={{
                color: isPassed ? '#0f172a' : '#64748b',
                fontWeight: isPassed ? '600' : '400',
                margin: '0 1px',
                transition: 'color 0.1s ease',
              }}
            >
              {word}{' '}
            </span>
          );
        })}
      </p>
    </div>
  );
}

export default function VideoPlayerModal({
  article,
  articles = [],
  onSelectArticle,
  onClose,
  lang = 'hi',
}) {
  if (!article) return null;

  const t = translations[lang] || {};
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const videoPollRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Core Playback State
  const [storyboard, setStoryboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRate, setVoiceRate] = useState(1);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [speechProgress, setSpeechProgress] = useState(0);

  // Playback Modes: 'video' | 'slideshow' | 'studio' | 'reels'
  const [playerMode, setPlayerMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'reels' : 'video'));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

  // Video State
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoStatus, setVideoStatus] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);

  // Story Navigation Index
  const storyIndex = useMemo(() => {
    if (!articles || !articles.length) return -1;
    return articles.findIndex((a) => (a.id || a.prid) === (article.id || article.prid));
  }, [articles, article]);

  const hasPrevStory = storyIndex > 0;
  const hasNextStory = storyIndex >= 0 && storyIndex < articles.length - 1;

  // Format Time Helper (MM:SS)
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === null) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Fetch or generate AI storyboard & trigger background news video compilation
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setVideoUrl(null);
    setVideoStatus(null);
    setCurrentSceneIndex(0);
    setSpeechProgress(0);

    const articleId = article.id || article.prid;

    axios.post('/api/ai/storyboard', {
      article,
      lang: lang === 'en' ? 'en' : 'hi',
    })
      .then((res) => {
        if (isMounted && res.data.success) {
          setStoryboard(res.data.data);
          setCurrentSceneIndex(0);
          setIsPlaying(true);

          if (res.data.data.videoUrl) {
            setVideoUrl(res.data.data.videoUrl);
            setVideoStatus({ status: 'completed', progress: 100, message: 'Broadcast Video Ready' });
          } else if (articleId) {
            axios.post('/api/ai/news-video/generate', { 
              article, 
              articleId, 
              storyboard: res.data.data,
              lang: lang === 'en' ? 'en' : 'hi'
            })
              .then((vRes) => {
                if (isMounted && vRes.data?.job) {
                  setVideoStatus(vRes.data.job);
                  if (vRes.data.job.videoUrl) {
                    setVideoUrl(vRes.data.job.videoUrl);
                  }
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch((err) => {
        console.error('Error loading AI storyboard:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      stopAllSpeech();
      if (videoPollRef.current) clearInterval(videoPollRef.current);
    };
  }, [article, lang]);

  // Poll for background AI video generation until ready
  useEffect(() => {
    const articleId = article?.id || article?.prid;
    if (!articleId || videoUrl) return;

    videoPollRef.current = setInterval(() => {
      axios.get(`/api/ai/news-video/status/${articleId}`)
        .then((res) => {
          if (res.data?.success) {
            setVideoStatus(res.data);
            if (res.data.videoUrl) {
              setVideoUrl(res.data.videoUrl);
              clearInterval(videoPollRef.current);
            } else if (res.data.status === 'error') {
              clearInterval(videoPollRef.current);
            }
          }
        })
        .catch(() => {});
    }, 2500);

    return () => {
      if (videoPollRef.current) clearInterval(videoPollRef.current);
    };
  }, [article, videoUrl]);

  const scenes = storyboard?.scenes || [];
  const activeScene = scenes[currentSceneIndex] || {
    headline: article.title || '',
    narration: article.description || article.title || '',
    keyPoints: [],
    visualImage: '',
    accentColor: '#1e40af'
  };

  // Master Playback Sync: ensures video element and state stay 100% in sync
  useEffect(() => {
    if (playerMode === 'video' && videoRef.current) {
      if (isPlaying) {
        if (videoRef.current.paused) {
          videoRef.current.play().catch(() => {});
        }
      } else {
        if (!videoRef.current.paused) {
          videoRef.current.pause();
        }
      }
    }
  }, [isPlaying, playerMode]);

  // Speech synthesis for Slideshow/Studio mode or when videoUrl is pending
  useEffect(() => {
    if (!activeScene || loading) return;

    stopAllSpeech();
    setSpeechProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    // If in Video mode with active MP4, let the MP4 container play its audio
    if (playerMode === 'video' && videoUrl) return;

    if (!isPlaying || isMuted) return;

    const textToSpeak = `${activeScene.headline}. ${activeScene.narration}`;
    const wordCount = textToSpeak.split(/\s+/).length;
    const estSeconds = Math.max((wordCount / (2.6 * voiceRate)), 3.5);
    const startTime = Date.now();

    progressIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const calcProgress = Math.min(elapsed / estSeconds, 0.95);
      setSpeechProgress((prev) => Math.max(prev, calcProgress));
    }, 80);

    speakFemaleVoice({
      text: textToSpeak,
      lang: lang === 'en' ? 'en' : 'hi',
      rate: voiceRate,
      onProgress: (prog) => {
        setSpeechProgress(prog);
      },
      onEnd: () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setSpeechProgress(1);

        const durationElapsed = (Date.now() - startTime) / 1000;
        if (durationElapsed < 1.0) return;

        if (autoAdvance) {
          if (currentSceneIndex < scenes.length - 1) {
            setTimeout(() => {
              setCurrentSceneIndex((prev) => prev + 1);
            }, 750);
          } else {
            // Last scene completed: Check if there is a next story to auto-advance to
            if (hasNextStory && onSelectArticle) {
              setTimeout(() => {
                onSelectArticle(articles[storyIndex + 1]);
              }, 1200);
            } else {
              setIsPlaying(false);
            }
          }
        }
      },
      onError: () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      },
    });

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      stopAllSpeech();
    };
  }, [currentSceneIndex, isPlaying, isMuted, voiceRate, loading, autoAdvance, lang, scenes.length, playerMode, videoUrl, hasNextStory]);

  // Master Unified Play/Pause Action
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Spacebar keyboard listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        togglePlayPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause]);

  // Story Navigation Handlers
  const handleNextStory = () => {
    if (hasNextStory && onSelectArticle) {
      stopAllSpeech();
      onSelectArticle(articles[storyIndex + 1]);
    }
  };

  const handlePrevStory = () => {
    if (hasPrevStory && onSelectArticle) {
      stopAllSpeech();
      onSelectArticle(articles[storyIndex - 1]);
    }
  };

  // Scene/Slide Navigation Handlers
  const handleNextScene = () => {
    if (currentSceneIndex < scenes.length - 1) {
      const nextIdx = currentSceneIndex + 1;
      if (playerMode === 'video' && videoRef.current && videoRef.current.duration) {
        videoRef.current.currentTime = (nextIdx / scenes.length) * videoRef.current.duration;
      }
      stopAllSpeech();
      setCurrentSceneIndex(nextIdx);
      setIsPlaying(true);
    }
  };

  const handlePrevScene = () => {
    if (currentSceneIndex > 0) {
      const prevIdx = currentSceneIndex - 1;
      if (playerMode === 'video' && videoRef.current && videoRef.current.duration) {
        videoRef.current.currentTime = (prevIdx / scenes.length) * videoRef.current.duration;
      }
      stopAllSpeech();
      setCurrentSceneIndex(prevIdx);
      setIsPlaying(true);
    }
  };

  // Replay Story
  const handleReplay = () => {
    if (playerMode === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setCurrentSceneIndex(0);
      setSpeechProgress(0);
      return;
    }
    stopAllSpeech();
    setCurrentSceneIndex(0);
    setIsPlaying(true);
  };

  // Scrubber Progress Bar Seek Handler
  const handleSeek = (e) => {
    const pct = parseFloat(e.target.value);
    if (playerMode === 'video' && videoRef.current && videoDuration > 0) {
      videoRef.current.currentTime = (pct / 100) * videoDuration;
    } else if (scenes.length > 0) {
      const targetScene = Math.min(Math.floor((pct / 100) * scenes.length), scenes.length - 1);
      setCurrentSceneIndex(targetScene);
      setSpeechProgress((pct % (100 / scenes.length)) / (100 / scenes.length));
    }
  };

  // Calculate overall timeline percentage
  const overallProgressPct = useMemo(() => {
    if (playerMode === 'video' && videoDuration > 0) {
      return (videoCurrentTime / videoDuration) * 100;
    }
    if (scenes.length > 0) {
      const sceneFraction = 100 / scenes.length;
      return (currentSceneIndex * sceneFraction) + (speechProgress * sceneFraction);
    }
    return 0;
  }, [playerMode, videoDuration, videoCurrentTime, scenes.length, currentSceneIndex, speechProgress]);

  // Format Publication Date safely
  const formattedDate = useMemo(() => {
    const raw = article.pubDate || article.date;
    if (!raw) return null;
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return null;
    }
  }, [article, lang]);

  return (
    <div
      className="modal-overlay newsroom-modal-backdrop"
      onClick={() => { stopAllSpeech(); onClose(); }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: playerMode === 'reels' ? '0.75rem' : '0',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
      }}
    >
      {/* Main Digital Newsroom Container */}
      <div
        ref={containerRef}
        className="newsroom-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: playerMode === 'reels' ? '460px' : '100vw',
          maxHeight: playerMode === 'reels' ? '92vh' : '100vh',
          height: playerMode === 'reels' ? 'auto' : '100vh',
          background: '#ffffff',
          color: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: playerMode === 'reels' ? '8px' : '0',
          border: playerMode === 'reels' ? '1px solid #e2e8f0' : 'none',
          boxShadow: playerMode === 'reels' ? '0 25px 50px -12px rgba(15, 23, 42, 0.25)' : 'none',
          overflow: 'hidden',
          fontFamily: 'var(--font-sans)',
          transition: 'max-width 0.25s ease',
        }}
      >
        {/* Subtle National Tricolor Header Accent */}
        <div style={{ height: '3px', width: '100%', display: 'flex', flexShrink: 0 }}>
          <div style={{ flex: 1, backgroundColor: '#ea580c' }} />
          <div style={{ flex: 1, backgroundColor: '#ffffff' }} />
          <div style={{ flex: 1, backgroundColor: '#16a34a' }} />
        </div>

        {/* SECTION A: COMPACT PROFESSIONAL HEADER */}
        <header style={{
          padding: '0.45rem 1rem',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.45rem',
          flexShrink: 0,
        }}>
          {/* Left: Brand Identity & Verified Source Attribution */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.15rem' }}>🇮🇳</span>
              <span style={{
                fontWeight: '900',
                fontSize: '0.95rem',
                letterSpacing: '-0.02em',
                color: '#0f172a',
                fontFamily: 'var(--font-heading)',
              }}>
                BHARAT<span style={{ color: '#c8202d' }}>VANI</span>
              </span>
            </div>

            <div style={{
              height: '14px',
              width: '1px',
              backgroundColor: '#cbd5e1',
            }} />

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.74rem',
              fontWeight: '700',
              color: '#16a34a',
            }}>
              <ShieldCheck size={14} color="#16a34a" />
              <span>{lang === 'hi' ? 'आधिकारिक पीआईबी विज्ञप्ति' : 'Official PIB Release'}</span>
            </div>
          </div>

          {/* Right: Mode Switcher (Video | Slideshow | Studio | Reels) & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Mode Switcher Tabs */}
            <div 
              role="tablist"
              aria-label="Playback Mode"
              style={{
                display: 'flex',
                background: '#f1f5f9',
                borderRadius: '6px',
                padding: '2px',
                border: '1px solid #e2e8f0',
              }}
            >
              <button
                role="tab"
                aria-selected={playerMode === 'video'}
                onClick={() => setPlayerMode('video')}
                title="Watch Full News Video"
                style={{
                  background: playerMode === 'video' ? '#0f172a' : 'transparent',
                  color: playerMode === 'video' ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Video size={13} />
                <span>{lang === 'hi' ? 'वीडियो' : 'Video'}</span>
              </button>

              <button
                role="tab"
                aria-selected={playerMode === 'slideshow'}
                onClick={() => setPlayerMode('slideshow')}
                title="Scene-by-scene Slideshow"
                style={{
                  background: playerMode === 'slideshow' ? '#0f172a' : 'transparent',
                  color: playerMode === 'slideshow' ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Film size={13} />
                <span>{lang === 'hi' ? 'स्लाइड' : 'Slides'}</span>
              </button>

              <button
                role="tab"
                aria-selected={playerMode === 'studio'}
                onClick={() => setPlayerMode('studio')}
                title="3D AI News Anchor Studio View"
                style={{
                  background: playerMode === 'studio' ? '#0f172a' : 'transparent',
                  color: playerMode === 'studio' ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Tv size={13} />
                <span>{lang === 'hi' ? 'स्टूडियो' : 'Studio'}</span>
              </button>

              <button
                role="tab"
                aria-selected={playerMode === 'reels'}
                onClick={() => setPlayerMode('reels')}
                title="Mobile Portrait Reel View"
                style={{
                  background: playerMode === 'reels' ? '#0f172a' : 'transparent',
                  color: playerMode === 'reels' ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Smartphone size={13} />
                <span>{lang === 'hi' ? 'रील्स' : 'Reels'}</span>
              </button>
            </div>

            {/* Close Workspace Button */}
            <button
              onClick={() => { stopAllSpeech(); onClose(); }}
              aria-label="Close Newsroom Workspace"
              style={{
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                color: '#475569',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <X size={17} />
            </button>
          </div>
        </header>

        {/* SECTION B: PROMINENT EDITORIAL HEADLINE & METADATA BAR */}
        <div style={{
          padding: '0.4rem 1rem',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}>
          {/* Editorial Headline */}
          <h2 style={{
            margin: 0,
            fontSize: '1rem',
            lineHeight: 1.35,
            fontWeight: '800',
            color: '#0f172a',
            fontFamily: lang === 'hi' ? 'var(--font-hindi)' : 'var(--font-heading)',
          }}>
            {article.title}
          </h2>

          {/* Contextual Metadata Badges */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginTop: '0.25rem',
            fontSize: '0.72rem',
            color: '#64748b',
          }}>
            {/* Ministry Tag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '700', color: '#0f172a' }}>
              <span>🏛️</span>
              <span>{article.ministry || (lang === 'hi' ? 'भारत सरकार' : 'Government of India')}</span>
            </div>

            {/* Source */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span>•</span>
              <span>PIB, Government of India</span>
            </div>

            {/* Formatted Date (Only if present in source data) */}
            {formattedDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>•</span>
                <span>{formattedDate}</span>
              </div>
            )}

            {/* Language Pill */}
            <div style={{
              background: '#e2e8f0',
              color: '#334155',
              padding: '1px 6px',
              borderRadius: '3px',
              fontWeight: '700',
              fontSize: '0.68rem',
            }}>
              {lang === 'hi' ? 'हिन्दी (IN)' : 'English (IN)'}
            </div>

            {/* Official PIB Web Link (Verified Source Transparency) */}
            {article.link && (
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                title="View original press release on official PIB portal"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontWeight: '700',
                  marginLeft: 'auto',
                }}
              >
                <span>{lang === 'hi' ? 'मूल पीआईबी विज्ञप्ति' : 'Original PIB Release'}</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        {/* SECTION C & D: MAIN MEDIA WORKSPACE & STORY INFORMATION */}
        <div 
          className="newsroom-workspace-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.65rem 1rem',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            minHeight: 0,
          }}
        >
          {/* Main 2-Column Desktop Grid (~56% Content / ~44% Presenter) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: playerMode === 'reels' ? '1fr' : 'minmax(0, 1.27fr) minmax(0, 1fr)',
            gap: '0.75rem',
            alignItems: 'stretch',
            minHeight: 0,
            minWidth: 0,
          }}>
            {/* LEFT COLUMN: News Video / Slideshow Display */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              background: '#0f172a',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid #1e293b',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              minHeight: 0,
              minWidth: 0,
            }}>
              {/* Media Player Screen (16:9 Aspect Ratio) */}
              <div style={{
                position: 'relative',
                width: '100%',
                maxHeight: playerMode === 'reels' ? '65vh' : 'min(42vh, 340px)',
                minHeight: playerMode === 'reels' ? '280px' : '180px',
                aspectRatio: playerMode === 'reels' ? '9/14' : '16/9',
                background: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                {playerMode === 'video' && videoUrl ? (
                  <video
                    ref={videoRef}
                    key={videoUrl}
                    src={videoUrl}
                    autoPlay
                    controls={false}
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => {
                      setIsPlaying(false);
                      setSpeechProgress(1);
                      if (autoAdvance) {
                        if (hasNextStory && onSelectArticle) {
                          setTimeout(() => {
                            onSelectArticle(articles[storyIndex + 1]);
                          }, 1500);
                        }
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      setVideoDuration(e.currentTarget.duration || 0);
                    }}
                    onTimeUpdate={(e) => {
                      const v = e.currentTarget;
                      setVideoCurrentTime(v.currentTime || 0);
                      if (v.duration && v.duration > 0) {
                        const totalRatio = Math.min(Math.max(v.currentTime / v.duration, 0), 1);
                        if (scenes.length > 0) {
                          const sceneFraction = 1 / scenes.length;
                          const currentIdx = Math.min(Math.floor(totalRatio / sceneFraction), scenes.length - 1);
                          if (currentIdx !== currentSceneIndex) {
                            setCurrentSceneIndex(currentIdx);
                          }
                          const intraSceneProgress = (totalRatio % sceneFraction) / sceneFraction;
                          setSpeechProgress(intraSceneProgress);
                        }
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      backgroundColor: '#000000',
                      cursor: 'pointer',
                    }}
                    onClick={togglePlayPause}
                  />
                ) : (
                  /* Slideshow Visual Display with Full Uncropped Visibility */
                  <div
                    key={activeScene.sceneIndex + (activeScene.visualImage || '')}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundImage: `url(${activeScene.visualImage || ''})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      backgroundColor: '#0a0f1d',
                      cursor: 'pointer',
                    }}
                    onClick={togglePlayPause}
                  />
                )}

                {/* Floating Big Play Button Overlay When Paused */}
                {!isPlaying && (
                  <button
                    onClick={togglePlayPause}
                    aria-label="Resume Playback"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '58px',
                      height: '58px',
                      borderRadius: '50%',
                      background: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: '2px solid rgba(255, 255, 255, 0.9)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
                      zIndex: 25,
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <Play size={26} style={{ marginLeft: '3px' }} />
                  </button>
                )}

                {/* Top Overlay Badge */}
                <div style={{
                  position: 'absolute',
                  top: '0.65rem',
                  left: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(4px)',
                  color: '#ffffff',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  zIndex: 10,
                }}>
                  {playerMode === 'video' && videoUrl ? (
                    <>
                      <div className="live-pulse" style={{ width: '6px', height: '6px', backgroundColor: '#16a34a' }} />
                      <span>{lang === 'hi' ? 'एचडी समाचार वीडियो (MP4)' : 'HD NEWS BROADCAST (MP4)'}</span>
                    </>
                  ) : (
                    <>
                      <Film size={12} color="#facc15" />
                      <span>{lang === 'hi' ? `दृश्य ${currentSceneIndex + 1} / ${scenes.length}` : `Slide ${currentSceneIndex + 1} of ${scenes.length}`}</span>
                    </>
                  )}
                </div>

                {/* Background Video Compilation Progress Banner */}
                {playerMode === 'video' && !videoUrl && videoStatus && (
                  <div style={{
                    position: 'absolute',
                    bottom: '0.75rem',
                    right: '0.75rem',
                    background: 'rgba(15, 23, 42, 0.92)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    color: '#ffffff',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    zIndex: 10,
                  }}>
                    <div className="live-pulse" style={{ width: '6px', height: '6px', backgroundColor: '#38bdf8' }} />
                    <span>{videoStatus.message || `Compiling Video (${Math.round(videoStatus.progress || 10)}%)...`}</span>
                  </div>
                )}
              </div>

              {/* Precise Single-Word Subtitle Bar Below Video/Slide */}
              <PreciseWordCaptions
                text={activeScene.narration}
                progress={speechProgress}
                lang={lang}
                accentColor={activeScene.accentColor}
              />
            </div>

            {/* RIGHT COLUMN: AI News Presenter & Narration Panel */}
            <div style={{
              display: playerMode === 'reels' ? 'none' : 'flex',
              flexDirection: 'column',
              background: '#172033', // Secondary navy
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid #1e293b',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              minHeight: 0,
              minWidth: 0,
            }}>
              {/* Presenter Header */}
              <div style={{
                padding: '0.45rem 0.75rem',
                background: '#0f172a',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.74rem',
                  fontWeight: '800',
                  color: '#ffffff',
                }}>
                  <Tv size={13} color="#38bdf8" />
                  <span>{lang === 'hi' ? '3D AI समाचार एंकर' : '3D AI News Presenter'}</span>
                </div>

                {/* Narration Status Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.66rem',
                  fontWeight: '700',
                  padding: '2px 6px',
                  borderRadius: '999px',
                  background: isPlaying ? 'rgba(22, 163, 74, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                  color: isPlaying ? '#4ade80' : '#94a3b8',
                  border: isPlaying ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(148, 163, 184, 0.2)',
                }}>
                  {isPlaying ? (
                    <>
                      <div className="live-pulse" style={{ width: '5px', height: '5px', backgroundColor: '#4ade80' }} />
                      <span>{lang === 'hi' ? 'वाचन सक्रिय' : 'Speaking'}</span>
                    </>
                  ) : (
                    <span>{lang === 'hi' ? 'विराम (Paused)' : 'Paused'}</span>
                  )}
                </div>
              </div>

              {/* 3D Canvas Avatar Presentation Screen */}
              <div style={{
                position: 'relative',
                flex: 1,
                minHeight: '220px',
                maxHeight: playerMode === 'reels' ? '0px' : 'min(56vh, 480px)',
                background: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <NewsAnchor3D
                  isPlaying={isPlaying && !isMuted}
                  lang={lang}
                />

                {/* Synthetic Media Disclaimer Badge */}
                <div style={{
                  position: 'absolute',
                  bottom: '0.5rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(4px)',
                  color: '#cbd5e1',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '0.65rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                  {lang === 'hi' ? '🤖 एआई जनरेटेड प्रस्तुति' : '🤖 AI-Generated Presenter (PIB Grounded)'}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION D: STRUCTURED STORY INFORMATION & KEY POINTS */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
          }}>
            {/* Headline of Active Scene */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                fontSize: '0.92rem',
                fontWeight: '800',
                color: '#0f172a',
                fontFamily: lang === 'hi' ? 'var(--font-hindi)' : 'var(--font-heading)',
              }}>
                {activeScene.headline}
              </div>

              {scenes.length > 1 && (
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>
                  {lang === 'hi' ? `भाग ${currentSceneIndex + 1} / ${scenes.length}` : `Scene ${currentSceneIndex + 1} of ${scenes.length}`}
                </span>
              )}
            </div>

            {/* Key-Points Cards Grid */}
            {activeScene.keyPoints && activeScene.keyPoints.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.5rem',
              }}>
                {activeScene.keyPoints.map((kp, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      padding: '0.45rem 0.65rem',
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      color: '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <CheckCircle2 size={13} color="#16a34a" />
                    <span>{kp}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Expandable Full Story Transcript Toggle */}
            <div>
              <button
                onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <span>{isTranscriptExpanded ? (lang === 'hi' ? '▼ पूर्ण विवरण समेटें' : '▼ Hide Full Story') : (lang === 'hi' ? '▶ पूर्ण विवरण देखें' : '▶ Read Full Story Transcript')}</span>
              </button>

              {isTranscriptExpanded && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  background: '#ffffff',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.86rem',
                  lineHeight: 1.6,
                  color: '#334155',
                }}>
                  {article.description || article.title}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION E: UNIFIED MASTER PLAYBACK CONTROL BAR */}
        <footer style={{
          padding: '0.65rem 1.15rem',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          flexShrink: 0,
        }}>
          {/* 1. Seekable Scrubber Timeline Bar with Timestamps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#475569', minWidth: '32px' }}>
              {formatTime(playerMode === 'video' && videoDuration > 0 ? videoCurrentTime : (overallProgressPct / 100) * 45)}
            </span>

            {/* Interactive Progress Bar */}
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={overallProgressPct || 0}
              onChange={handleSeek}
              aria-label="Seek Video Timeline"
              style={{
                flex: 1,
                height: '5px',
                accentColor: '#0f172a',
                cursor: 'pointer',
              }}
            />

            <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', minWidth: '32px', textAlign: 'right' }}>
              {formatTime(playerMode === 'video' && videoDuration > 0 ? videoDuration : 45)}
            </span>
          </div>

          {/* 2. Main Playback Control Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            {/* Left Controls: Story & Scene Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {/* Previous Story */}
              <button
                onClick={handlePrevStory}
                disabled={!hasPrevStory}
                aria-label="Previous News Story"
                title={hasPrevStory ? (articles[storyIndex - 1]?.title || 'Previous Story') : 'No previous story'}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: hasPrevStory ? '#0f172a' : '#cbd5e1',
                  borderRadius: '4px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  cursor: hasPrevStory ? 'pointer' : 'not-allowed',
                }}
              >
                <SkipBack size={13} />
                <span>{lang === 'hi' ? 'पिछली खबर' : 'Prev Story'}</span>
              </button>

              {/* Prev Slide / Scene */}
              <button
                onClick={handlePrevScene}
                disabled={currentSceneIndex === 0}
                aria-label="Previous Slide"
                title="Previous Scene"
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: currentSceneIndex > 0 ? '#0f172a' : '#cbd5e1',
                  borderRadius: '4px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  cursor: currentSceneIndex > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                <ChevronLeft size={14} />
                <span>{lang === 'hi' ? 'पिछला दृश्य' : 'Prev Slide'}</span>
              </button>

              {/* Master Play / Pause Button */}
              <button
                onClick={togglePlayPause}
                aria-label={isPlaying ? 'Pause Playback' : 'Start Playback'}
                title={isPlaying ? 'Pause' : 'Play'}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  transition: 'transform 0.1s ease',
                }}
              >
                {isPlaying ? <Pause size={17} /> : <Play size={17} style={{ marginLeft: '2px' }} />}
              </button>

              {/* Next Slide / Scene */}
              <button
                onClick={handleNextScene}
                disabled={currentSceneIndex === scenes.length - 1}
                aria-label="Next Slide"
                title="Next Scene"
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: currentSceneIndex < scenes.length - 1 ? '#0f172a' : '#cbd5e1',
                  borderRadius: '4px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  cursor: currentSceneIndex < scenes.length - 1 ? 'pointer' : 'not-allowed',
                }}
              >
                <span>{lang === 'hi' ? 'अगला दृश्य' : 'Next Slide'}</span>
                <ChevronRight size={14} />
              </button>

              {/* Next Story */}
              <button
                onClick={handleNextStory}
                disabled={!hasNextStory}
                aria-label="Next News Story"
                title={hasNextStory ? (articles[storyIndex + 1]?.title || 'Next Story') : 'No next story'}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: hasNextStory ? '#0f172a' : '#cbd5e1',
                  borderRadius: '4px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  cursor: hasNextStory ? 'pointer' : 'not-allowed',
                }}
              >
                <span>{lang === 'hi' ? 'अगली खबर' : 'Next Story'}</span>
                <SkipForward size={13} />
              </button>
            </div>

            {/* Right Controls: Audio, Speed, Auto-Next & Fullscreen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {/* Replay */}
              <button
                onClick={handleReplay}
                aria-label="Replay Story"
                title="Replay from start"
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '4px',
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={13} />
                <span>{lang === 'hi' ? 'पुनः' : 'Replay'}</span>
              </button>

              {/* Mute Toggle */}
              <button
                onClick={() => {
                  if (!isMuted) stopAllSpeech();
                  setIsMuted(!isMuted);
                }}
                aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                title={isMuted ? 'Unmute' : 'Mute'}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: isMuted ? '#ef4444' : '#16a34a',
                  borderRadius: '4px',
                  padding: '0.35rem 0.6rem',
                  cursor: 'pointer',
                }}
              >
                {isMuted ? <VolumeX size={14} color="#ef4444" /> : <Volume2 size={14} color="#16a34a" />}
              </button>

              {/* Voice Speed */}
              <button
                onClick={() => {
                  const next = voiceRate === 1 ? 1.2 : (voiceRate === 1.2 ? 0.85 : 1);
                  setVoiceRate(next);
                }}
                aria-label="Playback Speed"
                title="Playback Speed"
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  borderRadius: '4px',
                  padding: '0.35rem 0.55rem',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {voiceRate === 0.85 ? '0.85x' : `${voiceRate}x`}
              </button>

              {/* Auto Advance Toggle */}
              <button
                onClick={() => setAutoAdvance(!autoAdvance)}
                aria-label="Toggle Auto Advance"
                title="Automatically advance to next scene and story"
                style={{
                  background: autoAdvance ? '#f0fdf4' : '#f8fafc',
                  border: autoAdvance ? '1px solid #86efac' : '1px solid #cbd5e1',
                  color: autoAdvance ? '#15803d' : '#64748b',
                  borderRadius: '4px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {lang === 'hi' ? `स्वतः: ${autoAdvance ? 'चालू' : 'बंद'}` : `Auto: ${autoAdvance ? 'ON' : 'OFF'}`}
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '4px',
                  padding: '0.35rem 0.55rem',
                  cursor: 'pointer',
                }}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
