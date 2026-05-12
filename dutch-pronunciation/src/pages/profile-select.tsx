export const AVATAR_OPTIONS = [
  { id: "purple", bg: "from-purple-500 to-violet-600",  emoji: "🧙", glow: "rgba(168,85,247,0.45)" },
  { id: "green",  bg: "from-green-500 to-emerald-600",  emoji: "🐲", glow: "rgba(34,197,94,0.45)"  },
  { id: "orange", bg: "from-orange-500 to-amber-600",   emoji: "🦊", glow: "rgba(249,115,22,0.45)" },
  { id: "sky",    bg: "from-sky-500 to-blue-600",       emoji: "🦋", glow: "rgba(14,165,233,0.45)" },
  { id: "pink",   bg: "from-pink-500 to-rose-600",      emoji: "🦄", glow: "rgba(236,72,153,0.45)" },
  { id: "amber",  bg: "from-amber-400 to-yellow-500",   emoji: "⭐", glow: "rgba(245,158,11,0.45)" },
  { id: "teal",   bg: "from-teal-500 to-cyan-600",      emoji: "🐢", glow: "rgba(20,184,166,0.45)" },
] as const;

export function avatarForColor(color: string) {
  return AVATAR_OPTIONS.find(a => a.id === color) ?? AVATAR_OPTIONS[0];
}
