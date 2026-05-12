import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { checkNewAchievements } from './achievements';

export type Difficulty = 'sp' | 'bl' | 'br' | 'st' | 'dr' | 'sl' | 'tw';

export interface WordData {
  word: string;
  translation: string;
  emoji: string;
  cluster: string;
}

export const PRELOADED_WORDS: WordData[] = [
  // ── sp cluster ────────────────────────────────────────────────
  { word: "spin",       translation: "spider",       emoji: "🕷️",  cluster: "sp" },
  { word: "spel",       translation: "game",         emoji: "🎮",  cluster: "sp" },
  { word: "spook",      translation: "ghost",        emoji: "👻",  cluster: "sp" },
  { word: "sport",      translation: "sport",        emoji: "⚽",  cluster: "sp" },
  { word: "spiegel",    translation: "mirror",       emoji: "🪞",  cluster: "sp" },
  { word: "sprong",     translation: "jump",         emoji: "🦘",  cluster: "sp" },
  { word: "spijker",    translation: "nail",         emoji: "🔩",  cluster: "sp" },
  { word: "spetter",    translation: "splash",       emoji: "💦",  cluster: "sp" },
  { word: "spek",       translation: "bacon",        emoji: "🥓",  cluster: "sp" },
  { word: "speld",      translation: "pin",          emoji: "📌",  cluster: "sp" },

  // ── bl cluster ────────────────────────────────────────────────
  { word: "blad",       translation: "leaf",         emoji: "🍃",  cluster: "bl" },
  { word: "blauw",      translation: "blue",         emoji: "💙",  cluster: "bl" },
  { word: "bloem",      translation: "flower",       emoji: "🌸",  cluster: "bl" },
  { word: "blij",       translation: "happy",        emoji: "😄",  cluster: "bl" },
  { word: "blok",       translation: "block",        emoji: "🧱",  cluster: "bl" },
  { word: "blik",       translation: "tin",          emoji: "🥫",  cluster: "bl" },
  { word: "bliksem",    translation: "lightning",    emoji: "⚡",  cluster: "bl" },
  { word: "blind",      translation: "blind",        emoji: "🙈",  cluster: "bl" },
  { word: "blond",      translation: "blonde",       emoji: "👱",  cluster: "bl" },
  { word: "blozen",     translation: "to blush",     emoji: "😊",  cluster: "bl" },

  // ── br cluster ────────────────────────────────────────────────
  { word: "brood",      translation: "bread",        emoji: "🍞",  cluster: "br" },
  { word: "brug",       translation: "bridge",       emoji: "🌉",  cluster: "br" },
  { word: "brief",      translation: "letter",       emoji: "✉️",  cluster: "br" },
  { word: "bril",       translation: "glasses",      emoji: "👓",  cluster: "br" },
  { word: "bruin",      translation: "brown",        emoji: "🟤",  cluster: "br" },
  { word: "brand",      translation: "fire",         emoji: "🔥",  cluster: "br" },
  { word: "broer",      translation: "brother",      emoji: "👦",  cluster: "br" },
  { word: "bron",       translation: "spring",       emoji: "💧",  cluster: "br" },
  { word: "bramen",     translation: "blackberries", emoji: "🫐",  cluster: "br" },
  { word: "brullen",    translation: "to roar",      emoji: "🦁",  cluster: "br" },

  // ── st cluster ────────────────────────────────────────────────
  { word: "ster",       translation: "star",         emoji: "⭐",  cluster: "st" },
  { word: "stoel",      translation: "chair",        emoji: "🪑",  cluster: "st" },
  { word: "stop",       translation: "stop",         emoji: "🛑",  cluster: "st" },
  { word: "storm",      translation: "storm",        emoji: "⛈️",  cluster: "st" },
  { word: "steen",      translation: "stone",        emoji: "🪨",  cluster: "st" },
  { word: "stad",       translation: "city",         emoji: "🏙️",  cluster: "st" },
  { word: "stap",       translation: "step",         emoji: "👣",  cluster: "st" },
  { word: "strik",      translation: "bow",          emoji: "🎀",  cluster: "st" },
  { word: "stout",      translation: "naughty",      emoji: "😈",  cluster: "st" },
  { word: "stoep",      translation: "pavement",     emoji: "🚶",  cluster: "st" },

  // ── dr cluster ────────────────────────────────────────────────
  { word: "draak",      translation: "dragon",       emoji: "🐉",  cluster: "dr" },
  { word: "droom",      translation: "dream",        emoji: "💫",  cluster: "dr" },
  { word: "druif",      translation: "grape",        emoji: "🍇",  cluster: "dr" },
  { word: "drop",       translation: "candy",        emoji: "🍬",  cluster: "dr" },
  { word: "drie",       translation: "three",        emoji: "🎲",  cluster: "dr" },
  { word: "drum",       translation: "drum",         emoji: "🥁",  cluster: "dr" },
  { word: "draad",      translation: "thread",       emoji: "🧵",  cluster: "dr" },
  { word: "dragen",     translation: "to carry",     emoji: "🎒",  cluster: "dr" },
  { word: "draaien",    translation: "to spin",      emoji: "🌀",  cluster: "dr" },
  { word: "drank",      translation: "drink",        emoji: "🧃",  cluster: "dr" },

  // ── sl cluster ────────────────────────────────────────────────
  { word: "slang",      translation: "snake",        emoji: "🐍",  cluster: "sl" },
  { word: "sleutel",    translation: "key",          emoji: "🔑",  cluster: "sl" },
  { word: "slapen",     translation: "to sleep",     emoji: "😴",  cluster: "sl" },
  { word: "slim",       translation: "smart",        emoji: "🧠",  cluster: "sl" },
  { word: "slak",       translation: "snail",        emoji: "🐌",  cluster: "sl" },
  { word: "slee",       translation: "sled",         emoji: "🛷",  cluster: "sl" },
  { word: "slijm",      translation: "slime",        emoji: "🟢",  cluster: "sl" },
  { word: "slepen",     translation: "to drag",      emoji: "🚜",  cluster: "sl" },
  { word: "sloot",      translation: "ditch",        emoji: "💧",  cluster: "sl" },
  { word: "slurpen",    translation: "to slurp",     emoji: "🥤",  cluster: "sl" },

  // ── tw cluster ────────────────────────────────────────────────
  { word: "twee",       translation: "two",          emoji: "✌️",  cluster: "tw" },
  { word: "twijg",      translation: "twig",         emoji: "🌿",  cluster: "tw" },
  { word: "twaalf",     translation: "twelve",       emoji: "🕛",  cluster: "tw" },
  { word: "twintig",    translation: "twenty",       emoji: "🔢",  cluster: "tw" },
  { word: "twist",      translation: "twist",        emoji: "🌪️",  cluster: "tw" },
  { word: "tweet",      translation: "bird call",    emoji: "🐦",  cluster: "tw" },
  { word: "twijfel",    translation: "doubt",        emoji: "🤔",  cluster: "tw" },
];

