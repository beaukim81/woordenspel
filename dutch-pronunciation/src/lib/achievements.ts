export interface Achievement {
  id: string;
  icon: string;
  label: string;
  desc: string;
}

export const ACHIEVEMENTS: Record<string, Achievement> = {
  first_word:    { id: "first_word",    icon: "🌟", label: "Eerste Woord!",   desc: "Je hebt je eerste woord gezegd" },
  words_5:       { id: "words_5",       icon: "💬", label: "Veelprater",      desc: "5 woorden gezegd" },
  words_25:      { id: "words_25",      icon: "📣", label: "Spraakwaterval",  desc: "25 woorden gezegd" },
  words_50:      { id: "words_50",      icon: "🗣️", label: "Taalexpert",      desc: "50 woorden gezegd" },
  coins_50:      { id: "coins_50",      icon: "🪙", label: "Spaarpot",        desc: "50 munten verdiend" },
  coins_100:     { id: "coins_100",     icon: "💰", label: "Rijkaard",        desc: "100 munten verdiend" },
  coins_500:     { id: "coins_500",     icon: "🏦", label: "Goudkoorts",      desc: "500 munten verdiend" },
  level_2:       { id: "level_2",       icon: "📚", label: "Leerling",        desc: "Level 2 bereikt" },
  level_5:       { id: "level_5",       icon: "⚔️", label: "Ridder",          desc: "Level 5 bereikt" },
  level_10:      { id: "level_10",      icon: "🧙", label: "Meester",         desc: "Level 10 bereikt" },
  hard_word:     { id: "hard_word",     icon: "🔥", label: "Dappere Spreker", desc: "Een moeilijk woord gezegd" },
};

/** Ordered list used to check achievements in advanceWord */
export function checkNewAchievements(
  totalWords: number,
  newCoins: number,
  newLevel: number,
  difficulty: string,
  unlocked: string[]
): string[] {
  const has = (id: string) => unlocked.includes(id);
  const earned: string[] = [];

  if (totalWords >= 1  && !has("first_word"))  earned.push("first_word");
  if (totalWords >= 5  && !has("words_5"))     earned.push("words_5");
  if (totalWords >= 25 && !has("words_25"))    earned.push("words_25");
  if (totalWords >= 50 && !has("words_50"))    earned.push("words_50");

  if (newCoins >= 50  && !has("coins_50"))     earned.push("coins_50");
  if (newCoins >= 100 && !has("coins_100"))    earned.push("coins_100");
  if (newCoins >= 500 && !has("coins_500"))    earned.push("coins_500");

  if (newLevel >= 2  && !has("level_2"))       earned.push("level_2");
  if (newLevel >= 5  && !has("level_5"))       earned.push("level_5");
  if (newLevel >= 10 && !has("level_10"))      earned.push("level_10");

  if ((difficulty === "tw" || difficulty === "sl") && !has("hard_word")) earned.push("hard_word");

  return earned;
}

/** Level title by threshold — highest matching threshold wins */
const LEVEL_THRESHOLDS: Array<[number, string]> = [
  [20, "Kampioen"],
  [15, "Grootmeester"],
  [10, "Meester"],
  [7,  "Held"],
  [5,  "Ridder"],
  [4,  "Oefenaar"],
  [3,  "Spreker"],
  [2,  "Leerling"],
  [1,  "Beginner"],
];

export function getLevelTitle(level: number): string {
  for (const [threshold, title] of LEVEL_THRESHOLDS) {
    if (level >= threshold) return title;
  }
  return "Beginner";
}

/** Level at which the next named milestone occurs */
export function nextMilestoneLevel(level: number): number | null {
  const upcoming = LEVEL_THRESHOLDS.slice().reverse().find(([t]) => t > level);
  return upcoming ? upcoming[0] : null;
}
