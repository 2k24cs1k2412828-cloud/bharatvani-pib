import React from 'react';
import { 
  Globe, 
  RotateCw, 
  Sun, 
  Moon, 
  Sprout, 
  ZoomIn, 
  Bookmark, 
  FileText, 
  LogIn
} from 'lucide-react';
import { translations } from '../translations';

export default function Navbar({
  lang,
  setLang,
  theme,
  setTheme,
  mode,
  setMode,
  fontScale,
  setFontScale,
  onRefresh,
  isRefreshing,
  bookmarkCount,
  activeCategory,
  setActiveCategory,
  user,
  onOpenAuth,
  onOpenProfile,
  onOpenLanguageModal,
}) {
  const t = translations[lang];

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('warm');
    else setTheme('light');
  };

  const cycleFont = () => {
    if (fontScale <= 0.95) setFontScale(1);
    else if (fontScale <= 1.05) setFontScale(1.15);
    else setFontScale(0.9);
  };

  const userMeta = user?.user_metadata || {};
  const avatarUrl = userMeta.avatar_url || userMeta.picture;
  const displayName = userMeta.full_name || userMeta.name || user?.email?.split('@')[0];

  return (
    <header className="header-masthead">
      {/* Top National Ribbon */}
      <div className="tricolor-ribbon">
        <div className="tricolor-saffron" />
        <div className="tricolor-white" />
        <div className="tricolor-green" />
      </div>

      {/* Main Masthead Bar */}
      <div className="container" style={{ padding: '0.65rem 1.25rem' }}>
        <div className="navbar-main-wrap">
          
          {/* Official Emblem & Portal Title */}
          <div className="navbar-header-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--gov-navy)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '1.15rem',
                flexShrink: 0,
              }}>
                🇮🇳
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <h1 style={{
                    fontSize: '1.2rem',
                    fontWeight: '800',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.01em',
                    margin: 0,
                  }}>
                    {t.appTitle}
                  </h1>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    color: 'var(--gov-navy)',
                    background: 'var(--gov-navy-light)',
                    border: '1px solid var(--gov-navy-border)',
                    padding: '0.12rem 0.4rem',
                    borderRadius: 'var(--radius-sm)',
                    textTransform: 'uppercase',
                  }}>
                    PIB GOI
                  </span>
                </div>
                <p style={{
                  fontSize: '0.76rem',
                  color: 'var(--text-muted)',
                  margin: 0,
                  fontWeight: '500',
                }}>
                  {t.appSubtitle}
                </p>
              </div>
            </div>

            {/* Mobile-only Top Profile Button */}
            <div className="navbar-mobile-user">
              {user ? (
                <button
                  onClick={onOpenProfile}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '999px',
                    padding: '2px 8px 2px 2px',
                    cursor: 'pointer',
                  }}
                  title="Profile & Settings"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'var(--gov-navy)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                      }}
                    >
                      {displayName?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-primary)', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName?.split(' ')[0] || 'Citizen'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    color: 'var(--gov-navy)',
                    borderColor: 'var(--border-dark)',
                    background: 'var(--gov-navy-light)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <LogIn size={12} />
                  <span>लॉग इन</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Controls Row */}
          <div className="navbar-actions-row">
            
            {/* Multilingual Selector */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
              gap: '2px',
              flexShrink: 0,
            }}>
              <Globe
                size={13}
                onClick={onOpenLanguageModal}
                style={{ color: 'var(--gov-navy)', margin: '0 2px 0 5px', flexShrink: 0, cursor: 'pointer' }}
                title="Change Language"
              />
              {[
                { code: 'hi', label: 'हिन्दी' },
                { code: 'en', label: 'English' },
                { code: 'ta', label: 'தமிழ்' },
                { code: 'te', label: 'తెలుగు' },
                { code: 'gu', label: 'ગુજરાતી' },
              ].map((item) => (
                <button
                  key={item.code}
                  onClick={() => setLang(item.code)}
                  style={{
                    padding: '0.28rem 0.45rem',
                    fontSize: '0.76rem',
                    fontWeight: lang === item.code ? '700' : '500',
                    color: lang === item.code ? '#ffffff' : 'var(--text-secondary)',
                    background: lang === item.code ? 'var(--gov-navy)' : 'transparent',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all var(--transition-fast)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Reading Mode Switcher (Kisan / Pro) */}
            <div style={{
              display: 'inline-flex',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
              flexShrink: 0,
            }}>
              <button
                onClick={() => setMode('kisan')}
                title={t.kisanModeDesc}
                style={{
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: mode === 'kisan' ? '700' : '500',
                  color: mode === 'kisan' ? '#ffffff' : 'var(--text-secondary)',
                  background: mode === 'kisan' ? 'var(--gov-navy)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  whiteSpace: 'nowrap',
                }}
              >
                <Sprout size={13} />
                <span>{t.kisanModeShort}</span>
              </button>

              <button
                onClick={() => setMode('pro')}
                title={t.proModeDesc}
                style={{
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: mode === 'pro' ? '700' : '500',
                  color: mode === 'pro' ? '#ffffff' : 'var(--text-secondary)',
                  background: mode === 'pro' ? 'var(--gov-navy)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  whiteSpace: 'nowrap',
                }}
              >
                <FileText size={13} />
                <span>{t.proModeShort}</span>
              </button>
            </div>

            {/* Zoom / Font Size Adjuster */}
            <button
              onClick={cycleFont}
              className="btn btn-secondary"
              title={`Zoom / Text Size: ${fontScale <= 0.95 ? 'Zoomed Out (90%)' : fontScale <= 1.05 ? 'Normal (100%)' : 'Zoomed In (115%)'}`}
              style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem', flexShrink: 0 }}
            >
              <ZoomIn size={13} />
              <span>{fontScale <= 0.95 ? 'A−' : fontScale > 1.05 ? 'A+' : 'A'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={cycleTheme}
              className="btn btn-secondary"
              title="Theme"
              style={{ padding: '0.3rem 0.55rem', flexShrink: 0 }}
            >
              {theme === 'light' && <Sun size={13} color="#d97706" />}
              {theme === 'dark' && <Moon size={13} color="#38bdf8" />}
              {theme === 'warm' && <Sprout size={13} color="#16a34a" />}
            </button>

            {/* Saved Bookmarks */}
            <button
              onClick={() => setActiveCategory(activeCategory === 'bookmarks' ? 'all' : 'bookmarks')}
              className="btn btn-secondary"
              title={t.categories.bookmarks}
              style={{
                padding: '0.3rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: activeCategory === 'bookmarks' ? '700' : '500',
                background: activeCategory === 'bookmarks' ? 'var(--gov-navy-light)' : 'transparent',
                borderColor: activeCategory === 'bookmarks' ? 'var(--gov-navy-border)' : 'var(--border-color)',
                color: activeCategory === 'bookmarks' ? 'var(--gov-navy)' : 'inherit',
                flexShrink: 0,
              }}
            >
              <Bookmark size={13} fill={bookmarkCount > 0 ? "currentColor" : "none"} />
              <span>{bookmarkCount}</span>
            </button>

            {/* Desktop User Profile Avatar / Sign In Button */}
            <div className="navbar-desktop-user">
              {user ? (
                <button
                  onClick={onOpenProfile}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '999px',
                    padding: '2px 8px 2px 3px',
                    cursor: 'pointer',
                  }}
                  title="Profile & Settings"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'var(--gov-navy)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.76rem',
                        fontWeight: '700',
                      }}
                    >
                      {displayName?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName?.split(' ')[0] || 'Citizen'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    color: 'var(--gov-navy)',
                    borderColor: 'var(--border-dark)',
                    background: 'var(--gov-navy-light)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <LogIn size={13} />
                  <span>लॉग इन / Sign In</span>
                </button>
              )}
            </div>

            {/* Live Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="btn btn-primary"
              title={t.refresh}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', flexShrink: 0 }}
            >
              <RotateCw size={13} className={isRefreshing ? 'pulse-audio' : ''} />
              <span>{isRefreshing ? t.refreshing : t.refresh}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
