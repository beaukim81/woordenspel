import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { useGameStore, getLevelFromXP } from "@/lib/store";
import { getLevelTitle, ACHIEVEMENTS } from "@/lib/achievements";
import { useCountUp } from "@/hooks/use-count-up";

const HEADLINES = ["Geweldig!", "Fantastisch!", "Super goed!", "Bravo!", "Toppertje!", "Wauw!"];
const SUBS = ["Ronde afgerond!", "Jij bent een ster!", "Zo goed!", "Houd zo vol!", "Je bent geweldig!"];

// Confetti pieces — stable across renders
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  color: ["#facc15", "#f59e0b", "#a855f7", "#22d3ee", "#34d399", "#f472b6", "#fb923c", "#60a5fa"][i % 8],
  top:  ((i * 41 + 7) % 94) + 2,
  left: ((i * 67 + 13) % 90) + 4,
  size: 5 + (i % 5) * 4,
  dur:  1.1 + (i % 6) * 0.22,
  delay: i * 0.055,
  round: i % 3 === 0,
}));

function StatCard({
  emoji, value, label, delay,
  testId, gradient, border,
}: {
  emoji: string; value: string; label: string; delay: number;
  testId: string; gradient: string; border: string;
}) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 240, damping: 22 }}
      className={`rounded-3xl bg-gradient-to-br ${gradient} border-2 ${border} p-5 text-center`}
      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
      data-testid={testId}
    >
      <div className="text-4xl mb-2 select-none" aria-hidden="true">{emoji}</div>
      <div className="font-black text-3xl leading-none mb-1">{value}</div>
      <div className="text-white/45 text-xs font-black uppercase tracking-widest">{label}</div>
    </motion.div>
  );
}

