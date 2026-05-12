import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Score a voice for Netherlands Dutch (hard G).
 * Higher score = better fit. Returns -1 if the voice is not Dutch at all.
 *
 * The hard Dutch G (velaire fricatief) is the key differentiator:
 *   nl-NL voices (Netherlands) use the hard G [x]/[ɣ]
 *   nl-BE voices (Belgium)     use the soft G [h]/[j]
 *
 * We cannot control the phoneme directly through the Web Speech API,
 * but we can maximise the chance of landing on a Netherlands voice.
 */
function scoreDutchVoice(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase();
  const name = v.name.toLowerCase();

  // Not Dutch at all → reject immediately
  if (!lang.startsWith("nl") && !name.includes("dutch") && !name.includes("nederland")) {
    return -1;
  }

  let score = 0;

  // ── Language tag matching ────────────────────────────────────
  if (lang === "nl-nl")               score += 120;  // Best: Netherlands NL
  else if (lang.startsWith("nl-nl"))  score += 100;  // Still NL
  else if (lang === "nl")             score +=  50;  // Generic Dutch (probably NL)
  else if (lang.startsWith("nl"))     score +=  20;  // Other NL variant
  else                                score +=  10;  // Named "Dutch" but unknown locale

  // ── Belgian penalty (soft G) ─────────────────────────────────
  if (lang === "nl-be" || lang.startsWith("nl-be"))    score -= 150;
  if (name.includes("belgi") || name.includes("vlaams")) score -= 150;

  // ── Name hints for Netherlands origin ───────────────────────
  if (name.includes("nederland") || name.includes("nl-nl")) score += 20;

  // ── Prefer cloud/enhanced voices (usually higher quality) ───
  // localService = true means it's the built-in, often lower quality on mobile
  if (!v.localService) score += 15;

  // ── Prefer voices with "premium", "enhanced", "neural" etc. ─
  const qualityKeywords = ["premium", "enhanced", "neural", "natural", "hd"];
  if (qualityKeywords.some(k => name.includes(k))) score += 25;

  // ── Prefer female voices for child-friendliness ─────────────
  // (Dutch female TTS voices tend to use a slightly softer hard-G
  //  that is still clearly NL, while still sounding warm for kids)
  const femaleKeywords = ["femme", "female", "vrouw", "fenna", "lotte", "anne", "lisa", "eva"];
  if (femaleKeywords.some(k => name.includes(k))) score += 10;

  return score;
}

/**
 * Pre-process Dutch text so the TTS engine fully articulates every sound.
 *
 * Problem: Dutch TTS voices (even nl-NL) apply "n-deletie" — the natural
 * speech rule that drops the final /n/ in words like "spelen", "draaien",
 * "springen". For pronunciation practice every letter must be audible.
 *
 * Fix: when a word ends with 'n' (optionally followed by whitespace),
 * we append a period. The engine sees an explicit sentence boundary and
 * fully closes the final consonant before stopping, instead of coarticulating
 * it into silence.
 *
 * Examples:
 *   "spelen"   → "spelen."
 *   "draaien"  → "draaien."
 *   "springen" → "springen."
 *   "draak"    → "draak"   (unchanged — doesn't end in n)
 */
function preprocessDutchText(text: string): string {
  return text.replace(/n(\s*)$/i, "n.$1");
}

/** Pick the best available Netherlands Dutch voice */
function getBestDutchVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const scored = voices
    .map(v => ({ voice: v, score: scoreDutchVoice(v) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.voice ?? null;
}

/** Debug helper — returns the full scored list (useful in DevTools) */
export function debugVoices(): { name: string; lang: string; local: boolean; score: number }[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis
    .getVoices()
    .map(v => ({ name: v.name, lang: v.lang, local: v.localService, score: scoreDutchVoice(v) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function useSpeech() {
  const [speaking, setSpeaking]       = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Chrome/Edge populate voices synchronously; Firefox/Safari fire voiceschanged
    if (window.speechSynthesis.getVoices().length > 0) setVoicesReady(true);

    const handler = () => setVoicesReady(true);
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", handler);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(preprocessDutchText(text));
      utteranceRef.current = utterance;

      const voice = getBestDutchVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang  = voice.lang;
      } else {
        // Always force Netherlands Dutch locale — even if the engine falls back
        // to a generic voice it will try to apply NL phoneme rules
        utterance.lang = "nl-NL";
      }

      // Clear, slightly slow pronunciation for a 7-year-old.
      // A lower rate (0.78) gives the vowels more time to form, which also
      // makes the hard-G cluster "sp", "dr", "tw" easier to hear.
      utterance.rate   = 0.78;
      utterance.pitch  = 1.05;
      utterance.volume = 1;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend   = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      // iOS Safari requires a small gap after cancel() before a new speak()
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 55);

      setSpeaking(true);
    },
    [voicesReady], // re-create when voices load so we pick up new options
  );

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  return { speak, cancel, speaking, supported, voicesReady };
}
