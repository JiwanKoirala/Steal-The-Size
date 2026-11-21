import React, { useState } from 'react';
import {
  Award,
  Check,
  Coins,
  Flame,
  Lock,
  Palette,
  Play,
  Settings,
  Star,
  Timer,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ACHIEVEMENTS } from '../data/achievements';
import { STORY_LEVELS, TIME_CHALLENGE_LEVELS } from '../data/levels';
import { SKINS } from '../data/skins';
import {
  buildSyntheticRivalChallenge,
  decodeChallengeCode,
} from '../game/multiplayer/MultiplayerAdapter';
import { ChallengePayload, SaveData } from '../types/game';

type ActiveModal = null | 'story' | 'time' | 'skins' | 'achievements' | 'rival' | 'settings';

interface MainMenuProps {
  save: SaveData;
  onStartStory: (levelId: number, rival?: ChallengePayload | null) => void;
  onStartEndless: () => void;
  onStartTimeChallenge: (challengeId: number, rival?: ChallengePayload | null) => void;
  onPreviewSkin: (skinId: string) => void;
  onUnlockOrEquipSkin: (skinId: string) => void;
  onToggleMute: () => void;
  onUpdateSettings: (name: string, sensitivity: number) => void;
  onResetProgress: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  save,
  onStartStory,
  onStartEndless,
  onStartTimeChallenge,
  onPreviewSkin,
  onUnlockOrEquipSkin,
  onToggleMute,
  onUpdateSettings,
  onResetProgress,
}) => {
  const [modal, setModal] = useState<ActiveModal>(null);
  const [rivalLevelId, setRivalLevelId] = useState(1);
  const [rivalDifficulty, setRivalDifficulty] = useState<'chill' | 'pro'>('pro');
  const [challengeInput, setChallengeInput] = useState('');
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState(save.playerName);
  const [sensInput, setSensInput] = useState(save.cameraSensitivity);
  const [confirmReset, setConfirmReset] = useState(false);

  const totalStars = Object.values(save.levelStars).reduce((a, b) => a + b, 0);

  const handleLaunchBuiltInRival = () => {
    const level = STORY_LEVELS.find((l) => l.id === rivalLevelId) ?? STORY_LEVELS[0];
    const payload = buildSyntheticRivalChallenge(level, rivalDifficulty);
    onStartStory(level.id, payload);
  };

  const handleLaunchChallengeCode = () => {
    const decoded = decodeChallengeCode(challengeInput);
    if (!decoded) {
      setChallengeError('Invalid Challenge Code. Paste a valid STS1-... code from a finished run.');
      return;
    }
    setChallengeError(null);
    if (decoded.mode === 'timeChallenge') {
      onStartTimeChallenge(decoded.levelId, decoded);
    } else {
      onStartStory(Math.min(20, Math.max(1, decoded.levelId)), decoded);
    }
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-4 pointer-events-auto">
        <div className="bg-slate-950/88 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3">
          <span className="font-display font-bold text-lg text-white tracking-tight whitespace-nowrap">
            Steal The Size
          </span>
          <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
          <span className="text-xs text-slate-300 hidden sm:inline font-mono-num">
            {totalStars}/60 Stars
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-950/88 border border-slate-800 rounded-xl px-3.5 py-2 flex items-center gap-2 font-mono-num text-sm font-bold text-amber-400">
            <Coins className="w-4 h-4" />
            <span>{save.coins}</span>
          </div>
          <button
            onClick={onToggleMute}
            aria-label={save.muted ? 'Unmute Sound' : 'Mute Sound'}
            className="w-10 h-10 rounded-xl bg-slate-950/88 border border-slate-800 text-slate-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            {save.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              setNameInput(save.playerName);
              setSensInput(save.cameraSensitivity);
              setConfirmReset(false);
              setModal('settings');
            }}
            aria-label="Settings"
            className="w-10 h-10 rounded-xl bg-slate-950/88 border border-slate-800 text-slate-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Bottom Dock & Hero Action Strip (keeps center 3D diorama unobstructed!) */}
      <div className="pointer-events-auto max-w-5xl w-full mx-auto bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="max-w-md">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
              Steal the Size of Everything
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Grow gigantic to smash walls and crush bots, or shrink tiny to race at top speed through secret tunnels.
            </p>
          </div>

          {/* Primary Mode Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => setModal('story')}
              className="px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex flex-col items-start gap-1 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Play className="w-4 h-4 fill-current" /> Story Mode
              </span>
              <span className="text-[11px] font-semibold text-slate-900/80 font-mono-num">
                Level {save.unlockedStoryLevel}/20
              </span>
            </button>

            <button
              onClick={onStartEndless}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex flex-col items-start gap-1 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Flame className="w-4 h-4 text-orange-400" /> Endless
              </span>
              <span className="text-[11px] font-normal text-slate-300 font-mono-num">
                Best {save.endlessHighScore.toLocaleString()}
              </span>
            </button>

            <button
              onClick={() => setModal('time')}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex flex-col items-start gap-1 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Timer className="w-4 h-4 text-cyan-400" /> Time Trial
              </span>
              <span className="text-[11px] font-normal text-slate-300">
                5 Speed Runs
              </span>
            </button>

            <button
              onClick={() => setModal('rival')}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex flex-col items-start gap-1 transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Users className="w-4 h-4 text-emerald-400" /> Rival Race
              </span>
              <span className="text-[11px] font-normal text-slate-300">
                Ghost & Codes
              </span>
            </button>
          </div>
        </div>

        {/* Secondary Collection Row */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModal('skins')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Palette className="w-3.5 h-3.5 text-sky-400" />
              Skins ({save.unlockedSkins.length}/{SKINS.length})
            </button>
            <button
              onClick={() => setModal('achievements')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Achievements ({save.unlockedAchievements.length}/{ACHIEVEMENTS.length})
            </button>
          </div>

          <div className="text-slate-400 font-mono-num hidden sm:flex items-center gap-3">
            <span>Walls Smashed: {save.stats.totalWallsSmashed}</span>
            <span>·</span>
            <span>Sizes Stolen: {save.stats.totalSizeSteals}</span>
          </div>
        </div>
      </div>

      {/* Story Mode 20-Level Map Modal */}
      {modal === 'story' && (
        <div className="fixed inset-0 z-30 bg-slate-950/88 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-3xl max-h-[86vh] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <h2 className="font-display text-xl font-bold text-white">Story Mode · 20 Levels</h2>
                <p className="text-xs text-slate-400">
                  4 Worlds · Earn Stars by finding secret gems and beating Par Time
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scroll grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STORY_LEVELS.map((lvl) => {
                const unlocked = lvl.id <= save.unlockedStoryLevel;
                const stars = save.levelStars[lvl.id] ?? 0;
                const best = save.levelBestTime[lvl.id];

                return (
                  <button
                    key={lvl.id}
                    disabled={!unlocked}
                    onClick={() => onStartStory(lvl.id)}
                    className={`text-left p-3.5 rounded-xl border transition-colors ${
                      unlocked
                        ? 'bg-slate-950 hover:bg-slate-800 border-slate-700 cursor-pointer'
                        : 'bg-slate-950/40 border-slate-800/60 opacity-55 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-num text-xs font-bold text-amber-400">
                        LVL {lvl.id}
                      </span>
                      {unlocked ? (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                    <div className="font-display font-bold text-sm text-white mt-1.5 truncate">
                      {lvl.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {lvl.world.toUpperCase()} {best !== undefined ? `· ${best.toFixed(1)}s` : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Time Challenge Modal */}
      {modal === 'time' && (
        <div className="fixed inset-0 z-30 bg-slate-950/88 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <h2 className="font-display text-xl font-bold text-white">Time Challenge</h2>
                <p className="text-xs text-slate-400">
                  Race the countdown clock across 5 speedrun gauntlets
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-2.5 max-h-[70vh] overflow-y-auto custom-scroll">
              {TIME_CHALLENGE_LEVELS.map((tc, idx) => {
                const best = save.timeChallengeBest[tc.id];
                return (
                  <button
                    key={tc.id}
                    onClick={() => onStartTimeChallenge(tc.id)}
                    className="w-full text-left p-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between gap-4 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-display font-bold text-white text-base">
                        {idx + 1}. {tc.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{tc.hint}</div>
                    </div>
                    <div className="text-right shrink-0 font-mono-num">
                      <div className="text-xs text-cyan-400 font-bold">
                        Par {tc.parTime}s
                      </div>
                      <div className="text-xs text-slate-400">
                        {best !== undefined ? `Best ${best.toFixed(1)}s` : 'Unclaimed'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Skins Shop Modal */}
      {modal === 'skins' && (
        <div className="fixed inset-0 z-30 bg-slate-950/88 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <h2 className="font-display text-xl font-bold text-white">Character Skins</h2>
                <p className="text-xs text-slate-400">
                  Balance: <span className="text-amber-400 font-mono-num font-bold">{save.coins} Coins</span>
                </p>
              </div>
              <button
                onClick={() => {
                  onPreviewSkin(save.equippedSkin);
                  setModal(null);
                }}
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto custom-scroll">
              {SKINS.map((skin) => {
                const owned = save.unlockedSkins.includes(skin.id);
                const equipped = save.equippedSkin === skin.id;
                const canAfford = save.coins >= skin.price;

                return (
                  <div
                    key={skin.id}
                    onMouseEnter={() => onPreviewSkin(skin.id)}
                    className={`p-4 rounded-xl border transition-colors ${
                      equipped
                        ? 'bg-slate-800 border-amber-400'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-7 h-7 rounded-lg border border-white/20 shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${skin.primaryColor}, ${skin.accentColor})`,
                          }}
                        />
                        <div>
                          <div className="font-display font-bold text-white text-sm">
                            {skin.name}
                          </div>
                          <div className="text-[11px] text-slate-400">{skin.tagline}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end">
                      {equipped ? (
                        <span className="text-xs font-bold text-amber-400 inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Equipped
                        </span>
                      ) : owned ? (
                        <button
                          onClick={() => onUnlockOrEquipSkin(skin.id)}
                          className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          Equip
                        </button>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() => onUnlockOrEquipSkin(skin.id)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs font-mono-num ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          Unlock · {skin.price} Coins
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Achievements Modal */}
      {modal === 'achievements' && (
        <div className="fixed inset-0 z-30 bg-slate-950/88 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <h2 className="font-display text-xl font-bold text-white">Achievements</h2>
                <p className="text-xs text-slate-400">
                  Unlocked {save.unlockedAchievements.length} of {ACHIEVEMENTS.length}
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto custom-scroll">
              {ACHIEVEMENTS.map((ach) => {
                const unlocked = save.unlockedAchievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`p-3.5 rounded-xl border ${
                      unlocked
                        ? 'bg-emerald-950/40 border-emerald-700/60'
                        : 'bg-slate-950 border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-sm text-white inline-flex items-center gap-1.5">
                        <Award
                          className={`w-4 h-4 ${unlocked ? 'text-emerald-400' : 'text-slate-600'}`}
                        />
                        {ach.title}
                      </span>
                      <span className="text-xs font-mono-num text-amber-400">
                        +{ach.rewardCoins}c
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{ach.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Rival Race & Friend Challenge Code Modal */}
      {modal === 'rival' && (
        <div className="fixed inset-0 z-30 bg-slate-950/88 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-white">
                  Rival & Friend Ghost Race
                </h2>
                <p className="text-xs text-slate-400">
                  Race a simulated rival or paste a friend’s Challenge Code
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-300 mb-2">
                Race Built-in Rival Ghost
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <select
                  value={rivalLevelId}
                  onChange={(e) => setRivalLevelId(Number(e.target.value))}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  {STORY_LEVELS.filter((l) => l.id <= save.unlockedStoryLevel).map((l) => (
                    <option key={l.id} value={l.id}>
                      Level {l.id}: {l.name}
                    </option>
                  ))}
                </select>
                <select
                  value={rivalDifficulty}
                  onChange={(e) => setRivalDifficulty(e.target.value as 'chill' | 'pro')}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="chill">Pip (Casual)</option>
                  <option value="pro">Nova (Pro)</option>
                </select>
              </div>
              <button
                onClick={handleLaunchBuiltInRival}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
              >
                Start Rival Race
              </button>
            </div>

            <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-300 mb-2">
                Paste Friend Challenge Code
              </div>
              <input
                type="text"
                value={challengeInput}
                onChange={(e) => setChallengeInput(e.target.value)}
                placeholder="STS1-..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono-num"
              />
              {challengeError && (
                <p className="text-xs text-rose-400 mt-1.5">{challengeError}</p>
              )}
              <button
                onClick={handleLaunchChallengeCode}
                className="mt-3 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Load & Race Friend Ghost
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {modal === 'settings' && (
        <div className="fixed inset-0 z-30 bg-slate-950/88 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-white">Settings</h2>
              <button
                onClick={() => setModal(null)}
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Player Name</label>
                <input
                  type="text"
                  maxLength={18}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Camera Orbit Sensitivity ({sensInput.toFixed(1)}x)
                </label>
                <input
                  type="range"
                  min="0.4"
                  max="2.0"
                  step="0.1"
                  value={sensInput}
                  onChange={(e) => setSensInput(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <button
                onClick={() => {
                  onUpdateSettings(nameInput.trim() || 'Player 1', sensInput);
                  setModal(null);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
              >
                Save Settings
              </button>

              <div className="pt-3 border-t border-slate-800">
                {!confirmReset ? (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="w-full py-2 rounded-xl bg-slate-950 border border-rose-900/60 text-rose-400 text-xs font-semibold hover:bg-rose-950/40 cursor-pointer"
                  >
                    Reset Saved Progress
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onResetProgress();
                      setModal(null);
                    }}
                    className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Confirm Wipe All Save Data
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
