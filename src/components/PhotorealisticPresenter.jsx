import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Room, RoomEvent, Track } from 'livekit-client';
import { 
  Tv, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Layers, 
  Radio, 
  CheckCircle2, 
  Info 
} from 'lucide-react';
import NewsAnchor3D from './NewsAnchor3D';

/**
 * Photorealistic Real-Time AI News Presenter for BharatVani
 * Primary engine: D-ID Expressive V4 with Echo Sessions (LiveKit Realtime Transport)
 * Fallback engine: Photorealistic broadcast portrait with audio-synced natural animation & Classic 3D mode
 */
export default function PhotorealisticPresenter({
  article,
  activeScene,
  isPlaying = false,
  isMuted = false,
  lang = 'hi',
  speechProgress = 0,
  onPresenterModeChange,
}) {
  // Engine Modes: 'photorealistic' (D-ID / High-Res Realtime) | 'classic' (Canvas 3D Anchor)
  const [engineMode, setEngineMode] = useState('photorealistic');

  // Presenter Lifecycle States: 'idle' | 'connecting' | 'ready' | 'speaking' | 'paused' | 'fallback' | 'error'
  const [presenterState, setPresenterState] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [hasLiveVideoTrack, setHasLiveVideoTrack] = useState(false);
  const [avatarHasAudio, setAvatarHasAudio] = useState(false);

  // References
  const videoElementRef = useRef(null);
  const audioElementRef = useRef(null);
  const roomRef = useRef(null);
  const activeUtteranceRef = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const lastSpokenTextRef = useRef('');

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Check server-side D-ID configuration status on mount
  useEffect(() => {
    let isMounted = true;
    axios.get('/api/anchor/status')
      .then((res) => {
        if (isMounted && res.data?.success) {
          setProviderConfigured(Boolean(res.data.configured));
        }
      })
      .catch(() => {
        if (isMounted) setProviderConfigured(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Clean up LiveKit room connection
  const disconnectRoom = useCallback(async () => {
    if (roomRef.current) {
      try {
        await roomRef.current.disconnect();
      } catch (err) {
        console.warn('Error disconnecting LiveKit room:', err);
      }
      roomRef.current = null;
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
    }
    setHasLiveVideoTrack(false);
    setAvatarHasAudio(false);
  }, []);

  // Close server D-ID session
  const closeSession = useCallback(async (currentSessionId) => {
    if (currentSessionId) {
      try {
        await axios.post('/api/anchor/close', { sessionId: currentSessionId });
      } catch {}
    }
  }, []);

  // Session Initialization & Lifecycle
  useEffect(() => {
    let isMounted = true;
    const storyId = article?.id || article?.prid || 'default';

    if (engineMode !== 'photorealistic') {
      disconnectRoom();
      return;
    }

    setPresenterState('connecting');
    setStatusMessage(lang === 'hi' ? 'लाइव AI स्टूडियो से जुड़ रहे हैं...' : 'Connecting to Live AI Studio...');

    // Request Echo session credentials from secure backend
    axios.post('/api/anchor/session', {
      storyId,
      lang: lang === 'en' ? 'en' : 'hi',
    })
      .then(async (res) => {
        if (!isMounted) return;

        if (res.data?.success && res.data.sessionUrl && res.data.sessionToken) {
          const { sessionId: newSessionId, sessionUrl, sessionToken } = res.data;
          setSessionId(newSessionId);

          try {
            await disconnectRoom();

            const room = new Room({
              adaptiveStream: true,
              dynacast: true,
            });
            roomRef.current = room;

            // Handle incoming remote tracks from D-ID avatar
            room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
              if (!isMounted) return;

              if (track.kind === Track.Kind.Video && videoElementRef.current) {
                track.attach(videoElementRef.current);
                setHasLiveVideoTrack(true);
                setPresenterState('ready');
                setStatusMessage(lang === 'hi' ? 'लाइव एंकर तैयार' : 'Live Presenter Ready');
              }

              if (track.kind === Track.Kind.Audio && audioElementRef.current) {
                track.attach(audioElementRef.current);
                setAvatarHasAudio(true);
              }
            });

            room.on(RoomEvent.Disconnected, () => {
              if (isMounted) {
                setHasLiveVideoTrack(false);
                setPresenterState('idle');
              }
            });

            // LiveKit server host is the URL before /room/
            const livekitHost = sessionUrl.split('/room/')[0];
            await room.connect(livekitHost, sessionToken);

            if (isMounted) {
              setPresenterState('ready');
              setStatusMessage(lang === 'hi' ? 'लाइव एंकर तैयार' : 'Live Presenter Ready');
            }
          } catch (err) {
            console.warn('LiveKit connection error, falling back to local photorealistic presenter:', err);
            if (isMounted) {
              setPresenterState('fallback');
              setStatusMessage(lang === 'hi' ? 'सक्रिय फोटो-यथार्थवादी प्रस्तुति' : 'Photorealistic Studio Mode');
            }
          }
        } else {
          // Provider credentials unconfigured or session failed: graceful fallback to photorealistic studio
          if (isMounted) {
            setPresenterState('fallback');
            setStatusMessage(
              res.data?.message || (lang === 'hi' ? 'फोटो-यथार्थवादी स्टूडियो मोड' : 'Photorealistic Studio Mode')
            );
          }
        }
      })
      .catch((err) => {
        console.warn('Session API error, falling back to local photorealistic presenter:', err.message);
        if (isMounted) {
          setPresenterState('fallback');
          setStatusMessage(lang === 'hi' ? 'फोटो-यथार्थवादी स्टूडियो मोड' : 'Photorealistic Studio Mode');
        }
      });

    return () => {
      isMounted = false;
      disconnectRoom();
      if (sessionId) {
        closeSession(sessionId);
      }
    };
  }, [article?.id, article?.prid, lang, engineMode, disconnectRoom, closeSession]);

  // Synchronize Audio & Utterance Streaming to D-ID Echo
  useEffect(() => {
    if (engineMode !== 'photorealistic' || !sessionId || !hasLiveVideoTrack) return;
    if (!isPlaying || !activeScene?.narration) return;

    const utteranceText = `${activeScene.headline ? activeScene.headline + '. ' : ''}${activeScene.narration}`;
    if (lastSpokenTextRef.current === utteranceText) return;
    lastSpokenTextRef.current = utteranceText;

    setPresenterState('speaking');

    axios.post('/api/anchor/speak', {
      sessionId,
      text: utteranceText,
      lang: lang === 'en' ? 'en' : 'hi',
      interrupt: true,
    })
      .then((res) => {
        if (res.data?.success) {
          activeUtteranceRef.current = res.data.utterance_id;
        }
      })
      .catch((err) => {
        console.warn('Failed to stream audio to Echo session:', err.message);
      });
  }, [activeScene, isPlaying, sessionId, hasLiveVideoTrack, lang, engineMode]);

  // Handle Pause / Resume interrupt
  useEffect(() => {
    if (!sessionId || !hasLiveVideoTrack) return;

    if (!isPlaying && presenterState === 'speaking') {
      axios.post('/api/anchor/interrupt', { sessionId }).catch(() => {});
      setPresenterState('paused');
    }
  }, [isPlaying, sessionId, hasLiveVideoTrack, presenterState]);

  // Sync mute state on avatar audio track
  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.muted = isMuted;
    }
    if (videoElementRef.current) {
      videoElementRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Presenter metadata
  const presenterName = lang === 'hi' ? 'अवनी शर्मा' : 'Avani Sharma';
  const presenterRole = lang === 'hi' ? 'वरिष्ठ राष्ट्रीय समाचार एंकर' : 'Senior National News Anchor';

  // Fallback lip-sync scale calculation
  const mouthScaleY = isPlaying && !isMuted ? 1 + Math.sin(speechProgress * 40) * 0.12 : 1;
  const mouthScaleX = isPlaying && !isMuted ? 1 + Math.cos(speechProgress * 25) * 0.04 : 1;
  const headSway = isPlaying && !isMuted ? Math.sin(speechProgress * 15) * 1.5 : 0;

  return (
    <div 
      className="photorealistic-presenter-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '260px',
        maxHeight: '100%',
        background: '#0b1120',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Hidden audio element for LiveKit avatar audio */}
      <audio ref={audioElementRef} autoPlay playsInline style={{ display: 'none' }} />

      {engineMode === 'classic' ? (
        // Mode 1: Classic 3D Canvas Anchor (Preserved Rollout Fallback)
        <NewsAnchor3D isPlaying={isPlaying && !isMuted} lang={lang} />
      ) : hasLiveVideoTrack ? (
        // Mode 2: D-ID Expressive V4 LiveKit Realtime Stream
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video
            ref={videoElementRef}
            autoPlay
            playsInline
            muted={isMuted}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      ) : (
        // Mode 3: Photorealistic Studio Presenter (Seamless Fallback when D-ID LiveKit connects or runs locally)
        <div 
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #1e293b 0%, #090d16 100%)',
            overflow: 'hidden',
          }}
        >
          {/* Subtle TV Broadcast Ambient Lighting Glow */}
          <div 
            style={{
              position: 'absolute',
              top: '15%',
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              background: isPlaying 
                ? 'radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(30, 58, 138, 0) 70%)'
                : 'radial-gradient(circle, rgba(148, 163, 184, 0.12) 0%, rgba(30, 58, 138, 0) 70%)',
              transition: 'background 0.4s ease',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* High-Resolution Presenter Portrait with Subtle Natural Motion */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `translateY(${headSway * 0.8}px) scale(${mouthScaleY * 0.01 + 0.99})`,
              transition: 'transform 0.12s ease-out',
              zIndex: 2,
            }}
          >
            <img
              src="/presenter.jpg"
              alt="BharatVani AI Presenter Avani Sharma"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 18%',
                filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.4))',
              }}
              onError={(e) => {
                // If local presenter image is missing, switch to classic canvas mode gracefully
                console.warn('Presenter portrait asset failed to load, switching to classic canvas');
                setEngineMode('classic');
              }}
            />

            {/* Natural Speaking Waveform Overlay when active */}
            {isPlaying && !isMuted && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: '3.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: 'rgba(15, 23, 42, 0.82)',
                  backdropFilter: 'blur(6px)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ width: '3px', height: `${10 + Math.sin(speechProgress * 30) * 8}px`, background: '#38bdf8', borderRadius: '2px' }} />
                <div style={{ width: '3px', height: `${16 + Math.sin(speechProgress * 45) * 10}px`, background: '#22c55e', borderRadius: '2px' }} />
                <div style={{ width: '3px', height: `${12 + Math.cos(speechProgress * 35) * 8}px`, background: '#38bdf8', borderRadius: '2px' }} />
                <span style={{ fontSize: '0.62rem', color: '#e2e8f0', fontWeight: '700', marginLeft: '3px', letterSpacing: '0.03em' }}>
                  {lang === 'hi' ? 'लाइव आवाज' : 'VOICE SYNC'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOP OVERLAY: Engine Switcher & Provider Status */}
      <div 
        style={{
          position: 'absolute',
          top: '0.5rem',
          left: '0.5rem',
          right: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          pointerEvents: 'auto',
        }}
      >
        {/* Left Badge: Live Status & Technology Model */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
          padding: '3px 8px',
          borderRadius: '4px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          fontSize: '0.66rem',
          fontWeight: '700',
          color: '#ffffff',
        }}>
          {hasLiveVideoTrack ? (
            <>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
              <span style={{ color: '#4ade80' }}>D-ID Expressive V4 Live</span>
            </>
          ) : engineMode === 'classic' ? (
            <>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} />
              <span>Classic 3D Anchor</span>
            </>
          ) : (
            <>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPlaying ? '#22c55e' : '#94a3b8' }} />
              <span>{lang === 'hi' ? 'फोटो-यथार्थवादी एंकर' : 'Photorealistic Studio'}</span>
            </>
          )}
        </div>

        {/* Right Button: Toggle between Photorealistic & Classic 3D mode */}
        <button
          type="button"
          onClick={() => {
            const nextMode = engineMode === 'photorealistic' ? 'classic' : 'photorealistic';
            setEngineMode(nextMode);
            if (onPresenterModeChange) onPresenterModeChange(nextMode);
          }}
          title={engineMode === 'photorealistic' ? 'Switch to Classic 3D Presenter' : 'Switch to Photorealistic Presenter'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            background: 'rgba(30, 41, 59, 0.88)',
            backdropFilter: 'blur(6px)',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '0.64rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Layers size={11} color="#38bdf8" />
          <span>{engineMode === 'photorealistic' ? 'Classic 3D' : 'Photorealistic'}</span>
        </button>
      </div>

      {/* BOTTOM OVERLAY: Television Broadcast Lower Thirds */}
      <div 
        style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          background: 'linear-gradient(to top, rgba(11, 17, 32, 0.95) 0%, rgba(11, 17, 32, 0.8) 60%, rgba(11, 17, 32, 0) 100%)',
          padding: '1.2rem 0.75rem 0.5rem 0.75rem',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          pointerEvents: 'none',
        }}
      >
        {/* Anchor Identity Banner (Doordarshan / National Broadcast Aesthetics) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(8px)',
          borderLeft: '3px solid #ea580c', // Bharat saffron accent
          borderRadius: '0 4px 4px 0',
          padding: '4px 8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#ffffff', letterSpacing: '0.02em' }}>
              {presenterName}
            </div>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: '600' }}>
              {presenterRole}
            </div>
          </div>

          {/* PIB Grounded Verification Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: 'rgba(22, 163, 74, 0.18)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '0.60rem',
            color: '#4ade80',
            fontWeight: '700',
          }}>
            <ShieldCheck size={11} />
            <span>{lang === 'hi' ? 'पीआईबी सत्यापित' : 'PIB Grounded'}</span>
          </div>
        </div>

        {/* Live Status Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.60rem',
          color: '#cbd5e1',
          padding: '0 4px',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Radio size={10} color={isPlaying ? '#22c55e' : '#94a3b8'} />
            <span>
              {isPlaying 
                ? (lang === 'hi' ? 'सीधा प्रसारण • लाइव एंकर वाचन' : 'LIVE BROADCAST • PRESENTING') 
                : (lang === 'hi' ? 'विराम (PAUSED)' : 'PAUSED')}
            </span>
          </span>

          <span style={{ color: '#64748b' }}>
            {hasLiveVideoTrack ? 'D-ID Echo v4' : 'Studio Engine'}
          </span>
        </div>
      </div>
    </div>
  );
}
