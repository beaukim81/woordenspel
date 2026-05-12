import { useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { Settings, Trophy } from "lucide-react";
import { useGameStore, getLevelFromXP, getXPProgress, type Difficulty } from "@/lib/store";
import { getLevelTitle, nextMilestoneLevel, ACHIEVEMENTS } from "@/lib/achievements";
import { avatarForColor } from "@/pages/profile-select";

const CLUSTER_OPTIONS: {
  cluster: string; difficulty: Difficulty; label: string;
  gradient: string; border: string; glow: string;
  cardBg: string; cardBorder: string; hint: string;
}[] = [
  { cluster:"sp", difficulty:"sp", label:"SP", gradient:"from-green-500 to-emerald-600",  border:"border-b-[5px] border-green-800",  glow:"0 6px 24px rgba(34,197,94,0.45)",   cardBg:"bg-green-500/12",  cardBorder:"border-green-500/35",  hint:"Spin · Spook · Speelgoed" },
  { cluster:"bl", difficulty:"bl", label:"BL", gradient:"from-sky-500 to-blue-600",       border:"border-b-[5px] border-sky-800",    glow:"0 6px 24px rgba(14,165,233,0.45)",  cardBg:"bg-sky-500/12",    cardBorder:"border-sky-500/35",    hint:"Blad · Bloem · Blauw" },
  { cluster:"br", difficulty:"br", label:"BR", gradient:"from-orange-500 to-amber-600",   border:"border-b-[5px] border-orange-800", glow:"0 6px 24px rgba(249,115,22,0.45)",  cardBg:"bg-orange-500/12", cardBorder:"border-orange-500/35", hint:"Brood · Brug · Bruin" },
  { cluster:"st", difficulty:"st", label:"ST", gradient:"from-teal-500 to-cyan-600",      border:"border-b-[5px] border-teal-800",   glow:"0 6px 24px rgba(20,184,166,0.45)",  cardBg:"bg-teal-500/12",   cardBorder:"border-teal-500/35",   hint:"Ster · Stoel · Storm" },
  { cluster:"dr", difficulty:"dr", label:"DR", gradient:"from-amber-500 to-orange-600",   border:"border-b-[5px] border-amber-800",  glow:"0 6px 24px rgba(245,158,11,0.45)",  cardBg:"bg-amber-500/12",  cardBorder:"border-amber-500/35",  hint:"Draak · Droom · Druif" },
  { cluster:"sl", difficulty:"sl", label:"SL", gradient:"from-pink-500 to-rose-600",      border:"border-b-[5px] border-pink-800",   glow:"0 6px 24px rgba(236,72,153,0.45)",  cardBg:"bg-pink-500/12",   cardBorder:"border-pink-500/35",   hint:"Slang · Sleutel · Slim" },
  { cluster:"tw", difficulty:"tw", label:"TW", gradient:"from-purple-500 to-violet-600",  border:"border-b-[5px] border-purple-800", glow:"0 6px 24px rgba(168,85,247,0.45)",  cardBg:"bg-purple-500/12", cardBorder:"border-purple-500/35", hint:"Twee · Twijg · Tweeling" },
];

// Stable background stars — computed once outside the component
const BG_STARS = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  size: 3 + (i * 3.7) % 9,
  top:  ((i * 37 + 11) % 90) + 2,
  left: ((i * 61 +  7) % 88) + 2,
  dur:  2 + (i % 5) * 0.45,
  delay: (i % 7) * 0.35,
}));

type ClusterOption = typeof CLUSTER_OPTIONS[number];

