console.log("NEW VERSION LOADED");
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

// ── Levenshtein distance ────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  const row = Array.from(
    { length: n + 1 },
    (_, i) => i
  );

  for (let i = 1; i <= m; i++) {
    let prev = row[0];

    row[0] = i;

    for (let j = 1; j <= n; j++) {
      const temp = row[j];

      row[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 +
            Math.min(
              prev,
              row[j],
              row[j - 1]
            );

      prev = temp;
    }
  }

  return row[n];
}

// ── Normalize text ─────────────────────────────────────────────────
function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

/**
 * Flexible speech matching for children
 */
export function isGoodEnough(
  recognized: string,
  target: string
): boolean {
  const t = normalize(target);

  if (!t) return false;

  const parts = recognized
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);

  const candidates = [
    normalize(recognized),
    ...parts,
  ];

  const extraCandidates: string[] = [];

  for (const r of candidates) {
    if (!r) continue;

    // leading vowel removal
    if (/^[aeiou]/.test(r)) {
      extraCandidates.push(r.slice(1));
    }

    // ST cluster
    if (t.startsWith("st")) {
      if (r.startsWith("ter")) {
        extraCandidates.push("st" + r.slice(1));
      }

      if (r.startsWith("toel")) {
        extraCandidates.push("stoel");
      }
    }

    // TW cluster
    if (t.startsWith("tw")) {
      if (r.startsWith("wee")) {
        extraCandidates.push("t" + r);
      }

      if (r.startsWith("ee")) {
        extraCandidates.push("tw" + r);
      }
    }

    // DR cluster
    if (t.startsWith("dr")) {
      if (r.startsWith("rie")) {
        extraCandidates.push("d" + r);
      }

      if (r.startsWith("rop")) {
        extraCandidates.push("d" + r);
      }

      if (r.startsWith("raak")) {
        extraCandidates.push("d" + r);
      }

      if (r.startsWith("room")) {
        extraCandidates.push("d" + r);
      }
    }

    // FR cluster
    if (t.startsWith("fr")) {
      if (r.startsWith("ruit")) {
        extraCandidates.push("f" + r);
      }
    }
  }

  const allCandidates = [
    ...candidates,
    ...extraCandidates,
  ];

  for (const r of allCandidates) {
    if (!r) continue;

    // exact
    if (r === t) {
      return true;
    }

    // contains
    if (
      r.includes(t) ||
      t.includes(r)
    ) {
      return true;
    }

    // prefix match
    const prefix = t.slice(
      0,
      Math.max(
        2,
        Math.floor(t.length * 0.7)
      )
    );

    if (
      t.length >= 4 &&
      r.startsWith(prefix)
    ) {
      return true;
    }

    // levenshtein
    const maxDist =
      t.length >= 6 ? 2 : 1;

    if (
      levenshtein(r, t) <= maxDist
    ) {
      return true;
    }
  }

  return false;
}

// ── Detect SpeechRecognition API ───────────────────────────────────
function getSpeechRecognitionClass():
  | (new () => SpeechRec)
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  const w =
    window as unknown as Record<
      string,
      unknown
    >;

  return (
    (w["SpeechRecognition"] ??
      w["webkitSpeechRecognition"] ??
      null) as new () => SpeechRec
  );
}

type OnResult = (
  matched: boolean,
  transcript: string
) => void;

// ── Hook ───────────────────────────────────────────────────────────
export function useRecognition() {
  const [listening, setListening] =
    useState(false);

  const listeningRef =
    useRef(false);

  const recRef =
    useRef<SpeechRec | null>(null);

  const supported =
    !!getSpeechRecognitionClass();

  const listen = useCallback(
    (
      onResult: OnResult,
      targetWord: string
    ) => {
      const SR =
        getSpeechRecognitionClass();

      if (
        !SR ||
        listeningRef.current
      ) {
        return;
      }

      recRef.current?.abort();

      const rec = new SR();

      recRef.current = rec;

      rec.lang = "nl-NL";
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 6;

      rec.onstart = () => {
        listeningRef.current = true;
        setListening(true);
      };

      let resultFired = false;

      rec.onresult = (
        e: SpeechResultEvent
      ) => {
        resultFired = true;

        listeningRef.current = false;

        setListening(false);

        const transcripts: string[] = [];

        for (
          let ri = 0;
          ri < e.results.length;
          ri++
        ) {
          const result =
            e.results[ri];

          for (
            let ai = 0;
            ai < result.length;
            ai++
          ) {
            transcripts.push(
              result[ai].transcript
            );
          }
        }

        const best =
          transcripts[0] ?? "";

        console.log(
          "Speech heard:",
          best
        );

        console.log(
          "Target word:",
          targetWord
        );

        const matched =
          transcripts.some((t) =>
            isGoodEnough(
              t,
              targetWord
            )
          );

        console.log(
          "Matched:",
          matched
        );

        onResult(matched, best);
      };

      rec.onerror = () => {
        resultFired = true;

        listeningRef.current = false;

        setListening(false);

        console.log(
          "Speech recognition error"
        );

        onResult(false, "");
      };

      rec.onend = () => {
        listeningRef.current = false;

        setListening(false);

        if (!resultFired) {
          resultFired = true;

          console.log(
            "No speech detected"
          );

          onResult(false, "");
        }
      };

      try {
        rec.start();
      } catch {
        listeningRef.current = false;

        setListening(false);

        console.log(
          "Speech recognition start failed"
        );
      }
    },
    []
  );

  const cancel = useCallback(() => {
    recRef.current?.abort();

    listeningRef.current = false;

    setListening(false);
  }, []);

  return {
    listen,
    cancel,
    listening,
    supported,
  };
}
