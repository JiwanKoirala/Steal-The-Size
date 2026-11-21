import React, { useRef, useState } from 'react';
import {
  Award,
  Check,
  Copy,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Timer,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { ACHIEVEMENTS } from '../data/achievements';
import { soundEngine } from '../audio/soundEngine';
import { encodeChallengeCode } from '../game/multiplayer/MultiplayerAdapter';
import { HudState, RunResult } from '../types/game';

interface GameHUDProps {
  hud: HudState;
  paused: boolean;
  result: RunResult | null;
  muted: boolean;
  playerName: string;
  equippedSkin: string;
  onToggleMute: () => void;
  onPauseToggle: () => void;
  onRestart: () => void;
  onNextLevel: () => void;
  onQuitToMenu: () => void;
  onJoystickMove: (x: number, y: number) => void;
  onJumpPress: () => void;
  onCameraDrag: (dx: number, dy: number) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  paused,
  result,
  muted,
  playerName,
  equippedSkin,
  onToggleMute,
  onPauseToggle,
  onRestart,
  onNextLevel,
  onQuitToMenu,
  onJoystickMove,
  onJumpPress,
  onCameraDrag,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });
  const joyOrigin = useRef<{ x: number; y: number; id: number } | null>(null);
  const dragOrigin = useRef<{ x: number; y: number; id: number } | null>(null);

  const scaleNorm = Math.min(100, Math.max(0, ((hud.scale - 0.35) / (3.2 - 0.35)) * 100));
  const isTiny = hud.scale <= 0.65;
  const isBig = hud.scale >= 1.55;

  const handleCameraPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOrigin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };

  const handleCameraPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current || dragOrigin.current.id !== e.pointerId) return;
    const dx = e.clientX - dragOrigin.current.x;
    const dy = e.clientY - dragOrigin.current.y;
    dragOrigin.current.x = e.clientX;
    dragOrigin.current.y = e.clientY;
    onCameraDrag(dx, dy);
  };

  const handleCameraPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragOrigin.current?.id === e.pointerId) {
      dragOrigin.current = null;
    }
  };

  const handleJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    joyOrigin.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      id: e.pointerId,
    };
    updateJoyFromClient(e.clientX, e.clientY);
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joyOrigin.current || joyOrigin.current.id !== e.pointerId) return;
    updateJoyFromClient(e.clientX, e.clientY);
  };

  const handleJoyUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyOrigin.current?.id === e.pointerId) {
      joyOrigin.current = null;
      setJoyKnob({ x: 0, y: 0 });
      onJoystickMove(0, 0);
    }
  };

  const updateJoyFromClient = (cx: number, cy: number) => {
    if (!joyOrigin.current) return;
    const maxR = 42;
    let dx = cx - joyOrigin.current.x;
    let dy = cy - joyOrigin.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setJoyKnob({ x: dx, y: dy });
    onJoystickMove(dx / maxR, dy / maxR);
  };

  const handleCopyChallenge = () => {
    if (!result?.ghostFrames) return;
    const code = encodeChallengeCode({
      seed: result.levelId * 101,
      mode: result.mode,
      levelId: result.levelId,
      challengerName: playerName,
      challengerSkin: equippedSkin,
      targetScore: result.score,
      targetTime: result.elapsed,
      frames: result.ghostFrames,
    });
    navigator.clipboard?.writeText(code).catch(() => {});
    soundEngine.playClick();
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  return (
    <div
      className="fixed inset-0 z-10 pointer-events-auto flex flex-col justify-between"
      onPointerDown={handleCameraPointerDown}
      onPointerMove={handleCameraPointerMove}
      onPointerUp={handleCameraPointerUp}
      onPointerCancel={handleCameraPointerUp}
    >
      {/* Top Minimal HUD */}
      <div className="flex items-start justify-between gap-4 p-3 sm:p-4 pointer-events-none">
        {/* Top-Left: Level Info + Hearts + Score */}
        <div className="bg-slate-950/88 border border-slate-800 rounded-xl px-3.5 py-2.5 shadow-lg pointer-events-auto max-w-[68vw]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-display font-bold text-sm sm:text-base text-white tracking-tight whitespace-nowrap">
              {hud.levelName}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <div className="flex items-center gap-1" aria-label={`Health ${hud.health} of ${hud.maxHealth}`}>
              {Array.from({ length: hud.maxHealth }, (_, i) => (
                <Heart
                  key={i}
                  className={`w-4 h-4 ${
                    i < hud.health ? 'text-rose-500 fill-rose-500' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300 font-mono-num">
            <span className="text-amber-400 font-semibold">{hud.coinsRun} Coins</span>
            {hud.mode === 'story' && (
              <>
                <span className="text-slate-600">/</span>
                <span className="text-yellow-300 font-semibold">
                  {hud.starsCollected}/{hud.totalStars} Stars
                </span>
              </>
            )}
            {hud.mode === 'endless' && (
              <>
                <span className="text-slate-600">/</span>
                <span className="text-cyan-300 font-semibold">Wave {hud.wave}</span>
              </>
            )}
            <span className="text-slate-600">/</span>
            <span className="inline-flex items-center gap-1">
              <Timer className="w-3.5 h-3.5 text-slate-400" />
              {hud.timeRemaining !== null ? (
                <span className={hud.timeRemaining < 8 ? 'text-rose-400 font-bold' : 'text-cyan-300'}>
                  {hud.timeRemaining.toFixed(1)}s
                </span>
              ) : (
                <span>{hud.elapsed.toFixed(1)}s</span>
              )}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold">{hud.score.toLocaleString()} pts</span>
            {hud.combo > 1 && (
              <span className="text-orange-400 font-bold">x{hud.combo}</span>
            )}
          </div>

          {hud.rivalDistance !== null && (
            <div className="mt-1 text-xs font-mono-num">
              <span className={hud.rivalDistance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                Rival Ghost: {hud.rivalDistance >= 0 ? `+${hud.rivalDistance}m Ahead` : `${hud.rivalDistance}m Behind`}
              </span>
            </div>
          )}
        </div>

        {/* Top-Right: Quick Action Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleMute}
            title={muted ? 'Unmute Sound' : 'Mute Sound'}
            className="w-10 h-10 rounded-xl bg-slate-950/88 border border-slate-800 text-slate-200 hover:bg-slate-900 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onRestart}
            title="Restart Level (R)"
            className="w-10 h-10 rounded-xl bg-slate-950/88 border border-slate-800 text-slate-200 hover:bg-slate-900 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onPauseToggle}
            title="Pause (Esc)"
            className="w-10 h-10 rounded-xl bg-slate-950/88 border border-slate-800 text-slate-200 hover:bg-slate-900 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Transient Event Toast (Top Center, non-blocking) */}
      {hud.toastText && !paused && !result && (
        <div className="self-center pointer-events-none px-4 py-2 rounded-xl bg-slate-950/90 border border-slate-700 text-white text-xs sm:text-sm font-semibold shadow-xl">
          {hud.toastText}
        </div>
      )}

      {/* Bottom Controls & Scale Meter */}
      <div className="flex items-end justify-between p-3 sm:p-4 gap-3 pointer-events-none">
        {/* Mobile / Touch Virtual Joystick (visible on touch/small viewports, subtle) */}
        <div
          onPointerDown={handleJoyDown}
          onPointerMove={handleJoyMove}
          onPointerUp={handleJoyUp}
          onPointerCancel={handleJoyUp}
          className="md:hidden pointer-events-auto relative w-28 h-28 rounded-full bg-slate-950/70 border border-slate-700/80 flex items-center justify-center touch-none shrink-0"
          aria-label="Move Joystick"
        >
          <div
            className="w-12 h-12 rounded-full bg-sky-500/85 border-2 border-white shadow-md"
            style={{
              transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
            }}
          />
        </div>

        {/* Desktop spacer */}
        <div className="hidden md:block text-xs text-slate-300/85 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 whitespace-nowrap">
          WASD Move · Space Jump · Drag/Q/E Camera · R Restart
        </div>

        {/* Bottom-Center Scale & Speed Readout */}
        <div className="pointer-events-auto mx-auto bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2.5 shadow-xl min-w-[230px] sm:min-w-[320px]">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span
              className={`font-display font-bold text-sm ${
                isTiny ? 'text-cyan-400' : isBig ? 'text-amber-400' : 'text-white'
              }`}
            >
              {hud.scale.toFixed(2)}x · {hud.strengthTier}
            </span>
            <span className="font-mono-num text-slate-300">
              Speed {hud.speedMultiplier.toFixed(2)}x
            </span>
          </div>

          {/* Scale Meter Bar */}
          <div className="mt-1.5 h-2 rounded-full bg-slate-800 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-100 ${
                isTiny ? 'bg-cyan-400' : isBig ? 'bg-amber-400' : 'bg-blue-500'
              }`}
              style={{ width: `${scaleNorm}%` }}
            />
          </div>

          {/* Active Power-Up Timers */}
          {(hud.powerUps.speed > 0 ||
            hud.powerUps.shield > 0 ||
            hud.powerUps.magnet > 0 ||
            hud.powerUps.surge > 0) && (
            <div className="mt-2 flex items-center gap-3 text-[11px] font-mono-num text-slate-200">
              {hud.powerUps.speed > 0 && (
                <span className="inline-flex items-center gap-1 text-cyan-300">
                  <Zap className="w-3 h-3" /> Turbo {hud.powerUps.speed.toFixed(0)}s
                </span>
              )}
              {hud.powerUps.shield > 0 && (
                <span className="inline-flex items-center gap-1 text-blue-300">
                  <Shield className="w-3 h-3" /> Shield {hud.powerUps.shield.toFixed(0)}s
                </span>
              )}
              {hud.powerUps.magnet > 0 && (
                <span className="inline-flex items-center gap-1 text-pink-300">
                  <Sparkles className="w-3 h-3" /> Magnet {hud.powerUps.magnet.toFixed(0)}s
                </span>
              )}
              {hud.powerUps.surge > 0 && (
                <span className="inline-flex items-center gap-1 text-purple-300">
                  <Award className="w-3 h-3" /> Surge {hud.powerUps.surge.toFixed(0)}s
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mobile Jump Button */}
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            onJumpPress();
          }}
          className="md:hidden pointer-events-auto w-20 h-20 rounded-full bg-amber-500 active:bg-amber-400 text-slate-950 font-display font-bold text-base border-2 border-white shadow-lg shrink-0"
        >
          JUMP
        </button>

        <div className="hidden md:block w-36" />
      </div>

      {/* Pause Overlay */}
      {paused && !result && (
        <div className="fixed inset-0 z-30 bg-slate-950/85 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-white">Game Paused</h2>
            <p className="text-sm text-slate-400 mt-1">{hud.levelHint}</p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={onPauseToggle}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
              >
                Resume Game
              </button>
              <button
                onClick={onRestart}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                Restart Level
              </button>
              <button
                onClick={onQuitToMenu}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition-colors cursor-pointer"
              >
                Back to Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory / Defeat Modal */}
      {result && (
        <div className="fixed inset-0 z-30 bg-slate-950/88 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400">
                  {result.mode === 'story'
                    ? `Story Level ${result.levelId}`
                    : result.mode === 'timeChallenge'
                    ? 'Time Challenge'
                    : 'Endless Survival'}
                </p>
                <h2 className="font-display text-2xl font-bold text-white mt-0.5">
                  {result.victory
                    ? 'Level Complete!'
                    : result.mode === 'endless'
                    ? `Survived to Wave ${result.waveReached}`
                    : 'Run Ended'}
                </h2>
              </div>

              {result.victory && result.mode === 'story' && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`w-6 h-6 ${
                        s <= result.starsEarned
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-xs text-slate-400">Time</div>
                <div className="font-mono-num font-bold text-white text-lg">
                  {result.elapsed.toFixed(1)}s
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-xs text-slate-400">Final Score</div>
                <div className="font-mono-num font-bold text-cyan-400 text-lg">
                  {result.score.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-xs text-slate-400">Coins Earned</div>
                <div className="font-mono-num font-bold text-amber-400 text-lg">
                  +{result.coinsEarned}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-xs text-slate-400">Smashes / Steals</div>
                <div className="font-mono-num font-bold text-white text-lg">
                  {result.wallsSmashed} / {result.sizeSteals}
                </div>
              </div>
            </div>

            {result.newlyUnlockedAchievements.length > 0 && (
              <div className="mt-4 bg-emerald-950/60 border border-emerald-700/50 rounded-xl p-3">
                <div className="text-xs font-semibold text-emerald-300">
                  Achievements Unlocked
                </div>
                <div className="mt-1 space-y-1">
                  {result.newlyUnlockedAchievements.map((id) => {
                    const def = ACHIEVEMENTS.find((a) => a.id === id);
                    return (
                      <div key={id} className="text-xs text-white flex justify-between">
                        <span>{def?.title ?? id}</span>
                        <span className="text-amber-300 font-mono-num">
                          +{def?.rewardCoins ?? 0} Coins
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2.5">
              {result.victory && result.mode === 'story' && result.levelId < 20 && (
                <button
                  onClick={onNextLevel}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
                >
                  Next Level ({result.levelId + 1})
                </button>
              )}

              {result.victory && result.ghostFrames && result.ghostFrames.length > 0 && (
                <button
                  onClick={handleCopyChallenge}
                  className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4" /> Challenge Code Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Friend Challenge Code
                    </>
                  )}
                </button>
              )}

              <div className="flex gap-2.5">
                <button
                  onClick={onRestart}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors cursor-pointer"
                >
                  Play Again
                </button>
                <button
                  onClick={onQuitToMenu}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Main Menu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