export function detectCluster(word: string): Difficulty | null {
  const w = word.toLowerCase().trim();
  if (w.startsWith("sp")) return "sp";
  if (w.startsWith("bl")) return "bl";
  if (w.startsWith("br")) return "br";
  if (w.startsWith("st")) return "st";
  if (w.startsWith("dr")) return "dr";
  if (w.startsWith("sl")) return "sl";
  if (w.startsWith("tw")) return "tw";
  return null;
}

const CLUSTER_EMOJI: Record<string, string> = {
  sp: "⭐", bl: "💙", br: "🔥", st: "⭐", dr: "🌟", sl: "🐍", tw: "✨",
};

export function customWordToWordData(word: string): WordData | null {
  const cluster = detectCluster(word);
  if (!cluster) return null;
  return {
    word: word.toLowerCase().trim(),
    translation: "",
    emoji: CLUSTER_EMOJI[cluster] ?? "⭐",
    cluster,
  };
}

export function getSessionWords(cluster: Difficulty, customWords: string[]): WordData[] {
  const preloaded = PRELOADED_WORDS.filter(w => w.cluster === cluster);
  const preloadedSet = new Set(preloaded.map(w => w.word));
  const custom = customWords
    .map(customWordToWordData)
    .filter((w): w is WordData => w !== null && w.cluster === cluster && !preloadedSet.has(w.word));
  return [...preloaded, ...custom];
}

export interface SessionState {
  sessionCoins: number;
  sessionXP: number;
  currentWordIndex: number;
  completedWords: string[];
  leveledUp: boolean;
  startLevel: number;
  achievementsUnlockedInSession: string[];
}

interface GameState {
  avatarColor: string;
  coins: number;
  xp: number;
  difficulty: Difficulty;
  customWords: string[];
  childName: string;
  totalWordsCompleted: number;
  achievements: string[];
  wordErrors: Record<string, number>;
  session: SessionState | null;
  addCoins: (amount: number) => void;
  addXP: (amount: number) => void;
  setDifficulty: (diff: Difficulty) => void;
  setCustomWords: (words: string[]) => void;
  setChildName: (name: string) => void;
  setAvatarColor: (color: string) => void;
  recordWordError: (word: string) => void;
  clearWordErrors: () => void;
  startSession: () => void;
  advanceWord: (coinsEarned: number, xpEarned: number) => void;
  endSession: () => void;
  resetProgress: () => void;
}

export function getLevelFromXP(xp: number): number {
  return Math.floor(xp / 50) + 1;
}

export function getXPProgress(xp: number): number {
  return xp % 50;
}

