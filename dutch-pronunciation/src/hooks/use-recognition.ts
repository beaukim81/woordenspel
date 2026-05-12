import { useCallback, useRef, useState } from "react";

// ── Minimal local types — avoids relying on lib.dom SpeechRecognition ──
interface SpeechRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
  stop(): void;
}

interface SpeechResultEvent {
  results: Array<SpeechResultList>;
}
interface SpeechResultList {
  length: number;
  [index: number]: { transcript: string };
}

// ── Levenshtein distance (single-row, space-optimised) ─────────────
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = temp;
    }
  }
  return row[n];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

/**
 * Lenient match for children's Dutch speech.
 * Any one of these is enough for a pass:
 *   1. Exact match after normalization
 *   2. Recognized text contains the target word
 *   3. Child said at least 70% of the word (prefix match)
 *   4. Levenshtein ≤ 1 for short words, ≤ 2 for longer ones
 *
 * Extra leniency for "st" words: Dutch children often produce the "s" with
 * a slight delay so the browser may transcribe "ster" as "ter", or add a
 * vowel prefix ("ester"). We therefore also accept a match against the word
 * with the leading "s" stripped, and strip a leading "e" from the transcript.
 */
export function isGoodEnough(recognized: string, target: string): boolean {
  const t = normalize(target);
  if (!t) return false;

  const parts = recognized.split(/\s+/).map(normalize).filter(Boolean);
  const candidates = [normalize(recognized), ...parts];

  const isStWord = t.startsWith("st");
  const isTwWord = t.startsWith("tw");
  const isClusterWord = isStWord || isTwWord;

  // Build extended candidate list
  const extraCandidates: string[] = [];
  for (const r of candidates) {
    if (!r) continue;
    // Strip a leading vowel to handle "ester"→"ster", "atwee"→"twee"
    if (/^[eaio]/.test(r)) extraCandidates.push(r.slice(1));
    // Collapse repeated leading consonant so "ssstoel"→"stoel", "ttwee"→"twee"
    if (isStWord && /^ss+/.test(r)) extraCandidates.push(r.replace(/^s+/, "s"));
    if (isTwWord && /^tt+/.test(r)) extraCandidates.push(r.replace(/^t+/, "t"));
  }

  // No extraTargets: the leading "s" (st) and "t" (tw) must be present
  // in what the child says — we only forgive repeated or vowel-prefixed forms.
  const extraTargets: string[] = [];

  const allCandidates = [...candidates, ...extraCandidates];
  const allTargets    = [t, ...extraTargets];

  // Allow one extra edit distance for these clusters so e.g. "sstoel" or
  // "ttwee" aren't blocked by the short-word threshold
  const clusterBonus = isClusterWord ? 1 : 0;

  for (const tgt of allTargets) {
    for (const r of allCandidates) {
      if (!r) continue;
      if (r === tgt) return true;
      if (r.includes(tgt) || tgt.includes(r)) return true;

      const prefix = tgt.slice(0, Math.max(2, Math.floor(tgt.length * 0.72)));
      if (tgt.length >= 4 && r.startsWith(prefix)) return true;

      const maxDist = (tgt.length >= 6 ? 2 : 1) + clusterBonus;
      if (levenshtein(r, tgt) <= maxDist) return true;
    }
  }
  return false;
}

// ── Detect SpeechRecognition API (including webkit prefix) ─────────
function getSpeechRecognitionClass(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"] ?? null) as (new () => SpeechRec) | null;
}

type OnResult = (matched: boolean, transcript: string) => void;

// ── Hook ───────────────────────────────────────────────────────────
export function useRecognition() {
  const [listening, setListening] = useState(false);
  const listeningRef = useRef(false); // sync guard — prevents double-starts
  const recRef       = useRef<SpeechRec | null>(null);

  const supported = !!getSpeechRecognitionClass();

  /** Start listening for `targetWord`. Stable reference (no deps). */
  const listen = useCallback((onResult: OnResult, targetWord: string) => {
    const SR = getSpeechRecognitionClass();
    if (!SR || listeningRef.current) return;

    recRef.current?.abort();

    const rec = new SR();
    recRef.current = rec;

    rec.lang            = "nl-NL";
    rec.continuous      = false;
    rec.interimResults  = false;
    rec.maxAlternatives = 6;

    rec.onstart = () => {
      listeningRef.current = true;
      setListening(true);
    };

    let resultFired = false;

    rec.onresult = (e: SpeechResultEvent) => {
      resultFired = true;
      listeningRef.current = false;
      setListening(false);

      const transcripts: string[] = [];
      for (let ri = 0; ri < e.results.length; ri++) {
        const result = e.results[ri];
        for (let ai = 0; ai < result.length; ai++) {
          transcripts.push(result[ai].transcript);
        }
      }
      const best    = transcripts[0] ?? "";
      const matched = transcripts.some(t => isGoodEnough(t, targetWord));
      onResult(matched, best);
    };

    rec.onerror = () => {
      resultFired = true;
      listeningRef.current = false;
      setListening(false);
      onResult(false, "");
    };

    rec.onend = () => {
      listeningRef.current = false;
      setListening(false);
      // If recognition ended without any result (e.g. no-speech on mobile),
      // treat it as a failed attempt so the UI always gives feedback.
      if (!resultFired) {
        resultFired = true;
        onResult(false, "");
      }
    };

    try {
      rec.start();
    } catch {
      listeningRef.current = false;
      setListening(false);
    }
  }, []); // stable — all mutable state read via refs

  const cancel = useCallback(() => {
    recRef.current?.abort();
    listeningRef.current = false;
    setListening(false);
  }, []);

  return { listen, cancel, listening, supported };
}
