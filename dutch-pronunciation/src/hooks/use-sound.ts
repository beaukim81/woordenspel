/**
 * Programmatic coin-clink sound using the Web Audio API.
 * No external audio files required.
 *
 * The coin sound is two short sine-wave tones:
 *   B5 (988 Hz) → E6 (1319 Hz)
 * with exponential fade-out to avoid clicks.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(
  ctx: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  volume = 0.28,
) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.value = freq;

  const now = ctx.currentTime + startAt;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.start(now);
  osc.stop(now + duration + 0.01);
}

/** Play a short coin-clink sound effect. Safe to call on any event. */
export function playCoinSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume suspended context (required after user gesture on some browsers)
  if (ctx.state === 'suspended') {
    void ctx.resume().then(() => {
      tone(ctx, 988,  0,    0.12);  // B5
      tone(ctx, 1319, 0.08, 0.18);  // E6
    });
  } else {
    tone(ctx, 988,  0,    0.12);
    tone(ctx, 1319, 0.08, 0.18);
  }
}
