// Focus audio engine: manages continuous background noise
// and periodic "nudge" cues to gently refocus the user.

import { playAudio } from "./audioPool.js";

// Simple domain palette so the rest of the app can speak in terms
// of background noise and nudges instead of raw implementation details.
export const BACKGROUND_NOISE_PRESETS = {
  BROWN_NOISE: {
    id: "BROWN_NOISE",
    label: "Warm noise (brown)",
    type: "noise",
  },
};

export const NUDGE_PRESETS = {
  SOFT_BELL: {
    id: "SOFT_BELL",
    label: "Soft bell nudge",
    audioId: "BELL_SFX",
  },
};

const DEFAULT_CONFIG = {
  enableBackgroundNoise: true,
  backgroundNoisePresetId: BACKGROUND_NOISE_PRESETS.BROWN_NOISE.id,
  backgroundNoiseVolume: 0.25,
  enableNudges: true,
  nudgeIntervalMinutes: 20,
};

/**
 * Creates a focus audio engine that holds state in closure and exposes
 * setConfig, startSession, stopSession. Internal helpers are private.
 * @returns {{ setConfig: (cfg: Partial<typeof DEFAULT_CONFIG>) => void; startSession: () => Promise<void>; stopSession: () => void }}
 */
function createFocusAudioEngine() {
  /** @type {AudioContext | null} */
  let audioCtx = null;
  /** @type {AudioBuffer | null} */
  let backgroundNoiseBuffer = null;
  /** @type {AudioBufferSourceNode | null} */
  let backgroundNoiseSource = null;
  /** @type {GainNode | null} */
  let backgroundNoiseGain = null;
  /** @type {number | null} */
  let nudgeIntervalId = null;
  let config = { ...DEFAULT_CONFIG };
  let isRunning = false;

  /**
   * Update configuration. Safe to call between sessions.
   * @param {Partial<typeof DEFAULT_CONFIG>} cfg
   */
  function setConfig(cfg) {
    config = {
      ...config,
      ...cfg,
    };
  }

  async function ensureContext() {
    if (typeof window === "undefined") return;
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn("Web Audio API not available in this environment.");
        return;
      }
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === "suspended") {
      try {
        await audioCtx.resume();
      } catch (e) {
        console.error("Failed to resume AudioContext", e);
      }
    }
  }

  /**
   * Generate a brown noise buffer we can loop for the background noise.
   * @returns {AudioBuffer | null}
   */
  function createBrownNoiseBuffer() {
    if (!audioCtx) return null;
    const sampleRate = audioCtx.sampleRate;
    const seconds = 10;
    const length = sampleRate * seconds;
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }

    return buffer;
  }

  function startBackgroundNoise() {
    if (!audioCtx) return;
    if (backgroundNoiseSource) return;

    if (!backgroundNoiseBuffer) {
      backgroundNoiseBuffer = createBrownNoiseBuffer();
    }
    if (!backgroundNoiseBuffer) return;

    const source = audioCtx.createBufferSource();
    source.buffer = backgroundNoiseBuffer;
    source.loop = true;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, audioCtx.currentTime);

    source.connect(gain).connect(audioCtx.destination);

    const target = Math.max(0, Math.min(1, config.backgroundNoiseVolume));
    const now = audioCtx.currentTime;
    const fadeSeconds = 1.0;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(target, now + fadeSeconds);

    source.start();

    backgroundNoiseSource = source;
    backgroundNoiseGain = gain;
  }

  function stopBackgroundNoise() {
    if (!audioCtx) return;
    if (!backgroundNoiseSource || !backgroundNoiseGain) return;

    const now = audioCtx.currentTime;
    const fadeSeconds = 0.5;
    backgroundNoiseGain.gain.cancelScheduledValues(now);
    backgroundNoiseGain.gain.setValueAtTime(backgroundNoiseGain.gain.value, now);
    backgroundNoiseGain.gain.linearRampToValueAtTime(0, now + fadeSeconds);

    setTimeout(() => {
      if (backgroundNoiseSource) {
        try {
          backgroundNoiseSource.stop();
        } catch {
          // already stopped
        }
        backgroundNoiseSource.disconnect();
        backgroundNoiseSource = null;
      }
      if (backgroundNoiseGain) {
        backgroundNoiseGain.disconnect();
        backgroundNoiseGain = null;
      }
    }, fadeSeconds * 1000 + 50);
  }

  function startNudges() {
    stopNudges();
    if (!config.enableNudges) return;
    if (!isRunning) return;

    const minutes = config.nudgeIntervalMinutes;
    if (!minutes || minutes <= 0) return;

    const intervalMs = minutes * 60 * 1000;
    nudgeIntervalId = window.setInterval(() => {
      if (!isRunning) return;
      triggerNudge();
    }, intervalMs);
  }

  function stopNudges() {
    if (nudgeIntervalId != null) {
      window.clearInterval(nudgeIntervalId);
      nudgeIntervalId = null;
    }
  }

  function triggerNudge() {
    playAudio(NUDGE_PRESETS.SOFT_BELL.audioId);
  }

  async function startSession() {
    isRunning = true;
    await ensureContext();
    if (!audioCtx) return;

    if (config.enableBackgroundNoise) {
      startBackgroundNoise();
    }
    if (config.enableNudges) {
      startNudges();
    }
  }

  function stopSession() {
    isRunning = false;
    stopBackgroundNoise();
    stopNudges();
  }

  return {
    setConfig,
    startSession,
    stopSession,
  };
}

export const focusAudioEngine = createFocusAudioEngine();