const defaultState = {
  avatarColor: 'purple',
  coins: 0,
  xp: 0,
  difficulty: 'sp' as Difficulty,
  customWords: [] as string[],
  childName: '',
  totalWordsCompleted: 0,
  achievements: [] as string[],
  wordErrors: {} as Record<string, number>,
  session: null,
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      addCoins: (amount) => set((s) => ({ coins: Math.max(0, s.coins + amount) })),
      addXP:    (amount) => set((s) => ({ xp:    Math.max(0, s.xp + amount) })),
      setDifficulty:  (difficulty)  => set({ difficulty }),
      setCustomWords: (customWords) => set({ customWords }),
      setChildName:   (childName)   => set({ childName }),
      setAvatarColor: (avatarColor) => set({ avatarColor }),
      recordWordError: (word) => set((s) => ({
        wordErrors: { ...s.wordErrors, [word]: (s.wordErrors[word] ?? 0) + 1 },
      })),
      clearWordErrors: () => set({ wordErrors: {} }),

      startSession: () => {
        const { xp } = get();
        set({
          session: {
            sessionCoins: 0,
            sessionXP: 0,
            currentWordIndex: 0,
            completedWords: [],
            leveledUp: false,
            startLevel: getLevelFromXP(xp),
            achievementsUnlockedInSession: [],
          },
        });
      },

      advanceWord: (coinsEarned, xpEarned) => {
        const state = get();
        if (!state.session) return;

        const words = getSessionWords(state.difficulty, state.customWords);
        const word  = words[state.session.currentWordIndex];

        const oldLevel = getLevelFromXP(state.xp);
        const newXP    = state.xp + xpEarned;
        const newLevel = getLevelFromXP(newXP);
        const newCoins = state.coins + coinsEarned;
        const newTotal = state.totalWordsCompleted + 1;

        const newlyUnlocked = checkNewAchievements(
          newTotal, newCoins, newLevel, state.difficulty, state.achievements,
        );

        set((s) => ({
          coins: newCoins,
          xp: newXP,
          totalWordsCompleted: newTotal,
          achievements: [...s.achievements, ...newlyUnlocked],
          session: s.session ? {
            ...s.session,
            sessionCoins: s.session.sessionCoins + coinsEarned,
            sessionXP:    s.session.sessionXP    + xpEarned,
            currentWordIndex: s.session.currentWordIndex + 1,
            completedWords: word
              ? [...s.session.completedWords, word.word]
              : s.session.completedWords,
            leveledUp: s.session.leveledUp || newLevel > oldLevel,
            achievementsUnlockedInSession: [
              ...s.session.achievementsUnlockedInSession,
              ...newlyUnlocked,
            ],
          } : null,
        }));
      },

      endSession: () => set({ session: null }),

      resetProgress: () => set((s) => ({
        ...defaultState,
        avatarColor:  s.avatarColor,
        customWords:  s.customWords,
        childName:    s.childName,
        wordErrors:   s.wordErrors,
      })),
    }),
    {
      name: 'dutch-game-storage',
      version: 5,
      storage: createJSONStorage(() => ({
        getItem:    (key) => { try { return localStorage.getItem(key); }    catch { return null; } },
        setItem:    (key, v) => { try { localStorage.setItem(key, v); }     catch { /* private mode */ } },
        removeItem: (key) => { try { localStorage.removeItem(key); }        catch { /* ignore */ } },
      })),
      partialize: (state) => ({
        avatarColor: state.avatarColor,
        coins: state.coins,
        xp: state.xp,
        difficulty: state.difficulty,
        customWords: state.customWords,
        childName: state.childName,
        totalWordsCompleted: state.totalWordsCompleted,
        achievements: state.achievements,
        wordErrors: state.wordErrors,
      }),
      migrate: (persistedState: unknown, _fromVersion: number) => {
        const s = (persistedState ?? {}) as Record<string, unknown>;

        const DIFF_TO_CLUSTER: Record<string, Difficulty> = {
          easy: 'sp', medium: 'dr', hard: 'tw',
        };
        const validClusters: Difficulty[] = ['sp', 'bl', 'br', 'st', 'dr', 'sl', 'tw'];
        const rawDiff = s.difficulty as string;
        const difficulty: Difficulty =
          DIFF_TO_CLUSTER[rawDiff] ??
          (validClusters.includes(rawDiff as Difficulty) ? (rawDiff as Difficulty) : 'sp');

        return {
          avatarColor:         typeof s.avatarColor         === 'string' ? s.avatarColor         : 'purple',
          coins:               typeof s.coins               === 'number' ? s.coins               : 0,
          xp:                  typeof s.xp                  === 'number' ? s.xp                  : 0,
          difficulty,
          customWords:         Array.isArray(s.customWords)  ? s.customWords  : [],
          childName:           typeof s.childName            === 'string' ? s.childName           : '',
          totalWordsCompleted: typeof s.totalWordsCompleted  === 'number' ? s.totalWordsCompleted : 0,
          achievements:        Array.isArray(s.achievements) ? s.achievements : [],
          wordErrors:          (s.wordErrors && typeof s.wordErrors === 'object' && !Array.isArray(s.wordErrors))
            ? s.wordErrors as Record<string, number>
            : {},
          session: null,
        };
      },
    }
  )
);
