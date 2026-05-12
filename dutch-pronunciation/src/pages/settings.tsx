import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, CheckCircle2, AlertCircle, RotateCcw, User } from "lucide-react";
import { useGameStore, detectCluster, customWordToWordData } from "@/lib/store";

const CLUSTER_META: Record<string, { label: string; badge: string; color: string }> = {
  sp: { label: "SP", badge: "bg-green-500/20 text-green-300 border border-green-500/30",   color: "#4ade80" },
  bl: { label: "BL", badge: "bg-sky-500/20 text-sky-300 border border-sky-500/30",         color: "#38bdf8" },
  br: { label: "BR", badge: "bg-orange-500/20 text-orange-300 border border-orange-500/30",color: "#fb923c" },
  st: { label: "ST", badge: "bg-teal-500/20 text-teal-300 border border-teal-500/30",      color: "#2dd4bf" },
  dr: { label: "DR", badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30",   color: "#fbbf24" },
  sl: { label: "SL", badge: "bg-pink-500/20 text-pink-300 border border-pink-500/30",      color: "#f472b6" },
  tw: { label: "TW", badge: "bg-purple-500/20 text-purple-300 border border-purple-500/30",color: "#c084fc" },
};

const ALL_CLUSTERS = ["sp","bl","br","st","dr","sl","tw"] as const;

export default function Settings() {
  const [, setLocation] = useLocation();
  const { customWords, setCustomWords, childName, setChildName, resetProgress, wordErrors, clearWordErrors } = useGameStore();
  const [newWord, setNewWord]           = useState("");
  const [justAdded, setJustAdded]       = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [justReset, setJustReset]       = useState(false);
  const [nameInput, setNameInput]       = useState(childName);

  const trimmed   = newWord.trim().toLowerCase();
  const cluster   = trimmed ? detectCluster(trimmed) : null;
  const isDupe    = customWords.includes(trimmed);
  const isInvalid = trimmed.length > 0 && !cluster;
  const canAdd    = trimmed.length > 0 && !!cluster && !isDupe;

  function handleAddWord() {
    if (!canAdd) return;
    const wd = customWordToWordData(trimmed);
    if (!wd) return;
    setCustomWords([...customWords, trimmed]);
    setJustAdded(trimmed);
    setNewWord("");
    setTimeout(() => setJustAdded(""), 2200);
  }

  function handleRemoveWord(word: string) {
    setCustomWords(customWords.filter(w => w !== word));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAddWord();
  }

  function handleReset() {
    resetProgress();
    setConfirmReset(false);
    setJustReset(true);
    setTimeout(() => setJustReset(false), 2400);
  }

  // Group custom words by cluster
  const grouped = customWords.reduce<Record<string, string[]>>((acc, w) => {
    const c = detectCluster(w) ?? "?";
    if (!acc[c]) acc[c] = [];
    acc[c].push(w);
    return acc;
  }, {});

  // Error overview — sorted descending by count, top 12
  const sortedErrors = Object.entries(wordErrors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12);
  const maxErrors = sortedErrors[0]?.[1] ?? 1;
  const hasErrors = sortedErrors.length > 0;

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col bg-background px-4 py-6 overflow-y-auto">

      {/* ── Header ─────────────────────────────────── */}
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-4 mb-8"
      >
        <button
          onClick={() => setLocation("/")}
          data-testid="button-back-settings"
          className="w-12 h-12 rounded-2xl bg-white/10 border-2 border-white/15 flex items-center justify-center
            active:scale-90 transition-transform touch-manipulation shrink-0"
          aria-label="Terug naar home"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <div className="font-black text-2xl text-white tracking-tight">Instellingen</div>
          <div className="text-white/40 text-sm font-bold">Voor ouders</div>
        </div>
      </motion.div>

      {/* ── Child name ───────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="mb-8"
        aria-label="Naam van het kind instellen"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 rounded-full bg-yellow-400" />
          <span className="font-black text-white text-base uppercase tracking-widest">Naam speler</span>
        </div>
        <p className="text-white/40 text-sm font-bold mb-4 ml-3">
          Wordt getoond op het startscherm als persoonlijk welkom.
        </p>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => setChildName(nameInput.trim())}
              onKeyDown={(e) => { if (e.key === "Enter") { setChildName(nameInput.trim()); (e.target as HTMLInputElement).blur(); } }}
              placeholder="Naam van uw kind…"
              maxLength={24}
              data-testid="input-child-name"
              className="w-full bg-white/[0.08] border-2 border-white/15 focus:border-yellow-400/50
                rounded-2xl pl-10 pr-4 py-3.5 text-white font-bold
                placeholder:text-white/25 focus:outline-none transition-colors"
            />
          </div>

          <AnimatePresence>
            {nameInput.trim() && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="flex items-center px-4 rounded-2xl shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(139,92,246,0.22), rgba(99,102,241,0.15))",
                  border: "1px solid rgba(167,139,250,0.28)",
                }}
              >
                <span className="font-black text-sm text-purple-300 whitespace-nowrap">
                  Hoi, {nameInput.trim()}!
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* ── Error overview ───────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07 }}
        className="mb-8"
        aria-label="Foutenoverzicht per woord"
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-red-400" />
            <span className="font-black text-white text-base uppercase tracking-widest">Foutenoverzicht</span>
          </div>
          {hasErrors && (
            <button
              onClick={clearWordErrors}
              className="text-xs font-black text-red-400/70 hover:text-red-400 transition-colors
                px-2.5 py-1 rounded-xl border border-red-400/20 hover:border-red-400/40 touch-manipulation"
              aria-label="Foutenoverzicht wissen"
            >
              Wis overzicht
            </button>
          )}
        </div>
        <p className="text-white/40 text-sm font-bold mb-4 ml-3">
          Woorden waar uw kind de meeste moeite mee had.
        </p>

        {hasErrors ? (
          <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-4 flex flex-col gap-2.5">
            {sortedErrors.map(([word, count]) => {
              const cl = detectCluster(word);
              const meta = cl ? CLUSTER_META[cl] : null;
              const barPct = Math.max(8, (count / maxErrors) * 100);
              return (
                <div key={word} className="flex items-center gap-3">
                  {/* Cluster badge */}
                  {meta && (
                    <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider
                      px-1.5 py-0.5 rounded-full border ${meta.badge}`}>
                      {meta.label}
                    </span>
                  )}

                  {/* Word */}
                  <span className="font-black text-white/85 text-sm w-24 shrink-0 truncate">
                    {word}
                  </span>

                  {/* Bar */}
                  <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: meta ? `linear-gradient(90deg, ${meta.color}cc, ${meta.color})` : "#f87171" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${barPct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                    />
                  </div>

                  {/* Count */}
                  <span className="text-white/35 text-xs font-black shrink-0 w-8 text-right">
                    {count}×
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.04] border border-white/8 px-4 py-6 text-center">
            <div className="text-3xl mb-2 select-none">🎉</div>
            <div className="text-white/30 font-bold text-sm">Nog geen fouten geregistreerd</div>
            <div className="text-white/20 text-xs mt-1">Fouten worden bijgehouden zodra uw kind gaat oefenen</div>
          </div>
        )}
      </motion.section>

      {/* ── Custom words ─────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mb-8"
        aria-label="Extra oefenwoorden toevoegen"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 rounded-full bg-yellow-400" />
          <span className="font-black text-white text-base uppercase tracking-widest">Extra woorden</span>
        </div>
        <p className="text-white/40 text-sm font-bold mb-4 ml-3">
          Eigen woorden die beginnen met{" "}
          <span className="text-green-400">sp</span>,{" "}
          <span className="text-sky-400">bl</span>,{" "}
          <span className="text-orange-400">br</span>,{" "}
          <span className="text-teal-400">st</span>,{" "}
          <span className="text-amber-400">dr</span>,{" "}
          <span className="text-pink-400">sl</span> of{" "}
          <span className="text-purple-400">tw</span>{" "}
          worden automatisch aan de juiste ronde toegevoegd.
        </p>

        {/* Input row */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Typ een woord (sp-, bl-, br-, st-, dr-, sl-, tw-)..."
              data-testid="input-custom-word"
              className={`w-full bg-white/[0.08] border-2 rounded-2xl px-4 py-3.5 text-white font-bold
                placeholder:text-white/25 focus:outline-none transition-colors
                ${isInvalid  ? "border-red-400/60 focus:border-red-400"
                : isDupe     ? "border-amber-400/60 focus:border-amber-400"
                : cluster    ? "border-green-400/50 focus:border-green-400"
                : "border-white/15 focus:border-yellow-400/50"}`}
            />
            <AnimatePresence>
              {cluster && !isDupe && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-full text-xs font-black uppercase
                    ${CLUSTER_META[cluster]?.badge ?? ""}`}
                >
                  {cluster.toUpperCase()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={canAdd ? { scale: 0.9 } : {}}
            onClick={handleAddWord}
            disabled={!canAdd}
            data-testid="button-add-word"
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0 touch-manipulation transition-all
              ${canAdd
                ? "bg-yellow-400 border-b-4 border-yellow-700 active:border-b-0 active:translate-y-px"
                : "bg-white/10 border-b-4 border-white/5 opacity-40 cursor-not-allowed"}`}
            aria-label="Woord toevoegen"
          >
            <Plus className={`w-6 h-6 ${canAdd ? "text-gray-900" : "text-white/50"}`} />
          </motion.button>
        </div>

        {/* Validation messages */}
        <AnimatePresence>
          {isInvalid && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2 text-red-400 text-sm font-bold mb-3"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              Dit woord begint niet met sp, bl, br, st, dr, sl of tw.
            </motion.div>
          )}
          {isDupe && trimmed && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2 text-amber-400 text-sm font-bold mb-3"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              Dit woord staat er al in.
            </motion.div>
          )}
          {justAdded && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2 text-green-400 text-sm font-bold mb-3"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span><strong>"{justAdded}"</strong> is toegevoegd!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Words grouped by cluster */}
        {customWords.length > 0 ? (
          <div className="flex flex-col gap-4">
            {ALL_CLUSTERS.map((c) => {
              const clusterWords = grouped[c];
              if (!clusterWords?.length) return null;
              const meta = CLUSTER_META[c];
              return (
                <div key={c}>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black
                    uppercase tracking-wider mb-2 ${meta.badge}`}>
                    {meta.label}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {clusterWords.map((word) => (
                      <motion.div
                        key={word}
                        layout
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 24 }}
                        className="flex items-center gap-2 bg-white/[0.08] border border-white/15 rounded-2xl px-3 py-2"
                        data-testid={`word-tag-${word}`}
                      >
                        <span className="text-white font-bold text-sm">{word}</span>
                        <button
                          onClick={() => handleRemoveWord(word)}
                          data-testid={`button-remove-${word}`}
                          className="text-white/35 active:text-red-400 transition-colors touch-manipulation"
                          aria-label={`Verwijder ${word}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.04] border border-white/8 px-4 py-6 text-center">
            <div className="text-3xl mb-2 select-none">📝</div>
            <div className="text-white/30 font-bold text-sm">Nog geen extra woorden</div>
            <div className="text-white/20 text-xs mt-1">Begin met sp-, bl-, br-, st-, dr-, sl- of tw-</div>
          </div>
        )}
      </motion.section>

      {/* ── Reset progress ───────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="mb-8"
        aria-label="Voortgang resetten"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full bg-yellow-400" />
          <span className="font-black text-white text-base uppercase tracking-widest">Voortgang</span>
        </div>

        <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-black text-white text-sm mb-1">Punten op nul zetten</div>
              <p className="text-white/40 text-xs font-bold leading-relaxed">
                Munten, XP en level worden gewist. Het foutenoverzicht blijft bewaard.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {!confirmReset && !justReset && (
                <motion.button
                  key="reset-btn"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setConfirmReset(true)}
                  data-testid="button-reset-progress"
                  className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl
                    bg-red-500/15 border border-red-500/30 text-red-400
                    font-black text-sm touch-manipulation active:bg-red-500/25 transition-colors"
                  aria-label="Voortgang resetten"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </motion.button>
              )}

              {confirmReset && (
                <motion.div
                  key="confirm-row"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="flex items-center gap-2 shrink-0"
                >
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white/60 font-black text-xs touch-manipulation"
                  >
                    Annuleer
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={handleReset}
                    data-testid="button-confirm-reset"
                    className="px-3 py-2 rounded-xl bg-red-500 border-b-4 border-red-800
                      active:border-b-0 active:translate-y-px text-white font-black text-xs touch-manipulation"
                  >
                    Ja, wis alles
                  </motion.button>
                </motion.div>
              )}

              {justReset && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-green-400 font-black text-sm shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Gewist!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      {/* ── Cluster info ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.24 }}
        className="rounded-2xl bg-yellow-400/8 border border-yellow-400/20 p-4 mb-6"
      >
        <div className="font-black text-yellow-300 text-sm mb-1.5">Klankgroepen</div>
        <ul className="text-white/45 text-xs font-bold space-y-1">
          <li>· <span className="text-green-400">sp</span> — spin, spook, speelgoed…</li>
          <li>· <span className="text-sky-400">bl</span> — blad, bloem, blauw…</li>
          <li>· <span className="text-orange-400">br</span> — brood, brug, bruin…</li>
          <li>· <span className="text-teal-400">st</span> — ster, stoel, storm…</li>
          <li>· <span className="text-amber-400">dr</span> — draak, droom, druif…</li>
          <li>· <span className="text-pink-400">sl</span> — slang, sleutel, slapen…</li>
          <li>· <span className="text-purple-400">tw</span> — twee, twijg, tweeling…</li>
        </ul>
      </motion.div>
    </div>
  );
}
