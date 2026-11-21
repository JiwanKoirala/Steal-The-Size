import { ChallengePayload, GameMode, GhostKeyframe, LevelDef } from '../../types/game';

/**
 * Multiplayer-ready transport contract for future real-time WebSocket / WebRTC friend rooms
 * as well as asynchronous ghost racing & challenge codes today.
 */
export interface RemotePlayerSnapshot {
  playerId: string;
  playerName: string;
  skinId: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale: number;
  timestamp: number;
}

export interface MultiplayerTransport {
  readonly mode: 'ghost' | 'websocket';
  connect(roomCode: string): Promise<void>;
  disconnect(): void;
  sendLocalSnapshot(snapshot: RemotePlayerSnapshot): void;
  onRemoteSnapshot(listener: (snapshot: RemotePlayerSnapshot) => void): () => void;
}

/**
 * Records player keyframes at ~10 Hz so any completed run can be exported as a
 * shareable Challenge Code for friend competitions.
 */
export class GhostRecorder {
  private frames: GhostKeyframe[] = [];
  private lastSampleTime = -1;
  private readonly interval = 0.1;

  reset() {
    this.frames = [];
    this.lastSampleTime = -1;
  }

  sample(t: number, x: number, y: number, z: number, ry: number, s: number) {
    if (this.lastSampleTime < 0 || t - this.lastSampleTime >= this.interval) {
      this.lastSampleTime = t;
      this.frames.push({
        t: Number(t.toFixed(2)),
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        z: Number(z.toFixed(2)),
        ry: Number(ry.toFixed(2)),
        s: Number(s.toFixed(2)),
      });
    }
  }

  getFrames(): GhostKeyframe[] {
    return this.frames;
  }
}

/**
 * Interpolates a rival ghost's transform smoothly at any elapsed timestamp.
 */
export class GhostReplayer {
  private frames: GhostKeyframe[];
  private cursor = 0;

  constructor(frames: GhostKeyframe[]) {
    this.frames = frames;
  }

  reset() {
    this.cursor = 0;
  }

  sampleAt(t: number, out: { x: number; y: number; z: number; ry: number; s: number }): boolean {
    if (this.frames.length === 0) return false;
    while (this.cursor < this.frames.length - 2 && this.frames[this.cursor + 1].t <= t) {
      this.cursor++;
    }
    const a = this.frames[this.cursor];
    const b = this.frames[Math.min(this.cursor + 1, this.frames.length - 1)];
    if (a === b || b.t <= a.t) {
      out.x = a.x;
      out.y = a.y;
      out.z = a.z;
      out.ry = a.ry;
      out.s = a.s;
      return true;
    }
    const alpha = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
    out.x = a.x + (b.x - a.x) * alpha;
    out.y = a.y + (b.y - a.y) * alpha;
    out.z = a.z + (b.z - a.z) * alpha;
    // Shortest angle interpolation
    let diff = b.ry - a.ry;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    out.ry = a.ry + diff * alpha;
    out.s = a.s + (b.s - a.s) * alpha;
    return true;
  }
}

/**
 * Local Ghost Transport implementing MultiplayerTransport so the game engine treats
 * local/shared-code rivals identically to future live WebSocket peers.
 */
export class LocalGhostTransport implements MultiplayerTransport {
  readonly mode = 'ghost' as const;
  private replayer: GhostReplayer;
  private listeners = new Set<(snapshot: RemotePlayerSnapshot) => void>();
  private rivalName: string;
  private rivalSkin: string;
  private sampleOut = { x: 0, y: 0, z: 0, ry: 0, s: 1 };

  constructor(payload: ChallengePayload) {
    this.replayer = new GhostReplayer(payload.frames);
    this.rivalName = payload.challengerName;
    this.rivalSkin = payload.challengerSkin;
  }

  async connect(_roomCode: string): Promise<void> {
    this.replayer.reset();
  }

  disconnect(): void {
    this.listeners.clear();
  }

  sendLocalSnapshot(snapshot: RemotePlayerSnapshot): void {
    // When local player reports time/position, advance ghost stream to same timestamp
    if (this.replayer.sampleAt(snapshot.timestamp, this.sampleOut)) {
      const rivalSnap: RemotePlayerSnapshot = {
        playerId: 'rival-ghost',
        playerName: this.rivalName,
        skinId: this.rivalSkin,
        x: this.sampleOut.x,
        y: this.sampleOut.y,
        z: this.sampleOut.z,
        rotY: this.sampleOut.ry,
        scale: this.sampleOut.s,
        timestamp: snapshot.timestamp,
      };
      this.listeners.forEach((cb) => cb(rivalSnap));
    }
  }

  onRemoteSnapshot(listener: (snapshot: RemotePlayerSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/**
 * Synthesizes a clean rival ghost path across any level so players can immediately race
 * a friend-style rival or generate a custom Challenge Code to share.
 */
export function buildSyntheticRivalChallenge(level: LevelDef, difficulty: 'chill' | 'pro' = 'pro'): ChallengePayload {
  const duration = Math.max(8, level.parTime * (difficulty === 'pro' ? 0.92 : 1.18));
  const steps = Math.ceil(duration * 10);
  const frames: GhostKeyframe[] = [];

  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const t = Number((u * duration).toFixed(2));
    const sx = level.spawn.x;
    const sz = level.spawn.z;
    const gx = level.goal.x;
    const gz = level.goal.z;
    const wobble = Math.sin(u * Math.PI * 3) * 1.4;
    const x = sx + (gx - sx) * u + wobble;
    const z = sz + (gz - sz) * u;
    const y = Math.abs(Math.sin(u * Math.PI * 6)) * 0.45;
    const scale = 1.0 + Math.sin(u * Math.PI * 2) * 0.6;
    const ry = Math.atan2(gx - sx, gz - sz);
    frames.push({
      t,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      z: Number(z.toFixed(2)),
      ry: Number(ry.toFixed(2)),
      s: Number(Math.max(0.4, scale).toFixed(2)),
    });
  }

  return {
    seed: level.id * 101,
    mode: level.mode,
    levelId: level.id,
    challengerName: difficulty === 'pro' ? 'Nova (Pro Rival)' : 'Pip (Casual Rival)',
    challengerSkin: difficulty === 'pro' ? 'crimson_ninja' : 'emerald_sprout',
    targetScore: 1400,
    targetTime: Number(duration.toFixed(1)),
    frames,
  };
}

export function encodeChallengeCode(payload: ChallengePayload): string {
  // Downsample frames to <= 120 keyframes for compact copy-paste codes
  const maxFrames = 120;
  const stride = Math.max(1, Math.ceil(payload.frames.length / maxFrames));
  const compactFrames = payload.frames.filter((_, i) => i % stride === 0);
  const compact: ChallengePayload = { ...payload, frames: compactFrames };
  const json = JSON.stringify(compact);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return `STS1-${btoa(bin)}`;
}

export function decodeChallengeCode(code: string): ChallengePayload | null {
  try {
    const trimmed = code.trim();
    if (!trimmed.startsWith('STS1-')) return null;
    const b64 = trimmed.slice(5);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as ChallengePayload;
    if (!parsed || typeof parsed.levelId !== 'number' || !Array.isArray(parsed.frames)) {
      return null;
    }
    const validModes: GameMode[] = ['story', 'endless', 'timeChallenge'];
    if (!validModes.includes(parsed.mode)) return null;
    return parsed;
  } catch {
    return null;
  }
}
