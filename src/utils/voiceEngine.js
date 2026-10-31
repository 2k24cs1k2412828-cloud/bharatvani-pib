// Natural Indian Female Voice Engine (100% Authentic Indian Anchor Audio Stream)
// Streams natural Indian female broadcast voice directly from /api/tts

let currentAudio = null;
let currentAudioUrl = null;
let audioListeners = new Set();

export function getCurrentAudio() {
  return currentAudio;
}

export function subscribeAudioEvents(callback) {
  audioListeners.add(callback);
  return () => audioListeners.delete(callback);
}

function notifyAudioStarted(audio) {
  audioListeners.forEach((cb) => {
    try { cb(audio); } catch {}
  });
}

// Stop any currently playing audio completely
export function stopAllSpeech() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.src = '';
      currentAudio.onended = null;
      currentAudio.onerror = null;
      currentAudio.ontimeupdate = null;
    } catch {}
    currentAudio = null;
    notifyAudioStarted(null);
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

// Pause current speech
export function pauseSpeech() {
  if (currentAudio && !currentAudio.paused) {
    try {
      currentAudio.pause();
    } catch {}
  }
}

// Resume current speech
export function resumeSpeech() {
  if (currentAudio && currentAudio.paused) {
    try {
      currentAudio.play().catch(() => {});
    } catch {}
  }
}

// Clean and sanitize text for speech
export function sanitizeSpeechText(text = '') {
  return text
    .replace(/[*#_~`]/g, '')
    .replace(/[🏛️📌🌾⚡📈🌐✅📱🚨⚡🤖]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Play speech using pure, natural Indian Female Voice Audio Stream
export function speakFemaleVoice({
  text,
  lang = 'hi',
  rate = 1,
  onProgress = () => {},
  onEnd = () => {},
  onError = () => {},
}) {
  stopAllSpeech();

  const clean = sanitizeSpeechText(text);
  if (!clean) {
    onEnd();
    return;
  }

  const safeLang = ['hi', 'en', 'ta', 'te', 'gu'].includes(lang) ? lang : 'hi';
  const ttsUrl = `/api/tts?lang=${safeLang}&text=${encodeURIComponent(clean.slice(0, 1500))}`;

  try {
    const audio = new Audio(ttsUrl);
    audio.crossOrigin = 'anonymous';
    currentAudio = audio;
    currentAudioUrl = ttsUrl;
    audio.volume = 1.0;
    audio.playbackRate = Math.min(Math.max(rate, 0.8), 1.25);

    notifyAudioStarted(audio);

    audio.ontimeupdate = () => {
      if (audio.duration && audio.duration > 0) {
        const progress = Math.min(audio.currentTime / audio.duration, 0.98);
        onProgress(progress, audio.currentTime, audio.duration);
      }
    };

    audio.onended = () => {
      onProgress(1, audio.duration || 1, audio.duration || 1);
      currentAudio = null;
      notifyAudioStarted(null);
      onEnd();
    };

    audio.onerror = (err) => {
      console.warn('Audio stream error, falling back to clean synthesis:', err);
      // Clean fallback if network drops
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          const utterance = new SpeechSynthesisUtterance(clean);
          utterance.lang = safeLang === 'en' ? 'en-IN' : 'hi-IN';
          utterance.rate = rate;
          utterance.onend = () => onEnd();
          utterance.onerror = () => onEnd();
          window.speechSynthesis.speak(utterance);
          return;
        } catch {}
      }
      currentAudio = null;
      notifyAudioStarted(null);
      onError(err);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio play error / autoplay policy:', err);
        currentAudio = null;
        notifyAudioStarted(null);
        onError(err);
      });
    }
  } catch (err) {
    console.error('Failed to initialize Audio element:', err);
    currentAudio = null;
    notifyAudioStarted(null);
    onError(err);
  }
}
