import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { GameHUD } from './components/GameHUD';
import { MainMenu } from './components/MainMenu';
import { buildEndlessLevel, buildStoryLevel, TIME_CHALLENGE_LEVELS } from './data/levels';
import { SKINS } from './data/skins';
import { StealTheSizeEngine } from './game/StealTheSizeEngine';
import {
  applyRunCompletion,
  loadSaveData,
  resetSaveData,
  writeSaveData,
} from './storage/saveSystem';
import { ChallengePayload, GameMode, HudState, RunResult, SaveData } from './types/game';

const INITIAL_HUD: HudState = {
  scale: 1.0,
  speedMultiplier: 1.0,
  strengthTier: 'Normal',
  health: 3,
  maxHealth: 3,
  coinsRun: 0,
  starsCollected: 0,
  totalStars: 3,
  score: 0,
  elapsed: 0,
  timeRemaining: null,
  wave: 1,
  combo: 1,
  powerUps: { speed: 0, shield: 0, magnet: 0, surge: 0 },
  toastText: null,
  levelName: 'Steal The Size',
  levelHint: '',
  mode: 'story',
  levelId: 1,
  rivalDistance: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<StealTheSizeEngine | null>(null);

  const [save, setSave] = useState<SaveData>(() => {
    const loaded = loadSaveData();
    soundEngine.setMuted(loaded.muted);
    return loaded;
  });

  const [screen, setScreen] = useState<'menu' | 'playing'>('menu');
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [runResult, setRunResult] = useState<RunResult | null>(null);

  const activeRunRef = useRef<{
    mode: GameMode;
    levelId: number;
    rival: ChallengePayload | null;
  }>({ mode: 'story', levelId: 1, rival: null });

  const saveRef = useRef(save);
  saveRef.current = save;

  const screenRef = useRef(screen);
  screenRef.current = screen;

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const resultRef = useRef(runResult);
  resultRef.current = runResult;

  // Mount Three.js Engine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new StealTheSizeEngine(mount, {
      onHudUpdate: (nextHud) => setHud(nextHud),
      onRunComplete: (result, extremes) => {
        const { updated, newAchievements } = applyRunCompletion(
          saveRef.current,
          result,
          extremes,
        );
        setSave(updated);
        setRunResult({
          ...result,
          newlyUnlockedAchievements: newAchievements,
        });
        engine.setPaused(true);
      },
    });

    engine.setSkin(saveRef.current.equippedSkin);
    engine.setSettings(saveRef.current.playerName, saveRef.current.cameraSensitivity);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const launchLevel = useCallback(
    (mode: GameMode, levelId: number, rival: ChallengePayload | null = null) => {
      const engine = engineRef.current;
      if (!engine) return;

      soundEngine.playClick();
      activeRunRef.current = { mode, levelId, rival };
      setRunResult(null);
      setPaused(false);
      setScreen('playing');

      const def =
        mode === 'story'
          ? buildStoryLevel(levelId)
          : mode === 'timeChallenge'
          ? TIME_CHALLENGE_LEVELS.find((t) => t.id === levelId) ?? TIME_CHALLENGE_LEVELS[0]
          : buildEndlessLevel(1);

      engine.startRun(mode, def, saveRef.current.equippedSkin, rival);
    },
    [],
  );

  const handleRestart = useCallback(() => {
    const { mode, levelId, rival } = activeRunRef.current;
    launchLevel(mode, levelId, rival);
  }, [launchLevel]);

  const handleQuitToMenu = useCallback(() => {
    soundEngine.playClick();
    setRunResult(null);
    setPaused(false);
    setScreen('menu');
    engineRef.current?.startMenuDiorama(saveRef.current.equippedSkin);
  }, []);

  // Keyboard Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screenRef.current !== 'playing') return;
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (!resultRef.current) {
          const next = !pausedRef.current;
          setPaused(next);
          engineRef.current?.setPaused(next);
        }
        return;
      }
      if (e.code === 'KeyR') {
        handleRestart();
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
      }
      engineRef.current?.setKey(e.code, true);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      engineRef.current?.setKey(e.code, false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleRestart]);

  const handleToggleMute = () => {
    const nextMuted = !save.muted;
    soundEngine.setMuted(nextMuted);
    if (!nextMuted) soundEngine.playClick();
    const updated = { ...save, muted: nextMuted };
    setSave(updated);
    writeSaveData(updated);
  };

  const handleUnlockOrEquipSkin = (skinId: string) => {
    const skin = SKINS.find((s) => s.id === skinId);
    if (!skin) return;
    soundEngine.playClick();

    if (save.unlockedSkins.includes(skinId)) {
      const updated = { ...save, equippedSkin: skinId };
      setSave(updated);
      writeSaveData(updated);
      engineRef.current?.setSkin(skinId);
      return;
    }

    if (save.coins >= skin.price) {
      soundEngine.playStar();
      const updated: SaveData = {
        ...save,
        coins: save.coins - skin.price,
        unlockedSkins: [...save.unlockedSkins, skinId],
        equippedSkin: skinId,
      };
      setSave(updated);
      writeSaveData(updated);
      engineRef.current?.setSkin(skinId);
    }
  };

  const handleUpdateSettings = (name: string, sensitivity: number) => {
    soundEngine.playClick();
    const updated = { ...save, playerName: name, cameraSensitivity: sensitivity };
    setSave(updated);
    writeSaveData(updated);
    engineRef.current?.setSettings(name, sensitivity);
  };

  const handleResetProgress = () => {
    const fresh = resetSaveData();
    soundEngine.setMuted(fresh.muted);
    setSave(fresh);
    engineRef.current?.setSkin(fresh.equippedSkin);
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      {/* Dedicated WebGL Container */}
      <div ref={canvasMountRef} className="fixed inset-0 w-full h-full" />

      {screen === 'menu' ? (
        <MainMenu
          save={save}
          onStartStory={(lvlId, rival) => launchLevel('story', lvlId, rival ?? null)}
          onStartEndless={() => launchLevel('endless', 201, null)}
          onStartTimeChallenge={(tcId, rival) => launchLevel('timeChallenge', tcId, rival ?? null)}
          onPreviewSkin={(skinId) => engineRef.current?.setSkin(skinId)}
          onUnlockOrEquipSkin={handleUnlockOrEquipSkin}
          onToggleMute={handleToggleMute}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={handleResetProgress}
        />
      ) : (
        <GameHUD
          hud={hud}
          paused={paused}
          result={runResult}
          muted={save.muted}
          playerName={save.playerName}
          equippedSkin={save.equippedSkin}
          onToggleMute={handleToggleMute}
          onPauseToggle={() => {
            const next = !paused;
            setPaused(next);
            engineRef.current?.setPaused(next);
          }}
          onRestart={handleRestart}
          onNextLevel={() => {
            const nextId = Math.min(20, activeRunRef.current.levelId + 1);
            launchLevel('story', nextId, null);
          }}
          onQuitToMenu={handleQuitToMenu}
          onJoystickMove={(x, y) => engineRef.current?.setJoystick(x, y)}
          onJumpPress={() => engineRef.current?.triggerJump()}
          onCameraDrag={(dx, dy) => engineRef.current?.orbitCamera(dx, dy)}
        />
      )}
    </div>
  );
}
