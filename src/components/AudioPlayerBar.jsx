import React from 'react';
import { Volume2, Pause, Play, Square, X } from 'lucide-react';
import { translations } from '../translations';

export default function AudioPlayerBar({
  currentArticle,
  isPlaying,
  isPaused,
  onTogglePause,
  onStop,
  rate,
  onChangeRate,
  lang,
}) {
  if (!currentArticle) return null;

  const t = translations[lang];

  return (
    <div className="audio-bar-sticky">
      {/* Playing Status & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden', flex: 1, minWidth: 0 }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-sm)',
          background: '#15803d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          flexShrink: 0,
        }}>
          <Volume2 size={16} />
        </div>

        <div style={{ overflow: 'hidden', minWidth: 0 }}>
          <div style={{
            fontSize: '0.68rem',
            fontWeight: '700',
            color: '#4ade80',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}>
            <span className="live-pulse" style={{ backgroundColor: '#22c55e', width: '5px', height: '5px' }}></span>
            <span>{isPaused ? t.pauseAudio : t.audioPlayerTitle}</span>
          </div>
          <div style={{
            fontSize: '0.84rem',
            fontWeight: '600',
            color: '#ffffff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {currentArticle.title}
          </div>
        </div>
      </div>

      {/* Controls & Speed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {/* Speed button */}
        <button
          onClick={() => {
            const nextRate = rate === 1 ? 1.2 : (rate === 1.2 ? 0.85 : 1);
            onChangeRate(nextRate);
          }}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#ffffff',
            padding: '0.35rem 0.6rem',
            fontSize: '0.75rem',
            fontWeight: '700',
            borderRadius: 'var(--radius-sm)',
          }}
          title={t.voiceSpeed}
        >
          {rate === 0.85 ? '🌾 0.85x' : `${rate}x`}
        </button>

        {/* Play/Pause */}
        <button
          onClick={onTogglePause}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: '#ffffff',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isPaused ? t.resumeAudio : t.pauseAudio}
        >
          {isPaused ? <Play size={15} style={{ marginLeft: '2px' }} /> : <Pause size={15} />}
        </button>

        {/* Stop */}
        <button
          onClick={onStop}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={t.stopAudio}
        >
          <Square size={13} fill="currentColor" />
        </button>

        {/* Close Bar */}
        <button
          onClick={onStop}
          style={{
            color: 'rgba(255,255,255,0.6)',
            padding: '0.3rem',
            marginLeft: '0.2rem',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
