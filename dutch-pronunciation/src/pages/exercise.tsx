import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Volume2, Mic, MicOff } from "lucide-react";
import { useGameStore, getSessionWords, getLevelFromXP, type WordData } from "@/lib/store";
import { useSpeech } from "@/hooks/use-speech";
import { useRecognition } from "@/hooks/use-recognition";
import { playCoinSound } from "@/hooks/use-sound";
import { ACHIEVEMENTS } from "@/lib/achievements";

const COINS_PER_WORD = 1;
const XP_PER_WORD    = 5;

const ENCOURAGE = [
  "Super goed!", "Geweldig!", "Fantastisch!", "Toppertje!", "Bravo!",
  "Wauw!", "Prachtig!", "Knap gedaan!", "Helemaal top!", "Jij bent een ster!",
];

const CLUSTER_THEME: Record<string, {
  cardGrad: string; cardBorder: string; cardGlow: string;
  wordColor: string; clusterBadge: string;
}> = {
  sp: { cardGrad:"from-green-950 via-emerald-950 to-green-950",  cardBorder:"border-green-500/40",  cardGlow:"rgba(34,197,94,0.18)",   wordColor:"text-green-300",  clusterBadge:"bg-green-500/15 text-green-300 border-green-500/30" },
  bl: { cardGrad:"from-sky-950 via-blue-950 to-sky-950",         cardBorder:"border-sky-500/40",    cardGlow:"rgba(14,165,233,0.18)",   wordColor:"text-sky-300",    clusterBadge:"bg-sky-500/15 text-sky-300 border-sky-500/30" },
  br: { cardGrad:"from-orange-950 via-amber-950 to-orange-950",  cardBorder:"border-orange-500/40", cardGlow:"rgba(249,115,22,0.18)",   wordColor:"text-orange-300", clusterBadge:"bg-orange-500/15 text-orange-300 border-orange-500/30" },
  st: { cardGrad:"from-teal-950 via-cyan-950 to-teal-950",       cardBorder:"border-teal-500/40",   cardGlow:"rgba(20,184,166,0.18)",   wordColor:"text-teal-300",   clusterBadge:"bg-teal-500/15 text-teal-300 border-teal-500/30" },
  dr: { cardGrad:"from-amber-950 via-orange-950 to-amber-950",   cardBorder:"border-amber-500/40",  cardGlow:"rgba(245,158,11,0.18)",   wordColor:"text-amber-300",  clusterBadge:"bg-amber-500/15 text-amber-300 border-amber-500/30" },
  sl: { cardGrad:"from-pink-950 via-rose-950 to-pink-950",       cardBorder:"border-pink-500/40",   cardGlow:"rgba(236,72,153,0.18)",   wordColor:"text-pink-300",   clusterBadge:"bg-pink-500/15 text-pink-300 border-pink-500/30" },
  tw: { cardGrad:"from-purple-950 via-violet-950 to-purple-950", cardBorder:"border-purple-500/40", cardGlow:"rgba(168,85,247,0.18)",   wordColor:"text-purple-300", clusterBadge:"bg-purple-500/15 text-purple-300 border-purple-500/30" },
};

const DEFAULT_THEME = CLUSTER_THEME.sp;

interface Particle { id: number; x: number; y: number; size: number; color: string; rotate: number; star: boolean; }
interface FloatLabel { id: number; text: string; color: string; x: number; }

function burst(): Particle[] {
  const colors = ["#facc15","#fbbf24","#a855f7","#22d3ee","#34d399","#f472b6","#fb923c"];
  return Array.from({ length: 20 }, (_, i) => ({
    id: Date.now() + i,
    x: (Math.random() - 0.5) * 280,
    y: -(Math.random() * 240 + 50),
    size: Math.random() * 12 + 8,
    color: colors[i % colors.length],
    rotate: Math.random() * 360,
    star: Math.random() > 0.55,
  }));
}

