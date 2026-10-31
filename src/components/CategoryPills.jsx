import React from 'react';
import { 
  Layers, 
  Sprout, 
  Cpu, 
  TrendingUp, 
  HeartPulse, 
  TreePine, 
  Landmark,
  Bookmark
} from 'lucide-react';
import { translations } from '../translations';

const CATEGORIES_CONFIG = [
  { key: 'all', icon: Layers },
  { key: 'agriculture', icon: Sprout },
  { key: 'technology', icon: Cpu },
  { key: 'economy', icon: TrendingUp },
  { key: 'health', icon: HeartPulse },
  { key: 'environment', icon: TreePine },
  { key: 'governance', icon: Landmark },
];

export default function CategoryPills({
  activeCategory,
  setActiveCategory,
  counts = {},
  lang,
  bookmarkCount = 0,
}) {
  const t = translations[lang];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      padding: '0.25rem 0 0.5rem 0',
      borderBottom: '1px solid var(--border-color)',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }}>
      {CATEGORIES_CONFIG.map((cat) => {
        const IconComponent = cat.icon;
        const isActive = activeCategory === cat.key;
        const count = counts[cat.key] || 0;

        return (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 0.95rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.86rem',
              fontWeight: isActive ? '700' : '600',
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              background: isActive ? 'var(--gov-navy)' : 'transparent',
              border: `1px solid ${isActive ? 'var(--gov-navy)' : 'transparent'}`,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all var(--transition-fast)',
            }}
          >
            <IconComponent size={14} />
            <span>{t.categories[cat.key]}</span>
            {count > 0 && (
              <span style={{
                fontSize: '0.72rem',
                padding: '0.1rem 0.4rem',
                borderRadius: 'var(--radius-sm)',
                background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-subtle)',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                fontWeight: '700',
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}

      {/* Saved Bookmarks Tab */}
      <button
        onClick={() => setActiveCategory('bookmarks')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.55rem 0.95rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.86rem',
          fontWeight: activeCategory === 'bookmarks' ? '700' : '600',
          color: activeCategory === 'bookmarks' ? '#ffffff' : 'var(--text-secondary)',
          background: activeCategory === 'bookmarks' ? 'var(--gov-navy)' : 'transparent',
          border: `1px solid ${activeCategory === 'bookmarks' ? 'var(--gov-navy)' : 'transparent'}`,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          transition: 'all var(--transition-fast)',
        }}
      >
        <Bookmark size={14} fill={bookmarkCount > 0 ? "currentColor" : "none"} />
        <span>{t.categories.bookmarks}</span>
        {bookmarkCount > 0 && (
          <span style={{
            fontSize: '0.72rem',
            padding: '0.1rem 0.4rem',
            borderRadius: 'var(--radius-sm)',
            background: activeCategory === 'bookmarks' ? 'rgba(255,255,255,0.2)' : 'var(--bg-subtle)',
            color: activeCategory === 'bookmarks' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: '700',
          }}>
            {bookmarkCount}
          </span>
        )}
      </button>
    </div>
  );
}
