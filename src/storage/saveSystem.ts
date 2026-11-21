import { ACHIEVEMENTS } from '../data/achievements';
import { RunResult, SaveData } from '../types/game';

const STORAGE_KEY = 'steal_the_size_save_v1';

export const DEFAULT_SAVE: SaveData = {
  coins: 25,
  equippedSkin: 'volt_blob',
  unlockedSkins: ['volt_blob'],
  unlockedStoryLevel: 1,
  levelStars: {},
  levelBestTime: {},
  timeChallengeBest: {},
  endlessHighScore: 0,
  endlessBestWave: 0,
  unlockedAchievements: [],
  stats: {
    totalSizeSteals: 0,
    totalWallsSmashed: 0,
    totalEnemiesCrushed: 0,
    totalCoinsCollected: 0,
    minScaleReached: 1,
    maxScaleReached: 1,
  },
  muted: false,
  cameraSensitivity: 1.0,
  playerName: 'Player 1',
};

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...structuredClone(DEFAULT_SAVE),
      ...parsed,
      stats: {
        ...DEFAULT_SAVE.stats,
        ...(parsed.stats ?? {}),
      },
    };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function writeSaveData(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors in restricted sandboxes
  }
}

export function resetSaveData(): SaveData {
  const fresh = structuredClone(DEFAULT_SAVE);
  writeSaveData(fresh);
  return fresh;
}

export interface RunStatsSnapshot {
  minScale: number;
  maxScale: number;
}

export function applyRunCompletion(
  current: SaveData,
  result: RunResult,
  runExtremes: RunStatsSnapshot,
): { updated: SaveData; newAchievements: string[]; bonusCoins: number } {
  const next: SaveData = {
    ...current,
    levelStars: { ...current.levelStars },
    levelBestTime: { ...current.levelBestTime },
    timeChallengeBest: { ...current.timeChallengeBest },
    unlockedAchievements: [...current.unlockedAchievements],
    stats: { ...current.stats },
  };

  next.coins += result.coinsEarned;
  next.stats.totalSizeSteals += result.sizeSteals;
  next.stats.totalWallsSmashed += result.wallsSmashed;
  next.stats.totalEnemiesCrushed += result.enemiesCrushed;
  next.stats.totalCoinsCollected += result.coinsEarned;
  next.stats.minScaleReached = Math.min(next.stats.minScaleReached, runExtremes.minScale);
  next.stats.maxScaleReached = Math.max(next.stats.maxScaleReached, runExtremes.maxScale);

  if (result.victory && result.mode === 'story') {
    const prevStars = next.levelStars[result.levelId] ?? 0;
    next.levelStars[result.levelId] = Math.max(prevStars, result.starsEarned);
    const prevBest = next.levelBestTime[result.levelId];
    if (prevBest === undefined || result.elapsed < prevBest) {
      next.levelBestTime[result.levelId] = result.elapsed;
    }
    if (result.levelId >= next.unlockedStoryLevel && result.levelId < 20) {
      next.unlockedStoryLevel = result.levelId + 1;
    }
  }

  if (result.victory && result.mode === 'timeChallenge') {
    const prevBest = next.timeChallengeBest[result.levelId];
    if (prevBest === undefined || result.elapsed < prevBest) {
      next.timeChallengeBest[result.levelId] = result.elapsed;
    }
  }

  if (result.mode === 'endless') {
    if (result.score > next.endlessHighScore) {
      next.endlessHighScore = result.score;
    }
    if (result.waveReached > next.endlessBestWave) {
      next.endlessBestWave = result.waveReached;
    }
  }

  const candidateChecks: Array<[string, boolean]> = [
    ['first_steal', next.stats.totalSizeSteals >= 1],
    ['micro_sprinter', next.stats.minScaleReached <= 0.45],
    ['colossus', next.stats.maxScaleReached >= 2.6],
    ['first_smash', next.stats.totalWallsSmashed >= 1],
    ['demolition_expert', next.stats.totalWallsSmashed >= 25],
    ['bot_crusher', next.stats.totalEnemiesCrushed >= 10],
    ['coin_collector', next.stats.totalCoinsCollected >= 150],
    ['meadow_clear', (next.levelStars[5] ?? 0) > 0],
    ['factory_clear', (next.levelStars[10] ?? 0) > 0],
    ['sky_clear', (next.levelStars[15] ?? 0) > 0],
    ['story_champion', (next.levelStars[20] ?? 0) > 0],
    ['endless_wave_5', next.endlessBestWave >= 5],
  ];

  const newAchievements: string[] = [];
  let bonusCoins = 0;

  for (const [id, unlocked] of candidateChecks) {
    if (unlocked && !next.unlockedAchievements.includes(id)) {
      next.unlockedAchievements.push(id);
      newAchievements.push(id);
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) {
        bonusCoins += def.rewardCoins;
      }
    }
  }

  next.coins += bonusCoins;
  writeSaveData(next);

  return { updated: next, newAchievements, bonusCoins };
}
