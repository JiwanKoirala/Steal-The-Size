export type GameMode = 'story' | 'endless' | 'timeChallenge';

export type WorldTheme = 'meadow' | 'factory' | 'sky' | 'citadel';

export type SizePropKind =
  | 'duck'
  | 'watermelon'
  | 'acorn'
  | 'barrel'
  | 'hammer'
  | 'crystal'
  | 'gear'
  | 'dumbbell';

export type PowerUpKind = 'speed' | 'shield' | 'magnet' | 'surge';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlatformDef {
  id: string;
  x: number;
  y: number; // top surface Y (usually 0 for ground, >0 for elevated)
  z: number;
  w: number;
  h: number;
  d: number;
  color?: string;
  moving?: {
    axis: 'x' | 'y' | 'z';
    range: number;
    speed: number;
    phase?: number;
  };
}

export interface WallDef {
  id: string;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  y?: number;
  /** If set, player can smash through when scale >= breakScale */
  breakScale?: number;
  /** If set, wall has a bottom tunnel/archway allowing scale <= tunnelMaxScale */
  tunnelMaxScale?: number;
  tunnelHeight?: number;
  /** Linked to a pressure plate id; opens when plate is pressed */
  gatePlateId?: string;
}

export interface PushBlockDef {
  id: string;
  x: number;
  z: number;
  size: number;
  requiredScale: number;
  color?: string;
}

export interface PressurePlateDef {
  id: string;
  x: number;
  z: number;
  radius: number;
  /** If true, stays latched once pressed by block or giant player */
  latch?: boolean;
  requiredScale?: number;
}

export interface SizePropDef {
  id: string;
  kind: SizePropKind;
  x: number;
  y?: number;
  z: number;
  scale: number;
}

export interface EnemyDef {
  id: string;
  kind: 'chomper' | 'drone' | 'saw' | 'laser';
  x: number;
  y?: number;
  z: number;
  patrolEndX?: number;
  patrolEndZ?: number;
  speed: number;
  /** Player can crush chompers/drones when scale >= crushScale */
  crushScale?: number;
  /** For laser: height of beam bottom so tiny players can walk under */
  clearanceHeight?: number;
  width?: number;
}

export interface CollectibleDef {
  id: string;
  kind: 'coin' | 'star' | PowerUpKind;
  x: number;
  y: number;
  z: number;
}

export interface LevelDef {
  id: number;
  mode: GameMode;
  world: WorldTheme;
  name: string;
  subtitle: string;
  hint: string;
  parTime: number;
  arenaWidth: number;
  arenaDepth: number;
  spawn: Vec3;
  goal: Vec3;
  platforms: PlatformDef[];
  walls: WallDef[];
  pushBlocks: PushBlockDef[];
  plates: PressurePlateDef[];
  sizeProps: SizePropDef[];
  enemies: EnemyDef[];
  collectibles: CollectibleDef[];
}

export interface SkinDef {
  id: string;
  name: string;
  tagline: string;
  price: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  accessory: 'antenna' | 'visor' | 'sprout' | 'crown' | 'headband' | 'helmet';
  unlockRequirement?: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
}

export interface ActivePowerUps {
  speed: number; // remaining seconds
  shield: number;
  magnet: number;
  surge: number;
}

export interface HudState {
  scale: number;
  speedMultiplier: number;
  strengthTier: string;
  health: number;
  maxHealth: number;
  coinsRun: number;
  starsCollected: number;
  totalStars: number;
  score: number;
  elapsed: number;
  timeRemaining: number | null;
  wave: number;
  combo: number;
  powerUps: ActivePowerUps;
  toastText: string | null;
  levelName: string;
  levelHint: string;
  mode: GameMode;
  levelId: number;
  rivalDistance: number | null;
}

export interface RunResult {
  victory: boolean;
  mode: GameMode;
  levelId: number;
  levelName: string;
  elapsed: number;
  parTime: number;
  score: number;
  coinsEarned: number;
  starsEarned: number;
  wallsSmashed: number;
  enemiesCrushed: number;
  sizeSteals: number;
  waveReached: number;
  newRecord: boolean;
  newlyUnlockedAchievements: string[];
  ghostFrames?: GhostKeyframe[];
}

export interface GhostKeyframe {
  t: number;
  x: number;
  y: number;
  z: number;
  ry: number;
  s: number;
}

export interface ChallengePayload {
  seed: number;
  mode: GameMode;
  levelId: number;
  challengerName: string;
  challengerSkin: string;
  targetScore: number;
  targetTime: number;
  frames: GhostKeyframe[];
}

export interface SaveData {
  coins: number;
  equippedSkin: string;
  unlockedSkins: string[];
  unlockedStoryLevel: number; // 1..20
  levelStars: Record<number, number>; // levelId -> 0..3
  levelBestTime: Record<number, number>; // levelId -> seconds
  timeChallengeBest: Record<number, number>; // challengeId -> seconds
  endlessHighScore: number;
  endlessBestWave: number;
  unlockedAchievements: string[];
  stats: {
    totalSizeSteals: number;
    totalWallsSmashed: number;
    totalEnemiesCrushed: number;
    totalCoinsCollected: number;
    minScaleReached: number;
    maxScaleReached: number;
  };
  muted: boolean;
  cameraSensitivity: number;
  playerName: string;
}