export default function Reward() {
  const [, setLocation] = useLocation();
  const { session, coins, xp, endSession } = useGameStore();
  const level      = getLevelFromXP(xp);
  const levelTitle = getLevelTitle(level);

  // Snapshot session at mount — it becomes null after endSession()
  const snap = useRef({
    sessionCoins:        session?.sessionCoins        ?? 0,
    sessionXP:           session?.sessionXP           ?? 0,
    leveledUp:           session?.leveledUp           ?? false,
    sessionAchievements: session?.achievementsUnlockedInSession ?? [] as string[],
    hadSession:          !!session,
  }).current;

  useEffect(() => {
    if (!snap.hadSession) setLocation("/");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const headline = useMemo(() => HEADLINES[Math.floor(Math.random() * HEADLINES.length)], []);
  const sub      = useMemo(() => SUBS[Math.floor(Math.random() * SUBS.length)], []);

  const displayCoins = useCountUp(snap.sessionCoins, 900, 500);
  const displayXP    = useCountUp(snap.sessionXP,    800, 620);
  const displayTotal = useCountUp(coins,              750, 740);

  const starCount = Math.min(5, Math.max(1, Math.round((snap.sessionCoins / 50) * 5)));

  function handleContinue() {
    endSession();
    setLocation("/");
  }

  if (!snap.hadSession) return <div className="min-h-screen min-h-[100dvh] bg-background" />;

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center bg-background px-4 pt-8 pb-8 relative overflow-y-auto">

      {/* Confetti (fixed so it covers whole screen but doesn't block taps) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {CONFETTI.map((p) => (
          <motion.div
            key={p.id}
            className="absolute"
            style={{
              width: p.size, height: p.size,
              backgroundColor: p.color,
              top: `${p.top}%`, left: `${p.left}%`,
              borderRadius: p.round ? "50%" : "3px",
            }}
            initial={{ scale: 0, opacity: 0, rotate: 0, y: 0 }}
            animate={{
              scale:   [0, 1.6, 1.2, 0],
              opacity: [0, 1,   1,   0],
              rotate:  [0, 200, 360],
              y:       [0, -30,  0, 30],
            }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, repeatDelay: 2 }}
          />
        ))}
      </div>

      {/* ── Trophy ──────────────────────────────── */}
      <motion.div
        initial={{ scale: 0, rotate: -30, y: -40 }}
        animate={{ scale: 1, rotate: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.05 }}
        className="text-[100px] mb-2 drop-shadow-2xl select-none shrink-0"
        style={{ filter: "drop-shadow(0 0 32px rgba(250,204,21,0.5))" }}
        aria-hidden="true"
      >
        🏆
      </motion.div>

      {/* ── Headline ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-5 shrink-0"
      >
        <div
          className="font-black uppercase tracking-wide drop-shadow-lg leading-tight"
          style={{
            fontSize: "clamp(2rem, 11vw, 3.5rem)",
            background: "linear-gradient(135deg, #fde68a, #facc15, #f59e0b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {headline}
        </div>
        <div className="text-white/50 font-bold text-base mt-1">{sub}</div>
      </motion.div>

      {/* ── Stars ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
        className="flex gap-2 mb-6 shrink-0"
        aria-label={`${starCount} van 5 sterren`}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, rotate: -45, y: 20 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            transition={{ delay: 0.38 + i * 0.09, type: "spring", stiffness: 360, damping: 20 }}
          >
            <motion.div
              animate={i < starCount ? { scale: [1, 1.28, 1] } : {}}
              transition={{ delay: 0.56 + i * 0.09, duration: 0.35 }}
            >
              <Star
                className={`w-11 h-11 ${i < starCount
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-white/10 fill-white/5"}`}
                style={i < starCount ? { filter: "drop-shadow(0 0 8px rgba(250,204,21,0.8))" } : undefined}
              />
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Stat cards ──────────────────────────── */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-4 mb-4 shrink-0">
        <StatCard
          emoji="🪙" value={`+${displayCoins}`} label="Munten"
          delay={0.34} testId="reward-coins"
          gradient="from-yellow-900/70 to-amber-950/60"
          border="border-yellow-500/30"
        />
        <StatCard
          emoji="⚡" value={`+${displayXP}`} label="XP"
          delay={0.4} testId="reward-xp"
          gradient="from-purple-900/70 to-violet-950/60"
          border="border-purple-500/30"
        />
      </div>

      {/* ── Totals + level row ──────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.46 }}
        className="w-full max-w-sm rounded-3xl bg-white/[0.06] border border-white/10 px-6 py-4 mb-4 shrink-0"
      >
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="font-black text-2xl text-yellow-300 tabular-nums">{displayTotal}</div>
            <div className="text-white/30 text-xs font-black uppercase tracking-widest mt-0.5">Totaal</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <motion.div
              className="font-black text-xl text-purple-300"
              animate={snap.leveledUp ? { scale: [1, 1.3, 1], color: ["#c084fc", "#facc15", "#c084fc"] } : {}}
              transition={{ delay: 1, duration: 0.6 }}
            >
              Level {level}
            </motion.div>
            <div className="text-white/30 text-xs font-black uppercase tracking-widest mt-0.5">{levelTitle}</div>
          </div>
        </div>
      </motion.div>

      {/* ── Session achievements ─────────────────── */}
      <AnimatePresence>
        {snap.sessionAchievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.52 }}
            className="w-full max-w-sm mb-4 shrink-0"
          >
            <div className="text-white/30 text-xs font-black uppercase tracking-widest text-center mb-3">
              Prestaties behaald
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {snap.sessionAchievements.map((id, idx) => {
                const a = ACHIEVEMENTS[id];
                if (!a) return null;
                return (
                  <motion.div
                    key={id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.58 + idx * 0.08, type: "spring", stiffness: 320, damping: 20 }}
                    className="flex items-center gap-2 bg-yellow-400/12 border border-yellow-400/25 rounded-2xl px-3 py-2"
                  >
                    <span className="text-xl select-none" aria-hidden="true">{a.icon}</span>
                    <div>
                      <div className="font-black text-yellow-300 text-xs leading-tight">{a.label}</div>
                      <div className="text-white/35 text-xs leading-tight">{a.desc}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Level-up banner ──────────────────────── */}
      <AnimatePresence>
        {snap.leveledUp && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.85 }}
            className="w-full max-w-sm rounded-3xl border-2 border-yellow-400/50 p-5 mb-4 text-center shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(250,204,21,0.12), rgba(245,158,11,0.06))",
              boxShadow: "0 0 32px rgba(250,204,21,0.12)",
            }}
            role="alert"
            aria-label="Level omhoog gegaan"
          >
            <motion.div
              animate={{ scale: [1, 1.18, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.85, repeat: Infinity, repeatDelay: 1 }}
              className="text-5xl mb-2 select-none"
              aria-hidden="true"
            >
              🎖️
            </motion.div>
            <div className="font-black text-2xl text-yellow-300 uppercase tracking-wide">Level Up!</div>
            <div className="text-yellow-200/55 font-bold text-sm mt-1">
              Je bent nu Level {level} — {levelTitle}!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Continue button ──────────────────────── */}
      <motion.button
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 20 }}
        whileTap={{ scale: 0.95, y: 3 }}
        onClick={handleContinue}
        data-testid="button-continue"
        className="relative w-full max-w-sm py-6 rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-500
          text-gray-900 font-black text-2xl uppercase tracking-wider
          border-b-[6px] border-amber-700 active:border-b-0
          overflow-hidden touch-manipulation mt-auto mb-2 shrink-0"
        style={{ boxShadow: "0 8px 32px rgba(245,158,11,0.4), 0 2px 8px rgba(0,0,0,0.3)" }}
        aria-label="Ga terug naar home"
      >
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.26) 50%, transparent 70%)" }}
          animate={{ x: ["-100%", "220%"] }}
          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
          aria-hidden="true"
        />
        <span className="relative z-10">Doorgaan!</span>
      </motion.button>
    </div>
  );
}
