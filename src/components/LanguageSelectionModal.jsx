import React, { useState } from 'react';
import { Globe, Check, ArrowRight, Volume2 } from 'lucide-react';
import { speakFemaleVoice, stopAllSpeech } from '../utils/voiceEngine';

const LANGUAGES = [
  {
    code: 'hi',
    name: 'हिन्दी',
    englishName: 'Hindi',
    greeting: 'नमस्ते! भारतवाणी में आपका स्वागत है।',
    flag: '🇮🇳',
    popular: true,
  },
  {
    code: 'en',
    name: 'English',
    englishName: 'English',
    greeting: 'Welcome to BharatVani Government News.',
    flag: '🌐',
    popular: true,
  },
  {
    code: 'ta',
    name: 'தமிழ்',
    englishName: 'Tamil',
    greeting: 'வணக்கம்! பாரத்வாணிக்கு உங்களை வரவேற்கிறோம்.',
    flag: '🏛️',
  },
  {
    code: 'te',
    name: 'తెలుగు',
    englishName: 'Telugu',
    greeting: 'నమస్కారం! భారత్‌వాణికి స్వాగతం.',
    flag: '🌾',
  },
  {
    code: 'gu',
    name: 'ગુજરાતી',
    englishName: 'Gujarati',
    greeting: 'નમસ્તે! ભારતવાણીમાં તમારું સ્વાગત છે.',
    flag: '⚡',
  },
];

export default function LanguageSelectionModal({ currentLang, onSelectLanguage, onComplete, isModal = false }) {
  const [selected, setSelected] = useState(currentLang || 'hi');
  const [isPlayingAudio, setIsPlayingAudio] = useState(null);

  const handleAudioSample = (langItem, e) => {
    e.stopPropagation();
    stopAllSpeech();

    if (isPlayingAudio === langItem.code) {
      setIsPlayingAudio(null);
      return;
    }

    setIsPlayingAudio(langItem.code);
    speakFemaleVoice({
      text: langItem.greeting,
      lang: langItem.code,
      onEnd: () => setIsPlayingAudio(null),
      onError: () => setIsPlayingAudio(null),
    });
  };

  const handleConfirm = () => {
    stopAllSpeech();
    onSelectLanguage(selected);
    if (onComplete) onComplete(selected);
  };

  return (
    <div
      className={isModal ? "modal-overlay" : ""}
      style={{
        position: isModal ? 'fixed' : 'relative',
        inset: isModal ? 0 : 'auto',
        zIndex: isModal ? 999 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="gov-auth-card"
        style={{ maxWidth: '520px' }}
      >
        {/* Tricolor Accent Ribbon */}
        <div className="tricolor-ribbon">
          <div className="tricolor-saffron" />
          <div className="tricolor-white" />
          <div className="tricolor-green" />
        </div>

        {/* Header */}
        <div className="gov-auth-header">
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--gov-navy)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem auto',
            }}
          >
            <Globe size={24} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
            अपनी भाषा चुनें / Select Language
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
            Choose your preferred language for government news and voice narration.
          </p>
        </div>

        {/* Body Options */}
        <div className="gov-auth-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.25rem' }}>
            {LANGUAGES.map((langItem) => {
              const isSelected = selected === langItem.code;
              return (
                <div
                  key={langItem.code}
                  onClick={() => setSelected(langItem.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: isSelected
                      ? '2px solid var(--gov-navy)'
                      : '1px solid var(--border-color)',
                    background: isSelected ? 'var(--gov-navy-light)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.25rem' }}>{langItem.flag}</span>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem', color: isSelected ? 'var(--gov-navy)' : 'var(--text-primary)' }}>
                        {langItem.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {langItem.englishName}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={(e) => handleAudioSample(langItem, e)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '5px',
                        cursor: 'pointer',
                        color: isPlayingAudio === langItem.code ? 'var(--gov-navy)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Audio Preview"
                    >
                      <Volume2 size={15} />
                    </button>

                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: isSelected ? 'none' : '2px solid var(--border-color)',
                        background: isSelected ? 'var(--gov-navy)' : 'transparent',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Button */}
          <button
            onClick={handleConfirm}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.8rem',
              fontSize: '0.92rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>आगे बढ़ें / Continue</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
