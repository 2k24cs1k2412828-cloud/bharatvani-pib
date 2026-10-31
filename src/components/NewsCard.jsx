import React from 'react';
import { 
  Volume2, 
  Bookmark, 
  ChevronRight, 
  Calendar, 
  Building2, 
  Share2, 
  Film,
  CheckCircle2,
  Check
} from 'lucide-react';
import { translations } from '../translations';
import { THEME_VISUALS, resolveContextualVisuals } from '../../server/geminiService';

export default function NewsCard({
  article,
  mode = 'kisan',
  lang = 'hi',
  onOpenArticle,
  onPlayAudio,
  onWatchVideo,
  onOpenFactSheet,
  isBookmarked = false,
  onToggleBookmark,
  isPlaying = false,
  currentAudioId,
}) {
  const t = translations[lang];
  const isThisAudioPlaying = isPlaying && currentAudioId === article.id;
  const isKisan = mode === 'kisan';

  // Get themed editorial thumbnail matched to exact context
  const visuals = resolveContextualVisuals ? resolveContextualVisuals(article) : (THEME_VISUALS[article.category] || THEME_VISUALS.governance);
  const cardImage = visuals[0];

  const handleShare = (e) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.description,
        url: article.link || window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(article.link || window.location.href);
      alert(t.copied);
    }
  };

  return (
    <article className="card">
      {/* 16:9 Photography Header */}
      <div
        onClick={() => onOpenArticle(article)}
        style={{
          position: 'relative',
          height: '180px',
          backgroundImage: `url(${cardImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          cursor: 'pointer',
        }}
      >
        {/* Category Tag */}
        <div style={{
          position: 'absolute',
          top: '0.75rem',
          left: '0.75rem',
        }}>
          <span className="badge">
            {t.categories[article.category] || article.category}
          </span>
        </div>

        {/* Bookmark button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(article);
          }}
          title={isBookmarked ? t.bookmarked : t.bookmark}
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            background: 'rgba(15, 23, 42, 0.75)',
            color: isBookmarked ? '#f59e0b' : '#ffffff',
            padding: '0.35rem',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <Bookmark size={14} fill={isBookmarked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Card Content Body */}
      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          {/* Metadata Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            marginBottom: '0.65rem',
            flexWrap: 'wrap',
            gap: '0.4rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Building2 size={13} />
              <span>{article.ministry || (lang === 'hi' ? 'भारत सरकार' : 'Govt of India')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={13} />
              <span>{article.pubDate ? new Date(article.pubDate).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', { day: 'numeric', month: 'short' }) : ''}</span>
            </div>
          </div>

          {/* Headline */}
          <h3
            onClick={() => onOpenArticle(article)}
            style={{
              fontSize: isKisan ? '1.15rem' : '1.05rem',
              fontWeight: '700',
              lineHeight: 1.4,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              marginBottom: '0.75rem',
            }}
          >
            {article.title}
          </h3>

          {/* Description */}
          <p style={{
            fontSize: isKisan ? '0.92rem' : '0.88rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            marginBottom: '1rem',
            display: '-webkit-box',
            WebkitLineClamp: isKisan ? 3 : 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {article.description}
          </p>

          {/* Kisan Easy Read Highlights Box */}
          {isKisan && (
            <div className="editorial-callout" style={{ marginBottom: '1rem' }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                marginBottom: '0.3rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}>
                <CheckCircle2 size={13} />
                <span>{t.quickSummary}</span>
              </div>
              <p style={{
                fontSize: '0.86rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.45,
                margin: 0,
              }}>
                {article.description || article.title}
              </p>
            </div>
          )}
        </div>

        {/* Action Toolbar (Clean Unified Professional Buttons) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '0.85rem',
          marginTop: '0.5rem',
          flexWrap: 'wrap',
          gap: '0.4rem',
        }}>
          {/* Left Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              onClick={() => onWatchVideo(article)}
              className="btn btn-primary"
              title={t.watchVideo}
            >
              <Film size={13} />
              <span>{lang === 'hi' ? 'वीडियो' : 'Video'}</span>
            </button>

            <button
              onClick={() => onPlayAudio(article)}
              className={`btn ${isThisAudioPlaying ? 'btn-playing' : 'btn-secondary'}`}
              title={t.listenAudio}
            >
              <Volume2 size={13} />
              <span>{isThisAudioPlaying ? t.playing : (lang === 'hi' ? 'सुनें' : 'Audio')}</span>
            </button>

            <button
              onClick={() => onOpenFactSheet(article)}
              className="btn btn-secondary"
              title={t.factCheckBtn}
            >
              <Check size={13} />
              <span>{lang === 'hi' ? 'तथ्य' : 'Facts'}</span>
            </button>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              onClick={handleShare}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.55rem' }}
              title={t.share}
            >
              <Share2 size={13} />
            </button>

            <button
              onClick={() => onOpenArticle(article)}
              className="btn btn-secondary"
            >
              <span>{t.readMore}</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