function ClusterBtn({ opt, active, onSelect }: { opt: ClusterOption; active: boolean; onSelect: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.93, y: active ? 2 : 1 }}
      onClick={onSelect}
      role="radio"
      aria-checked={active}
      data-testid={`cluster-btn-${opt.cluster}`}
      className={`relative py-4 rounded-2xl font-black overflow-hidden touch-manipulation
        transition-all duration-200 w-full
        ${active
          ? `bg-gradient-to-br ${opt.gradient} ${opt.border} text-white`
          : `${opt.cardBg} border-2 ${opt.cardBorder} text-white/45 border-b-[3px]`
        }`}
      style={active ? { boxShadow: opt.glow } : undefined}
      aria-label={opt.cluster}
    >
      {active && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)" }}
          animate={{ x: ["-120%", "220%"] }}
          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.2 }}
          aria-hidden="true"
        />
      )}
      <div
        className="relative z-10 text-xl tracking-widest uppercase leading-none"
        style={active ? { textShadow: "0 2px 8px rgba(0,0,0,0.3)" } : undefined}
      >
        {opt.cluster}
      </div>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white/70"
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const spring  = useSpring(value, { stiffness: 100, damping: 16 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());
  useEffect(() => { spring.set(value); }, [value, spring]);
  return <motion.span>{display}</motion.span>;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { coins, xp, difficulty, achievements, childName, startSession, setDifficulty,
    avatarColor } = useGameStore();

  const level        = getLevelFromXP(xp);
  const xpProgress   = getXPProgress(xp);
  const levelTitle   = getLevelTitle(level);
  const nextMilestone = nextMilestoneLevel(level);
  const xpToNext     = 50 - xpProgress;
  const xpPct        = (xpProgress / 50) * 100;

  // Coin pop animation key
  const prevCoins = useRef(coins);
  const coinKey   = useRef(0);
  if (prevCoins.current !== coins) {
    prevCoins.current = coins;
    coinKey.current++;
  }

  const activeCluster = CLUSTER_OPTIONS.find(o => o.difficulty === difficulty) ?? CLUSTER_OPTIONS[0];
  const recentAchievements = achievements.slice(-4);

  function handlePlay() {
    startSession();
    setLocation("/exercise");
  }

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center bg-background px-4 pt-5 pb-6 relative overflow-hidden">

      {/* Background stars */}
      {BG_STARS.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: s.size, height: s.size,
            top: `${s.top}%`, left: `${s.left}%`,
            background: "radial-gradient(circle, rgba(250,204,21,0.5), transparent)",
          }}
          animate={{ opacity: [0.1, 0.5, 0.1], scale: [1, 1.6, 1] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
          aria-hidden="true"
        />
      ))}

      {/* ── Top bar ─────────────────────────────── */}
      <motion.div
        initial={{ y: -28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="w-full max-w-sm flex items-center justify-between mb-5 shrink-0"
      >
        {/* Coin counter */}
        <motion.div
          key={coinKey.current}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ type: "spring", stiffness: 500, damping: 16 }}
          className="flex items-center gap-2 rounded-2xl px-4 py-2.5 border-2 border-yellow-400/40
            bg-yellow-400/10 shadow-[0_0_16px_rgba(250,204,21,0.15)]"
          data-testid="coin-counter"
          aria-label={`${coins} munten`}
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="w-6 h-6 rounded-full coin-shine flex items-center justify-center shadow-md shrink-0"
            aria-hidden="true"
          >
            <span className="text-xs font-black text-yellow-900 select-none">C</span>
          </motion.div>
          <span className="font-black text-yellow-300 text-lg tabular-nums">
            <AnimatedNumber value={coins} />
          </span>
        </motion.div>

        {/* Avatar — tap to switch profile */}
        {(() => {
          const av = avatarForColor(avatarColor);
          return (
            <motion.button
              animate={{ y: [0, -10, 0], rotate: [0, -4, 4, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setLocation("/settings")}
              className="w-16 h-16 rounded-2xl border-2 border-white/25 flex items-center
                justify-center shadow-2xl text-4xl select-none touch-manipulation relative overflow-hidden"
              style={{ boxShadow: `0 0 24px ${av.glow}, 0 8px 20px rgba(0,0,0,0.4)` }}
              data-testid="avatar-icon"
              aria-label="Instellingen"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${av.bg}`} />
              <span className="relative z-10">{av.emoji}</span>
            </motion.button>
          );
        })()}

        {/* Settings */}
        <motion.button
          whileTap={{ scale: 0.85, rotate: 45 }}
          onClick={() => setLocation("/settings")}
          className="w-12 h-12 rounded-2xl bg-white/[0.08] border-2 border-white/15 flex items-center justify-center touch-manipulation"
          data-testid="button-settings"
          aria-label="Instellingen"
        >
          <Settings className="w-5 h-5 text-white/60" />
        </motion.button>
      </motion.div>

      {/* ── Level + XP ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm mb-5 shrink-0"
      >
        <div className="flex items-center justify-between mb-2 flex-wrap gap-y-1">
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="text-lg select-none"
              aria-hidden="true"
            >
              ⭐
            </motion.span>
            <span className="font-black text-yellow-400 text-sm tracking-wider">LEVEL {level}</span>
            <motion.span
              key={levelTitle}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/25
                text-purple-300 font-black text-xs uppercase tracking-widest"
            >
              {levelTitle}
            </motion.span>
          </div>
          <span className="text-white/35 text-xs font-black tabular-nums">{xpProgress}/50 XP</span>
        </div>

        {/* XP bar */}
        <div className="relative h-4 bg-white/[0.08] rounded-full border border-white/8 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #7c3aed, #a855f7, #facc15, #f59e0b)" }}
            initial={{ width: 0 }}
            animate={{ width: `${xpPct}%` }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18) 50%, transparent)" }}
            animate={{ x: ["-100%", "220%"] }}
            transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
            aria-hidden="true"
          />
        </div>

        {/* XP hint */}
        <div className="mt-1.5 text-center">
          {nextMilestone !== null ? (
            <span className="text-white/30 text-xs font-bold">
              Nog <span className="text-yellow-400/80 font-black">{xpToNext} XP</span> naar Level {level + 1}
              {nextMilestone === level + 1 && (
                <span className="text-purple-400/70"> · {getLevelTitle(level + 1)}</span>
              )}
            </span>
          ) : (
            <span className="text-yellow-400/50 text-xs font-black uppercase tracking-widest">
              Max level bereikt!
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Title ───────────────────────────────── */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 16, delay: 0.12 }}
        className="text-center mb-1 shrink-0"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={childName || "duuks"}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="font-black text-white leading-none tracking-wide select-none"
            style={{ fontSize: "clamp(2.6rem, 13vw, 4.4rem)" }}
          >
            {childName.trim() || "DUUKS"}
          </motion.div>
        </AnimatePresence>
        <div
          className="font-black leading-none tracking-wide select-none"
          style={{
            fontSize: "clamp(1.5rem, 8vw, 2.8rem)",
            background: "linear-gradient(135deg, #fde68a 0%, #facc15 40%, #f59e0b 70%, #d97706 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          WOORDENSPEL
        </div>
      </motion.div>

      {/* ── Mascot ──────────────────────────────── */}
      <motion.div
        animate={{ y: [0, -14, 0], rotate: [0, 3, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="text-[88px] my-2 drop-shadow-2xl select-none shrink-0"
        style={{ filter: "drop-shadow(0 8px 24px rgba(139,92,246,0.4))" }}
        aria-hidden="true"
      >
        🐉
      </motion.div>

      {/* ── Cluster picker ───────────────────────
            The child taps which sound cluster to practice.
            sp = easy · dr = medium · tw = hard          */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, type: "spring", stiffness: 200, damping: 22 }}
        className="w-full max-w-sm mb-4 shrink-0"
      >
        <div className="text-white/30 text-xs font-black uppercase tracking-widest text-center mb-2.5">
          Kies je klanken
        </div>

        {/* Cluster buttons — two rows: 4 + 3 */}
        <div role="radiogroup" aria-label="Kies klankgroep" className="flex flex-col gap-2">
          {/* Row 1: sp bl br st */}
          <div className="grid grid-cols-4 gap-2">
            {CLUSTER_OPTIONS.slice(0, 4).map((opt) => <ClusterBtn key={opt.cluster} opt={opt} active={difficulty === opt.difficulty} onSelect={() => setDifficulty(opt.difficulty)} />)}
          </div>
          {/* Row 2: dr sl tw */}
          <div className="grid grid-cols-3 gap-2">
            {CLUSTER_OPTIONS.slice(4).map((opt) => <ClusterBtn key={opt.cluster} opt={opt} active={difficulty === opt.difficulty} onSelect={() => setDifficulty(opt.difficulty)} />)}
          </div>
        </div>

        {/* Active cluster description */}
        <AnimatePresence mode="wait">
          <motion.div
            key={difficulty}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-center mt-2.5"
          >
            <span className="text-white/25 text-xs font-bold">{activeCluster.hint} · …</span>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ── Play button ─────────────────────────── */}
      <motion.button
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.16 }}
        whileTap={{ scale: 0.95, y: 3 }}
        onClick={handlePlay}
        data-testid="button-play"
        className="relative w-full max-w-sm py-6 rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-500
          text-gray-900 font-black text-3xl uppercase tracking-wider
          border-b-[6px] border-amber-700 active:border-b-0
          overflow-hidden shrink-0 touch-manipulation transition-all"
        style={{ boxShadow: "0 8px 32px rgba(245,158,11,0.4), 0 2px 8px rgba(0,0,0,0.3)" }}
        aria-label="Start spelen"
      >
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(110deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0) 70%)" }}
          animate={{ x: ["-100%", "220%"] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
          aria-hidden="true"
        />
        <span className="relative z-10">Spelen!</span>
      </motion.button>

      {/* ── Achievement shelf ───────────────────── */}
      {recentAchievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-sm mt-5 shrink-0"
        >
          <div className="flex items-center gap-2 mb-2.5">
            <Trophy className="w-3.5 h-3.5 text-yellow-400/50" aria-hidden="true" />
            <span className="text-white/30 text-xs font-black uppercase tracking-widest">Prestaties</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {recentAchievements.map((id) => {
              const a = ACHIEVEMENTS[id];
              if (!a) return null;
              return (
                <motion.div
                  key={id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  className="flex items-center gap-1.5 bg-white/[0.07] border border-white/[0.10] rounded-2xl px-3 py-1.5"
                  title={a.desc}
                >
                  <span className="text-sm select-none" aria-hidden="true">{a.icon}</span>
                  <span className="text-white/55 font-bold text-xs">{a.label}</span>
                </motion.div>
              );
            })}
            {achievements.length > 4 && (
              <div className="flex items-center px-3 py-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <span className="text-white/30 font-bold text-xs">+{achievements.length - 4} meer</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
