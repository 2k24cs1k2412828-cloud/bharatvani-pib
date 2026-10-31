import React from 'react';
import { Volume2, ChevronRight, Building2, ShieldCheck, Film, Check } from 'lucide-react';
import { translations } from '../translations';
import { THEME_VISUALS, resolveContextualVisuals } from '../../server/geminiService';

export default function HeroBanner({
  article,
  lang,
  onOpenArticle,
  onPlayAudio,
  onWatchVideo,
  onOpenFactSheet,
  isPlaying,
  currentAudioId,
}) {
  if (!article) return null;

  const t = translations[lang];
  const isThisAudioPlaying = isPlaying && currentAudioId === article.id;
  const visuals = resolveContextualVisuals ? resolveContextualVisuals(article) : (THEME_VISUALS[article.category] || THEME_VISUALS.governance);
  const heroImage = visuals[0];

  return (
    <section className="hero-banner-container">
      {/* Left Editorial Content Column */}
      <div style={{
        padding: '1.35rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        <div>
          {/* Masthead Tag & Ministry */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{
              background: '#dc2626',
              color: '#ffffff',
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {t.breakingNews}
            </span>

            <span className="badge">
              {t.categories[article.category] || article.category}
            </span>

            <span style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}>
              <Building2 size={13} />
              <span>{article.ministry || (lang === 'hi' ? 'भारत सरकार' : 'Govt of India')}</span>
            </span>
          </div>

          {/* Headline */}
          <h2
            onClick={() => onOpenArticle(article)}
            style={{
              fontSize: '1.45rem',
              fontWeight: '800',
              lineHeight: 1.3,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              marginBottom: '0.75rem',
              letterSpacing: '-0.02em',
            }}
          >
            {article.title}
          </h2>

          {/* Description / Lead Paragraph */}
          <p style={{
            fontSize: '0.98rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '1.5rem',
          }}>
            {article.description || (lang === 'hi' ? 'प्रेस सूचना ब्यूरो द्वारा जारी आधिकारिक प्रेस विज्ञप्ति एवं मुख्य विवरण।' : 'Official press release and operational updates released by the Press Information Bureau.')}
          </p>
        </div>

        {/* Action Controls (Unified Professional Buttons) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1.25rem',
        }}>
          {/* Watch Video Storyboard */}
          <button
            onClick={() => onWatchVideo(article)}
            className="btn btn-primary"
            style={{ padding: '0.55rem 1.1rem' }}
          >
            <Film size={15} />
            <span>{t.watchVideo}</span>
          </button>

          {/* Listen Audio */}
          <button
            onClick={() => onPlayAudio(article)}
            className={`btn ${isThisAudioPlaying ? 'btn-playing' : 'btn-secondary'}`}
            style={{ padding: '0.55rem 1.1rem' }}
          >
            <Volume2 size={15} />
            <span>{isThisAudioPlaying ? t.playing : t.listenAudio}</span>
          </button>

          {/* Fact Check Data Sheet */}
          <button
            onClick={() => onOpenFactSheet(article)}
            className="btn btn-secondary"
            style={{ padding: '0.55rem 1.1rem' }}
          >
            <Check size={15} />
            <span>{t.factCheckBtn}</span>
          </button>

          {/* Read Article Drawer */}
          <button
            onClick={() => onOpenArticle(article)}
            className="btn btn-secondary"
            style={{ padding: '0.55rem 1.1rem' }}
          >
            <span>{t.readMore}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Right Editorial Photography Banner */}
      <div
        className="hero-banner-image"
        style={{
          position: 'relative',
          minHeight: '280px',
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderLeft: '1px solid var(--border-color)',
        }}
      >
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '1rem',
          background: 'rgba(15, 23, 42, 0.85)',
          color: '#ffffff',
          padding: '0.3rem 0.65rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}>
          <ShieldCheck size={13} color="#22c55e" />
          <span>{t.officialSource}</span>
        </div>
      </div>
    </section>
  );
}
