import React, { useEffect, useRef, useState } from 'react';
import { getLipSyncWeights } from '../utils/lipSyncEngine';
import { getCurrentAudio, subscribeAudioEvents } from '../utils/voiceEngine';
import { initAudioAnalyser } from '../utils/lipSyncEngine';
import { Mic } from 'lucide-react';

export default function NewsAnchor3D({
  isPlaying = false,
  lang = 'hi',
  modelUrl = null,
  isPiP = false,
}) {
  const canvasRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const isPiPRef = useRef(isPiP);
  const [mouthState, setMouthState] = useState({ open: 0, width: 0 });

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isPiPRef.current = isPiP;
  }, [isPiP]);

  useEffect(() => {
    const activeAudio = getCurrentAudio();
    if (activeAudio) {
      initAudioAnalyser(activeAudio);
    }

    const unsubscribeAudio = subscribeAudioEvents((audio) => {
      if (audio) {
        initAudioAnalyser(audio);
      }
    });

    return () => {
      unsubscribeAudio();
    };
  }, []);

  // 60 FPS Canvas Animation Loop for Realistic TV News Anchor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isMounted = true;
    let animationFrameId;

    let blinkTimer = 0;
    let isBlinking = false;
    let blinkProgress = 0;
    let startTime = Date.now();

    const render = () => {
      if (!isMounted) return;
      animationFrameId = requestAnimationFrame(render);

      const displayW = canvas.clientWidth || 380;
      const displayH = canvas.clientHeight || 480;
      if (canvas.width !== displayW || canvas.height !== displayH) {
        canvas.width = displayW;
        canvas.height = displayH;
      }

      const width = canvas.width;
      const height = canvas.height;
      const elapsed = (Date.now() - startTime) / 1000;
      const pip = isPiPRef.current;

      const currentlyPlaying = isPlayingRef.current;
      const weights = getLipSyncWeights(currentlyPlaying);

      setMouthState({ open: weights.jawOpen, width: weights.viseme_aa });

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // 1. Clean Studio Backdrop (Light Grey-White Gradient matching website)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#f1f5f9');
      bgGrad.addColorStop(0.5, '#e2e8f0');
      bgGrad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Studio Ambient Glow
      const glowGrad = ctx.createRadialGradient(width * 0.5, height * 0.35, 10, width * 0.5, height * 0.35, width * 0.5);
      glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      glowGrad.addColorStop(0.7, 'rgba(241, 245, 249, 0.4)');
      glowGrad.addColorStop(1, 'rgba(226, 232, 240, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Micro-Movements: Breathing & Head Speech Sway
      const breathingSway = Math.sin(elapsed * 1.8) * 3;
      const speechNod = currentlyPlaying ? Math.sin(elapsed * 6.5) * (8 * weights.volume) : 0;
      const speechTilt = currentlyPlaying ? Math.cos(elapsed * 2.5) * 4 : Math.sin(elapsed * 0.8) * 2;

      // Proportional scale factor so anchor's hair, face, neck, and blazer shoulders fit completely without cropping
      const baseScale = Math.min(width / 340, height / 400);
      const zoomFactor = (pip ? 1.35 : 0.80) * baseScale;
      const centerY = (pip ? height * 0.52 : height * 0.48) + breathingSway;
      const centerX = width * 0.5;

      ctx.save();
      // Translate to head center for natural conversational nodding
      ctx.translate(centerX, centerY);
      ctx.scale(zoomFactor, zoomFactor);
      ctx.rotate((speechTilt * Math.PI) / 180);

      // 3. Hair Back Volume (Behind Torso & Head)
      ctx.fillStyle = '#140c06';
      ctx.beginPath();
      ctx.ellipse(0, -25 + speechNod * 0.3, 110, 140, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hair strands shoulder length
      ctx.beginPath();
      ctx.moveTo(-105, -20);
      ctx.quadraticCurveTo(-115, 90, -80, 160);
      ctx.lineTo(80, 160);
      ctx.quadraticCurveTo(115, 90, 105, -20);
      ctx.closePath();
      ctx.fill();

      // 4. Torso & Broadcaster Blazer (Tailored Royal Navy)
      ctx.save();
      ctx.translate(0, 110 + speechNod * 0.2);

      // Shoulders & Body
      const blazerGrad = ctx.createLinearGradient(-130, 0, 130, 120);
      blazerGrad.addColorStop(0, '#0c1e36');
      blazerGrad.addColorStop(0.5, '#132845');
      blazerGrad.addColorStop(1, '#0c1e36');
      ctx.fillStyle = blazerGrad;
      ctx.beginPath();
      ctx.moveTo(-130, 50);
      ctx.quadraticCurveTo(-70, -20, 0, -10);
      ctx.quadraticCurveTo(70, -20, 130, 50);
      ctx.lineTo(120, 150);
      ctx.lineTo(-120, 150);
      ctx.closePath();
      ctx.fill();

      // Crisp White Inner Shirt V-Collar
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-35, -5);
      ctx.lineTo(0, 45);
      ctx.lineTo(35, -5);
      ctx.closePath();
      ctx.fill();

      // Blazer Lapels
      ctx.fillStyle = '#091526';
      // Left Lapel
      ctx.beginPath();
      ctx.moveTo(-60, 0);
      ctx.lineTo(-20, 60);
      ctx.lineTo(-38, 65);
      ctx.lineTo(-75, 10);
      ctx.closePath();
      ctx.fill();

      // Right Lapel
      ctx.beginPath();
      ctx.moveTo(60, 0);
      ctx.lineTo(20, 60);
      ctx.lineTo(38, 65);
      ctx.lineTo(75, 10);
      ctx.closePath();
      ctx.fill();

      // Broadcaster Lapel Microphone Badge with Gold Clip
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(32, 25, 10, 20, 4);
      ctx.fill();

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(30, 32, 14, 4);

      // Green Mic Live LED
      ctx.fillStyle = currentlyPlaying ? '#22c55e' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(37, 28, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 5. Neck
      const neckGrad = ctx.createLinearGradient(-30, 30, 30, 110);
      neckGrad.addColorStop(0, '#e5ac8f');
      neckGrad.addColorStop(1, '#c99175');
      ctx.fillStyle = neckGrad;
      ctx.beginPath();
      ctx.moveTo(-32, 35);
      ctx.lineTo(-28, 115);
      ctx.lineTo(28, 115);
      ctx.lineTo(32, 35);
      ctx.closePath();
      ctx.fill();

      // 6. Sculpted Face & Cranium
      const headY = speechNod;
      const faceGrad = ctx.createRadialGradient(0, headY - 10, 15, 0, headY + 10, 95);
      faceGrad.addColorStop(0, '#f2bfab');
      faceGrad.addColorStop(0.7, '#e0a387');
      faceGrad.addColorStop(1, '#c98a6e');
      ctx.fillStyle = faceGrad;

      ctx.beginPath();
      ctx.moveTo(-70, headY - 45);
      ctx.quadraticCurveTo(-78, headY + 25, -45, headY + 65);
      ctx.quadraticCurveTo(0, headY + 82, 45, headY + 65);
      ctx.quadraticCurveTo(78, headY + 25, 70, headY - 45);
      ctx.quadraticCurveTo(65, headY - 95, 0, headY - 95);
      ctx.quadraticCurveTo(-65, headY - 95, -70, headY - 45);
      ctx.closePath();
      ctx.fill();

      // Cheek Blush
      ctx.fillStyle = 'rgba(219, 112, 147, 0.18)';
      ctx.beginPath();
      ctx.ellipse(-42, headY + 10, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(42, headY + 10, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // 7. Eyebrows
      const browLift = currentlyPlaying ? Math.sin(elapsed * 4.5) * (4 * weights.volume) : 0;
      ctx.strokeStyle = '#140c06';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(-52, headY - 26 - browLift);
      ctx.quadraticCurveTo(-34, headY - 35 - browLift, -18, headY - 27 - browLift);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(18, headY - 27 - browLift);
      ctx.quadraticCurveTo(34, headY - 35 - browLift, 52, headY - 26 - browLift);
      ctx.stroke();

      // 8. Eyes & Natural Blinking System
      blinkTimer += 0.016;
      if (!isBlinking && blinkTimer > 3.2 + Math.sin(elapsed) * 1.5) {
        isBlinking = true;
        blinkTimer = 0;
        blinkProgress = 0;
      }

      if (isBlinking) {
        blinkProgress += 0.18;
        if (blinkProgress >= 1.0) {
          isBlinking = false;
        }
      }

      const drawEye = (x, y) => {
        ctx.save();
        ctx.translate(x, y);

        if (isBlinking) {
          ctx.strokeStyle = '#140c06';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-16, 0);
          ctx.quadraticCurveTo(0, 5, 16, 0);
          ctx.stroke();
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(0, 0, 16, 9.5, 0, 0, Math.PI * 2);
          ctx.fill();

          const irisX = Math.sin(elapsed * 0.6) * 1.5;
          ctx.fillStyle = '#22140c';
          ctx.beginPath();
          ctx.arc(irisX, 0, 6.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(irisX, 0, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(irisX + 2, -2, 1.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#140c06';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-17, 1);
          ctx.quadraticCurveTo(0, -9.5, 17, 1);
          ctx.stroke();
        }

        ctx.restore();
      };

      drawEye(-35, headY - 14);
      drawEye(35, headY - 14);

      // Traditional subtle bindi dot
      ctx.fillStyle = '#831843';
      ctx.beginPath();
      ctx.arc(0, headY - 26, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 9. Sculpted Nose
      ctx.strokeStyle = 'rgba(180, 110, 80, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-2, headY - 12);
      ctx.lineTo(-4, headY + 12);
      ctx.quadraticCurveTo(0, headY + 18, 4, headY + 12);
      ctx.stroke();

      // Nostrils
      ctx.fillStyle = 'rgba(160, 90, 70, 0.4)';
      ctx.beginPath();
      ctx.ellipse(-7, headY + 13, 3, 1.5, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(7, headY + 13, 3, 1.5, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // 10. Real-Time Lip-Sync Animated Mouth & Teeth
      const mouthY = headY + 42;
      const jawOpenPixels = weights.jawOpen * 22;
      const mouthWidthPixels = 26 + weights.viseme_aa * 10;

      if (jawOpenPixels > 2) {
        ctx.fillStyle = '#450a0a';
        ctx.beginPath();
        ctx.ellipse(0, mouthY + jawOpenPixels * 0.4, mouthWidthPixels * 0.8, Math.max(3, jawOpenPixels * 0.7), 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(-mouthWidthPixels * 0.55, mouthY - 3, mouthWidthPixels * 1.1, 5, [1, 1, 2, 2]);
        ctx.fill();
      }

      // Upper Lip
      ctx.fillStyle = '#be185d';
      ctx.beginPath();
      ctx.moveTo(-mouthWidthPixels, mouthY);
      ctx.quadraticCurveTo(-mouthWidthPixels * 0.5, mouthY - 7, 0, mouthY - 4);
      ctx.quadraticCurveTo(mouthWidthPixels * 0.5, mouthY - 7, mouthWidthPixels, mouthY);
      ctx.quadraticCurveTo(0, mouthY + 1, -mouthWidthPixels, mouthY);
      ctx.closePath();
      ctx.fill();

      // Lower Lip
      ctx.fillStyle = '#9d174d';
      ctx.beginPath();
      ctx.moveTo(-mouthWidthPixels, mouthY);
      ctx.quadraticCurveTo(0, mouthY + 3 + jawOpenPixels, mouthWidthPixels, mouthY);
      ctx.quadraticCurveTo(0, mouthY + 8 + jawOpenPixels * 1.2, -mouthWidthPixels, mouthY);
      ctx.closePath();
      ctx.fill();

      // 11. Front Styled Hair Bangs
      ctx.fillStyle = '#140c06';
      ctx.beginPath();
      ctx.moveTo(-74, headY - 45);
      ctx.quadraticCurveTo(-45, headY - 100, 0, headY - 98);
      ctx.quadraticCurveTo(45, headY - 100, 74, headY - 45);
      ctx.quadraticCurveTo(40, headY - 75, 0, headY - 70);
      ctx.quadraticCurveTo(-40, headY - 75, -74, headY - 45);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-74, headY - 45);
      ctx.quadraticCurveTo(-50, headY - 70, 0, headY - 70);
      ctx.quadraticCurveTo(-30, headY - 30, -78, headY - 10);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // 12. Studio News Desk (Rendered only in full Studio mode, hidden in PiP circle)
      if (!pip) {
        const deskY = height * 0.76;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, deskY, width, height - deskY);

        // Glass Top Surface
        const glassGrad = ctx.createLinearGradient(0, deskY, 0, deskY + 16);
        glassGrad.addColorStop(0, '#334155');
        glassGrad.addColorStop(0.3, '#1e293b');
        glassGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = glassGrad;
        ctx.fillRect(0, deskY, width, 16);

        // Saffron/Gold Accent Strip
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(0, deskY, width, 3);

        // Official National Desk Emblem
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏛️ BHARATVANI • OFFICIAL NEWSROOM DESK', width * 0.5, deskY + 36);
      }
    };

    render();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPiP]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: isPiP ? '100%' : '240px',
      background: '#f8fafc',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />

      {/* Top Status Badge (Only shown in full Studio mode) */}
      {!isPiP && (
        <div style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: 'var(--radius-sm)',
          padding: '0.2rem 0.6rem',
          fontSize: '0.72rem',
          fontWeight: '700',
          color: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isPlaying ? '#16a34a' : '#94a3b8',
              boxShadow: isPlaying ? '0 0 6px #16a34a' : 'none',
            }}
          />
          <span>
            {isPlaying
              ? (lang === 'hi' ? 'लाइव AI एंकर (Lip-Sync On)' : 'Live AI Presenter (Lip-Sync On)')
              : (lang === 'hi' ? 'AI एंकर तैयार' : 'AI Presenter Ready')}
          </span>
        </div>
      )}

      {/* Live Audio Volume Indicator (Only in full Studio mode) */}
      {!isPiP && isPlaying && (
        <div style={{
          position: 'absolute',
          bottom: '0.75rem',
          left: '0.75rem',
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: 'var(--radius-sm)',
          padding: '0.2rem 0.55rem',
          fontSize: '0.68rem',
          fontWeight: '700',
          color: '#16a34a',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <Mic size={12} />
          <span>{lang === 'hi' ? 'वॉयस सिंक सक्रिय' : 'Voice Sync Active'}</span>
        </div>
      )}
    </div>
  );
}