function AchievementToast({ id, onDone }: { id: string; onDone: () => void }) {
  const a = ACHIEVEMENTS[id];
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  if (!a) return null;
  return (
    <motion.div
      initial={{ y: -100, opacity: 0, scale: 0.85 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -100, opacity: 0, scale: 0.85 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      className="absolute top-3 left-3 right-3 z-50"
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl
        bg-gradient-to-r from-yellow-500 to-amber-500 border-2 border-yellow-300/50">
        <span className="text-3xl shrink-0">{a.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-gray-900 font-black text-xs uppercase tracking-wider">Prestatie behaald!</div>
          <div className="text-gray-900 font-black text-base leading-tight">{a.label}</div>
        </div>
        <motion.span animate={{ rotate: [0,15,-15,0] }} transition={{ delay:0.3, duration:0.5 }} className="text-2xl shrink-0">🏆</motion.span>
      </div>
    </motion.div>
  );
}

export default function Exercise() {
  const [, setLocation] = useLocation();
  const store = useGameStore();
  const { difficulty, customWords, session, advanceWord, recordWordError } = store;

  const mountedWithSession = useRef(!!session);
  useEffect(() => { if (!mountedWithSession.current) setLocation("/"); }, []); // eslint-disable-line

  const [particles, setParticles]     = useState<Particle[]>([]);
  const [floats, setFloats]           = useState<FloatLabel[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [encourage, setEncourage]     = useState("");
  const [wordShake, setWordShake]     = useState(false);
  const [noMatch, setNoMatch]         = useState(false);
  const [toastQueue, setToastQueue]   = useState<string[]>([]);

  const { speak, speaking }                               = useSpeech();
  const { listen, cancel: cancelListening, listening,
          supported: recognitionSupported }               = useRecognition();
  const lockRef              = useRef(false);
  const listenAfterSpeakRef  = useRef(false);
  const listenTargetRef      = useRef("");
  const prevSpeakingRef      = useRef(false);

  useEffect(() => () => { lockRef.current = false; }, []);

  const seenAchievementsRef = useRef(new Set(session?.achievementsUnlockedInSession ?? []));

  const words        = getSessionWords(difficulty, customWords);
  const currentIndex = session?.currentWordIndex ?? 0;
  const totalWords   = words.length;
  const isFinished   = currentIndex >= totalWords;
  const currentWord: WordData | undefined = words[currentIndex];

  const progressPct = totalWords > 0 ? (currentIndex / totalWords) * 100 : 0;
  const theme = CLUSTER_THEME[currentWord?.cluster ?? difficulty] ?? DEFAULT_THEME;

  useEffect(() => { if (totalWords === 0) setLocation("/"); }, [totalWords, setLocation]);
  useEffect(() => {
    if (!isFinished) return;
    const t = setTimeout(() => setLocation("/reward"), 800);
    return () => clearTimeout(t);
  }, [isFinished, setLocation]);

  // Auto-speak on word change, then immediately arm listening
  useEffect(() => {
    if (!currentWord) return;
    listenAfterSpeakRef.current = false; // clear stale intent
    const t = setTimeout(() => {
      listenTargetRef.current     = currentWord.word;
      listenAfterSpeakRef.current = recognitionSupported;
      speak(currentWord.word);
    }, 380);
    return () => clearTimeout(t);
  }, [currentWord?.word]); // eslint-disable-line

  // When TTS finishes, start listening if armed
  useEffect(() => {
    const wasSpeaking = prevSpeakingRef.current;
    prevSpeakingRef.current = speaking;

    if (!wasSpeaking || speaking || showSuccess || lockRef.current) return;

    if (listenAfterSpeakRef.current) {
      listenAfterSpeakRef.current = false;
      const target = listenTargetRef.current;
      if (target && recognitionSupported) {
        listen((matched) => {
          if (matched) {
            triggerSuccess();
          } else if (!lockRef.current) {
            recordWordError(target);
            setNoMatch(true);
            setTimeout(() => setNoMatch(false), 2000);
          }
        }, target);
      }
    }
  }, [speaking]); // eslint-disable-line

  // Achievement toasts
  useEffect(() => {
    const sessionAchievements = session?.achievementsUnlockedInSession ?? [];
    const newOnes = sessionAchievements.filter(id => !seenAchievementsRef.current.has(id));
    if (newOnes.length > 0) {
      newOnes.forEach(id => seenAchievementsRef.current.add(id));
      setToastQueue(q => [...q, ...newOnes]);
    }
  }, [session?.achievementsUnlockedInSession]);

  const dismissToast = useCallback(() => setToastQueue(q => q.slice(1)), []);

  /** Shared success handler — called by recognition match OR "Ik deed het!" button */
  function triggerSuccess() {
    if (!currentWord || showSuccess || lockRef.current) return;
    lockRef.current = true;
    playCoinSound();
    setShowSuccess(true);
    setWordShake(true);
    setEncourage(ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)]);
    setParticles(burst());
    setFloats([
      { id: Date.now(),     text: `+${COINS_PER_WORD}`,  color: "#facc15", x: -48 },
      { id: Date.now() + 1, text: `+${XP_PER_WORD} XP`, color: "#c084fc", x: 48  },
    ]);
    void getLevelFromXP;
    setTimeout(() => setWordShake(false), 380);
    setTimeout(() => {
      advanceWord(COINS_PER_WORD, XP_PER_WORD);
      setShowSuccess(false);
      setParticles([]);
      setFloats([]);
      setEncourage("");
      setNoMatch(false);
      lockRef.current = false;
    }, 1000);
  }

  /** "Zeg het!" — speak the word once, then listen */
  const handleSayIt = useCallback(() => {
    if (!currentWord || showSuccess) return;
    if (listening) {
      cancelListening();
      return;
    }
    listenAfterSpeakRef.current = recognitionSupported;
    listenTargetRef.current     = currentWord.word;
    speak(currentWord.word);
  }, [currentWord, showSuccess, listening, cancelListening, speak, recognitionSupported]);

  function handleBack() {
    cancelListening();
    setLocation("/");
  }

  // ── Early returns ─────────────────────────────────────────────
  if (!mountedWithSession.current) return <div className="min-h-screen min-h-[100dvh] bg-background" />;

  if (isFinished) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-background">
        <motion.div animate={{ scale:[1,1.18,1], rotate:[0,8,-8,0] }} transition={{ repeat:Infinity, duration:0.85 }} className="text-8xl select-none">🎉</motion.div>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="text-white/50 font-black text-xl">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center bg-background px-4 pt-5 pb-6 relative overflow-hidden">

      {/* Achievement toasts */}
      <AnimatePresence>
        {toastQueue[0] && <AchievementToast key={toastQueue[0]} id={toastQueue[0]} onDone={dismissToast} />}
      </AnimatePresence>

      {/* ── Header ──────────────────────────────── */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm flex items-center gap-3 mb-5 shrink-0"
      >
        <button
          onClick={handleBack}
          data-testid="button-back"
          className="w-12 h-12 rounded-2xl bg-white/10 border-2 border-white/15 flex items-center justify-center
            active:scale-90 transition-transform touch-manipulation shrink-0"
          aria-label="Terug naar home"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex-1 min-w-0" data-testid="progress-indicator">
          <div className="relative h-3 bg-white/10 rounded-full overflow-hidden border border-white/8">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500"
              animate={{ width: `${progressPct}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 18 }}
            />
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)" }}
              animate={{ x: ["-100%","200%"] }}
              transition={{ duration:2, repeat:Infinity, repeatDelay:2, ease:"easeInOut" }}
            />
          </div>
          <div className="text-white/35 text-xs font-black mt-1 text-center tracking-widest">
            {currentIndex} / {totalWords}
          </div>
        </div>

        <div className={`shrink-0 px-3 py-1.5 rounded-full border font-black text-xs uppercase tracking-wider ${theme.clusterBadge}`} data-testid="cluster-badge">
          {currentWord.cluster}
        </div>
      </motion.div>

      {/* ── Illustration card ───────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentWord.word + "-card"}
          initial={{ scale:0.78, opacity:0, y:24 }}
          animate={{ scale:1, opacity:1, y:0 }}
          exit={{ scale:0.78, opacity:0, y:-24 }}
          transition={{ type:"spring", stiffness:260, damping:24 }}
          className={`w-full max-w-sm rounded-3xl bg-gradient-to-br ${theme.cardGrad} border-2 ${theme.cardBorder}
            flex flex-col items-center justify-center mb-5 relative overflow-hidden shrink-0`}
          style={{
            height: 220,
            boxShadow: `0 0 40px ${theme.cardGlow}, 0 20px 40px rgba(0,0,0,0.4)`,
            outline: noMatch ? "2px solid rgba(239,68,68,0.6)" : undefined,
          }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 50% 40%, ${theme.cardGlow} 0%, transparent 65%)` }}
          />

          <motion.div
            animate={{ y: showSuccess ? [0,-12,0] : [0,-6,0] }}
            transition={{ duration: showSuccess ? 0.35 : 2.8, repeat: showSuccess ? 0 : Infinity, ease:"easeInOut" }}
            className="text-[100px] leading-none drop-shadow-2xl z-10 select-none"
            aria-hidden="true"
          >
            {currentWord.emoji}
          </motion.div>

          {currentWord.translation && (
            <div className="text-white/45 font-bold text-sm mt-1.5 z-10 tracking-wide">{currentWord.translation}</div>
          )}

          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity:0, scale:0.85 }}
                animate={{ opacity:[0,0.8,0], scale:[0.85,1.05,1.2] }}
                exit={{ opacity:0 }}
                transition={{ duration:0.55 }}
                className="absolute inset-0 rounded-3xl border-[3px] border-yellow-300 pointer-events-none"
              />
            )}
            {noMatch && (
              <motion.div
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                exit={{ opacity:0 }}
                className="absolute inset-0 rounded-3xl border-[3px] border-red-400/60 pointer-events-none"
              />
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* ── Word display + float labels ─────────── */}
      <div className="relative w-full max-w-sm flex justify-center mb-2 shrink-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWord.word + "-text"}
            initial={{ opacity:0, scale:0.82, y:14 }}
            animate={wordShake
              ? { opacity:1, scale:[1,1.09,0.97,1.05,1], rotate:[0,-5,5,-2,0], y:0 }
              : noMatch
                ? { opacity:1, scale:[1,1.03,1,1.03,1], rotate:[0,-3,3,-2,0], y:0 }
                : { opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.82, y:-14 }}
            transition={{ type:"spring", stiffness:340, damping:26 }}
            className="text-center"
            data-testid="word-display"
          >
            <div
              className={`font-black tracking-[0.12em] uppercase drop-shadow-lg ${theme.wordColor}`}
              style={{ fontSize:"clamp(2.8rem, 13vw, 5.2rem)" }}
            >
              {currentWord.word.split("").map((letter, i) => {
                const isCluster = i < currentWord.cluster.length;
                return (
                  <motion.span
                    key={i}
                    className={isCluster ? "text-yellow-300" : ""}
                    animate={showSuccess && isCluster
                      ? { scale:[1,1.45,1], filter:["drop-shadow(0 0 0px #facc15)","drop-shadow(0 0 12px #facc15)","drop-shadow(0 0 0px #facc15)"] }
                      : {}}
                    transition={{ delay:i * 0.05, duration:0.4 }}
                  >
                    {letter}
                  </motion.span>
                );
              })}
            </div>
            {currentWord.translation && (
              <div className="text-white/35 font-bold text-sm mt-1 tracking-wide">{currentWord.translation}</div>
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {floats.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity:0, y:0, x:f.x, scale:0.6 }}
              animate={{ opacity:[0,1,1,0], y:-90, scale:[0.6,1.35,1.1,0.9] }}
              exit={{ opacity:0 }}
              transition={{ duration:0.95, ease:"easeOut" }}
              className="absolute top-0 font-black text-xl pointer-events-none drop-shadow-lg z-30"
              style={{ color:f.color }}
              aria-hidden="true"
            >
              {f.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Particle burst ──────────────────────── */}
      <div className="relative w-full flex justify-center shrink-0" style={{ height:0 }}>
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x:0, y:0, scale:1, opacity:1, rotate:0 }}
              animate={{ x:p.x, y:p.y, scale:0, opacity:0, rotate:p.rotate }}
              exit={{ opacity:0 }}
              transition={{ duration:0.85, ease:"easeOut" }}
              className="absolute pointer-events-none z-20 select-none"
              style={{ width:p.size, height:p.size, backgroundColor:p.star ? undefined : p.color, borderRadius:p.star ? undefined : "50%", fontSize:p.size, lineHeight:1 }}
              aria-hidden="true"
            >
              {p.star ? "⭐" : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Feedback / encouragement ─────────────── */}
      <div className="h-9 flex items-center justify-center shrink-0">
        <AnimatePresence mode="wait">
          {encourage && (
            <motion.div key="encourage"
              initial={{ opacity:0, scale:0.65, y:8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.85 }}
              transition={{ type:"spring", stiffness:420, damping:22 }}
              className="font-black text-xl text-yellow-300 drop-shadow-lg" aria-live="polite"
            >
              {encourage}
            </motion.div>
          )}
          {!encourage && noMatch && (
            <motion.div key="nomatch"
              initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              className="font-black text-base text-orange-400" aria-live="polite"
            >
              Probeer het nog eens!
            </motion.div>
          )}
          {!encourage && !noMatch && listening && (
            <motion.div key="listening-hint"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="font-bold text-sm text-purple-300/70" aria-live="polite"
            >
              Zeg het woord na…
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Action buttons ──────────────────────── */}
      <div className="w-full max-w-sm flex flex-col gap-3 mt-auto shrink-0">

        {/* Zeg het! — speaks + listens */}
        <motion.button
          whileTap={speaking || showSuccess ? {} : { scale:0.96, y:2 }}
          onClick={handleSayIt}
          disabled={speaking || showSuccess}
          data-testid="button-say-it"
          className={`w-full py-5 rounded-3xl font-black text-xl uppercase tracking-wider select-none touch-manipulation
            transition-colors relative overflow-hidden
            ${listening
              ? "bg-gradient-to-br from-purple-500 to-violet-600 border-b-[4px] border-purple-800 text-white"
              : speaking
                ? "bg-gradient-to-br from-cyan-300 to-teal-400 border-b-2 border-teal-600 text-gray-900"
                : "bg-gradient-to-br from-cyan-500 to-teal-500 border-b-4 border-teal-700 text-gray-900 active:border-b-0"}`}
          aria-label={listening ? "Luisteren — tik om te stoppen" : "Hoor het woord en spreek na"}
        >
          {/* Shimmer for default state */}
          {!speaking && !listening && !showSuccess && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background:"linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)" }}
              animate={{ x:["-100%","200%"] }}
              transition={{ duration:2.8, repeat:Infinity, repeatDelay:1.5 }}
              aria-hidden="true"
            />
          )}
          {/* Pulse ring while listening */}
          {listening && (
            <motion.div
              className="absolute inset-0 rounded-3xl border-2 border-white/40 pointer-events-none"
              animate={{ scale:[1, 1.03, 1], opacity:[0.6, 1, 0.6] }}
              transition={{ duration:1.1, repeat:Infinity }}
              aria-hidden="true"
            />
          )}

          <span className="relative z-10 flex items-center justify-center gap-3">
            {speaking ? (
              <>
                <span className="flex items-end gap-0.5 h-6" aria-hidden="true">
                  {[0,1,2,3,4].map((i) => (
                    <motion.span key={i} className="w-1.5 rounded-full bg-gray-900"
                      animate={{ height:["25%","100%","25%"] }}
                      transition={{ duration:0.6, repeat:Infinity, delay:i*0.1, ease:"easeInOut" }}
                      style={{ minHeight:4 }}
                    />
                  ))}
                </span>
                Spreekt...
              </>
            ) : listening ? (
              <>
                <motion.div animate={{ scale:[1,1.25,1] }} transition={{ duration:0.7, repeat:Infinity }}>
                  <Mic className="w-6 h-6" />
                </motion.div>
                Luisteren...
              </>
            ) : (
              <>
                <Volume2 className="w-6 h-6" />
                Zeg het!
              </>
            )}
          </span>
        </motion.button>

        {/* Ik deed het! — manual override / skip */}
        <motion.button
          whileTap={showSuccess ? {} : { scale:0.96, y:2 }}
          onClick={triggerSuccess}
          disabled={showSuccess}
          data-testid="button-did-it"
          animate={showSuccess ? { scale:[1,1.03,1] } : {}}
          transition={{ duration:0.3 }}
          className={`w-full py-5 rounded-3xl font-black text-xl uppercase tracking-wider select-none touch-manipulation
            relative overflow-hidden transition-colors
            ${showSuccess
              ? "bg-gradient-to-br from-green-400 to-emerald-500 border-b-2 border-green-700 text-gray-900"
              : "bg-gradient-to-br from-yellow-400 to-amber-500 border-b-4 border-amber-700 text-gray-900 active:border-b-0"}`}
          aria-label="Ik heb het woord uitgesproken"
        >
          {!showSuccess && (
            <motion.div className="absolute inset-0 pointer-events-none"
              style={{ background:"linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)" }}
              animate={{ x:["-100%","200%"] }}
              transition={{ duration:2.5, repeat:Infinity, repeatDelay:0.8 }}
              aria-hidden="true"
            />
          )}
          <span className="relative z-10">{showSuccess ? "Super goed! 🎉" : "Ik deed het!"}</span>
        </motion.button>

        {/* Recognition not available notice */}
        {!recognitionSupported && (
          <div className="flex items-center justify-center gap-1.5 text-white/20 text-xs font-bold">
            <MicOff className="w-3 h-3" />
            <span>Spraakherkenning niet beschikbaar in deze browser</span>
          </div>
        )}
      </div>

      {/* Screen flash */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:[0,0.14,0] }} exit={{ opacity:0 }}
            transition={{ duration:0.4 }}
            className="absolute inset-0 bg-yellow-200 pointer-events-none"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
