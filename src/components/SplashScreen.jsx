import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Radio, Volume2, Globe } from 'lucide-react';

export default function SplashScreen({ onComplete }) {
  const [fadeState, setFadeState] = useState('in'); // 'in', 'visible', 'out'

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeState('visible');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    setFadeState('out');
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(135deg, #0b132b 0%, #1c2541 50%, #1e3c72 100%)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        opacity: fadeState === 'out' ? 0 : 1,
        transform: fadeState === 'out' ? 'scale(1.05)' : 'scale(1)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        overflow: 'hidden',
      }}
    >
      {/* Background Decorative Gradient Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '10%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 153, 51, 0.25) 0%, rgba(255, 153, 51, 0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '10%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(19, 136, 8, 0.25) 0%, rgba(19, 136, 8, 0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Tricolor Ribbon Glow Header */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            borderRadius: '999px',
            padding: '6px 16px',
            marginBottom: '1.75rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            letterSpacing: '0.5px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}
        >
          <span style={{ color: '#ff9933' }}>🇮🇳</span>
          <span style={{ color: '#ffffff' }}>Government News Intelligence</span>
          <span style={{ color: '#138808' }}>• PIB Live</span>
        </div>

        {/* Central Logo Emblem */}
        <div
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, #ff9933 0%, #ffffff 50%, #138808 100%)',
            padding: '3px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4), 0 0 30px rgba(255, 153, 51, 0.3)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '25px',
              background: '#0b132b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <Radio size={36} color="#ff9933" style={{ animation: 'pulse 2s infinite' }} />
          </div>
        </div>

        {/* App Title with Dual Hindi-English Typography */}
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: '900',
            lineHeight: 1.1,
            margin: '0 0 0.5rem 0',
            letterSpacing: '-0.5px',
            background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          BharatVani <span style={{ fontSize: '2rem', fontWeight: '800' }}>भारतवाणी</span>
        </h1>

        {/* Closure App Tagline */}
        <p
          style={{
            fontSize: '1.05rem',
            fontWeight: 500,
            color: '#e2e8f0',
            margin: '0 0 1.75rem 0',
            lineHeight: 1.5,
          }}
        >
          "भारत की आवाज़, हर नागरिक तक"<br />
          <span style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
            Transforming official government releases into accessible, verified multimodal news.
          </span>
        </p>

        {/* Feature Badges Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            width: '100%',
            marginBottom: '2.25rem',
            textAlign: 'left',
          }}
        >
          <div style={featureBadgeStyle}>
            <Globe size={16} color="#ff9933" />
            <span>Bilingual (Hindi + English)</span>
          </div>
          <div style={featureBadgeStyle}>
            <ShieldCheck size={16} color="#10b981" />
            <span>Grounded Fact Check</span>
          </div>
          <div style={featureBadgeStyle}>
            <Volume2 size={16} color="#38bdf8" />
            <span>Natural Indian Voice</span>
          </div>
          <div style={featureBadgeStyle}>
            <Sparkles size={16} color="#f43f5e" />
            <span>AI 3-Scene Video Stories</span>
          </div>
        </div>

        {/* Get Started Button */}
        <button
          onClick={handleStart}
          style={{
            width: '100%',
            maxWidth: '320px',
            padding: '0.95rem 1.5rem',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #ff9933 0%, #ff7700 100%)',
            color: '#ffffff',
            border: 'none',
            fontSize: '1.05rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            boxShadow: '0 8px 24px rgba(255, 119, 0, 0.4)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <span>शुरू करें / Get Started</span>
          <ArrowRight size={20} />
        </button>

        {/* Subtle SIH Attribution */}
        <div style={{ marginTop: '1.75rem', fontSize: '0.75rem', color: '#64748b' }}>
          Smart India Hackathon • Problem Statement: Accessible Government Communication
        </div>
      </div>
    </div>
  );
}

const featureBadgeStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(8px)',
  borderRadius: '10px',
  padding: '10px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '0.82rem',
  color: '#e2e8f0',
  fontWeight: '500',
};
