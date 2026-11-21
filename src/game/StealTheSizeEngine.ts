import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/soundEngine';
import { buildEndlessLevel, buildStoryLevel } from '../data/levels';
import {
  ActivePowerUps,
  ChallengePayload,
  GameMode,
  HudState,
  LevelDef,
  PlatformDef,
  PowerUpKind,
  RunResult,
} from '../types/game';
import {
  buildOutdoorBackdrop,
  createBadgeSprite,
  createBrickTexture,
  createCollectibleGroup,
  createEnemyGroup,
  createFloorTexture,
  createGoalPortal,
  createHazardTexture,
  createPlayerRig,
  createSizePropGroup,
  PlayerRig,
  WORLD_PALETTES,
} from './models/MeshFactory';
import {
  GhostRecorder,
  LocalGhostTransport,
  MultiplayerTransport,
} from './multiplayer/MultiplayerAdapter';

// Module-scope scratch objects to avoid per-frame GC
const _moveDir = new THREE.Vector3();
const _camOffset = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _tmpColor = new THREE.Color();

interface RuntimePlatform {
  def: PlatformDef;
  mesh: THREE.Mesh;
  curX: number;
  curY: number;
  curZ: number;
  prevX: number;
  prevZ: number;
}

interface RuntimeWall {
  id: string;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  breakScale?: number;
  tunnelMaxScale?: number;
  tunnelHeight?: number;
  gatePlateId?: string;
  mesh: THREE.Object3D;
  broken: boolean;
  gateOpenAmount: number;
}

interface RuntimePushBlock {
  id: string;
  x: number;
  z: number;
  size: number;
  requiredScale: number;
  mesh: THREE.Group;
}

interface RuntimePlate {
  id: string;
  x: number;
  z: number;
  radius: number;
  latch: boolean;
  requiredScale: number;
  pressed: boolean;
  padMesh: THREE.Mesh;
}

interface RuntimeSizeProp {
  id: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  cooldown: number;
  group: THREE.Group;
  visualMesh: THREE.Group;
  ring: THREE.Mesh;
  badge: THREE.Sprite;
}

interface RuntimeEnemy {
  id: string;
  kind: 'chomper' | 'drone' | 'saw' | 'laser';
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  x: number;
  z: number;
  speed: number;
  crushScale: number;
  clearanceHeight: number;
  width: number;
  phase: number;
  alive: boolean;
  mesh: THREE.Group;
}

interface RuntimeCollectible {
  id: string;
  kind: 'coin' | 'star' | PowerUpKind;
  x: number;
  y: number;
  z: number;
  collected: boolean;
  mesh: THREE.Group;
}

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  life: number;
  maxLife: number;
  gravity: number;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudState) => void;
  onRunComplete: (result: RunResult, extremes: { minScale: number; maxScale: number }) => void;
}

export class StealTheSizeEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private levelRoot = new THREE.Group();
  private particleRoot = new THREE.Group();
  private playerRig: PlayerRig | null = null;
  private rivalRig: PlayerRig | null = null;
  private shieldBubble: THREE.Mesh | null = null;

  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();

  // Mode & State
  private isDemoMode = true;
  private paused = false;
  private level: LevelDef | null = null;
  private activeSkinId = 'volt_blob';
  private playerName = 'Player 1';
  private cameraSensitivity = 1.0;

  // Player Physics
  private px = 0;
  private py = 0;
  private pz = 0;
  private vx = 0;
  private vy = 0;
  private vz = 0;
  private rotY = Math.PI;
  private actualScale = 1.0;
  private targetScale = 1.0;
  private scalePop = 0;
  private grounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private hitInvulnTimer = 0;
  private walkPhase = 0;
  private blinkTimer = 3.0;

  // Camera
  private camYaw = 0;
  private camPitch = 0.48;
  private camDist = 11;
  private shakeIntensity = 0;

  // Input
  private keys = new Set<string>();
  private joyX = 0;
  private joyY = 0;

  // Run Metrics
  private health = 3;
  private maxHealth = 3;
  private coinsRun = 0;
  private starsCollected = 0;
  private totalStars = 3;
  private score = 0;
  private elapsed = 0;
  private wave = 1;
  private waveCoinsGoal = 5;
  private waveCoinsProgress = 0;
  private combo = 1;
  private comboTimer = 0;
  private wallsSmashed = 0;
  private enemiesCrushed = 0;
  private sizeSteals = 0;
  private minScaleReached = 1;
  private maxScaleReached = 1;
  private powerUps: ActivePowerUps = { speed: 0, shield: 0, magnet: 0, surge: 0 };
  private toastText: string | null = null;
  private toastTimer = 0;
  private hudEmitTimer = 0;
  private runFinished = false;

  // Level Runtime Entities
  private platforms: RuntimePlatform[] = [];
  private walls: RuntimeWall[] = [];
  private pushBlocks: RuntimePushBlock[] = [];
  private plates: RuntimePlate[] = [];
  private sizeProps: RuntimeSizeProp[] = [];
  private enemies: RuntimeEnemy[] = [];
  private collectibles: RuntimeCollectible[] = [];
  private particles: Particle[] = [];
  private portalGroup: THREE.Group | null = null;
  private portalRing: THREE.Mesh | null = null;
  private portalCore: THREE.Mesh | null = null;
  private portalActive = true;

  // Multiplayer / Ghost
  private ghostRecorder = new GhostRecorder();
  private transport: MultiplayerTransport | null = null;
  private rivalState: { active: boolean; x: number; y: number; z: number; ry: number; s: number } = {
    active: false,
    x: 0,
    y: 0,
    z: 0,
    ry: 0,
    s: 1,
  };

  // Shared Geometries for debris particles
  private debrisGeo = new THREE.BoxGeometry(0.32, 0.32, 0.32);

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.maxAnisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(58, w / h, 0.1, 240);

    // 3-point lighting rig
    this.hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x3f6212, 0.72);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.45);
    this.dirLight.position.set(16, 28, 14);
    this.dirLight.castShadow = !this.isSoftwareGl;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    this.dirLight.shadow.camera.near = 2;
    this.dirLight.shadow.camera.far = 75;
    const d = 24;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.45);
    rimLight.position.set(-14, 12, -18);
    this.scene.add(rimLight);

    this.scene.add(this.levelRoot);
    this.scene.add(this.particleRoot);

    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    window.addEventListener('resize', this.handleResize);

    // Start menu background diorama
    this.startMenuDiorama('volt_blob');

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.lastTime = performance.now();
    this.scheduleNextTick();
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private handleResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  setSkin(skinId: string) {
    this.activeSkinId = skinId;
    if (this.isDemoMode) {
      this.startMenuDiorama(skinId);
    } else if (this.playerRig) {
      this.levelRoot.remove(this.playerRig.root);
      this.playerRig = createPlayerRig(skinId);
      this.playerRig.root.position.set(this.px, this.py, this.pz);
      this.levelRoot.add(this.playerRig.root);
    }
  }

  setSettings(playerName: string, sensitivity: number) {
    this.playerName = playerName;
    this.cameraSensitivity = sensitivity;
  }

  setPaused(paused: boolean) {
    this.paused = paused;
  }

  setKey(code: string, down: boolean) {
    if (down) {
      if (code === 'Space') {
        this.jumpBufferTimer = 0.14;
      }
      this.keys.add(code);
    } else {
      this.keys.delete(code);
    }
  }

  triggerJump() {
    this.jumpBufferTimer = 0.14;
  }

  setJoystick(x: number, y: number) {
    this.joyX = x;
    this.joyY = y;
  }

  orbitCamera(dx: number, dy: number) {
    const sens = 0.0055 * this.cameraSensitivity;
    this.camYaw -= dx * sens;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * sens, 0.18, 1.15);
  }

  startMenuDiorama(skinId: string) {
    this.activeSkinId = skinId;
    this.isDemoMode = true;
    this.paused = false;
    this.disconnectTransport();
    const demoLevel = buildStoryLevel(1);
    this.loadLevelScene(demoLevel, null);
    this.camYaw = 0.45;
    this.camPitch = 0.38;
    this.camDist = 11.5;
  }

  startRun(
    mode: GameMode,
    levelDef: LevelDef,
    skinId: string,
    rivalChallenge: ChallengePayload | null = null,
  ) {
    this.activeSkinId = skinId;
    this.isDemoMode = false;
    this.paused = false;
    this.runFinished = false;
    this.wave = 1;
    this.score = 0;
    this.coinsRun = 0;
    this.wallsSmashed = 0;
    this.enemiesCrushed = 0;
    this.sizeSteals = 0;
    this.health = 3;
    this.maxHealth = 3;
    this.combo = 1;
    this.comboTimer = 0;
    this.powerUps = { speed: 0, shield: 0, magnet: 0, surge: 0 };
    this.minScaleReached = 1;
    this.maxScaleReached = 1;
    this.ghostRecorder.reset();

    this.disconnectTransport();
    if (rivalChallenge) {
      const localTransport = new LocalGhostTransport(rivalChallenge);
      localTransport.connect(`level-${levelDef.id}`);
      localTransport.onRemoteSnapshot((snap) => {
        this.rivalState.active = true;
        this.rivalState.x = snap.x;
        this.rivalState.y = snap.y;
        this.rivalState.z = snap.z;
        this.rivalState.ry = snap.rotY;
        this.rivalState.s = snap.scale;
      });
      this.transport = localTransport;
    }

    this.loadLevelScene(levelDef, rivalChallenge);
    this.showToast(levelDef.hint, 3.6);
    this.emitHud();
  }

  private disconnectTransport() {
    if (this.transport) {
      this.transport.disconnect();
      this.transport = null;
    }
    this.rivalState.active = false;
  }

  private clearGroup(group: THREE.Group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          if (m.geometry !== this.debrisGeo) m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        } else if ((obj as THREE.Sprite).isSprite) {
          const s = obj as THREE.Sprite;
          s.material.map?.dispose();
          s.material.dispose();
        }
      });
    }
  }

  private loadLevelScene(def: LevelDef, rivalChallenge: ChallengePayload | null) {
    this.level = def;
    this.clearGroup(this.levelRoot);
    this.clearGroup(this.particleRoot);
    this.particles = [];
    this.platforms = [];
    this.walls = [];
    this.pushBlocks = [];
    this.plates = [];
    this.sizeProps = [];
    this.enemies = [];
    this.collectibles = [];

    const pal = WORLD_PALETTES[def.world];
    this.scene.background = new THREE.Color(pal.skyColor);
    this.scene.fog = new THREE.FogExp2(pal.fogColor, 0.0115);
    this.hemiLight.color.setHex(pal.hemiSky);
    this.hemiLight.groundColor.setHex(pal.hemiGround);
    this.dirLight.color.setHex(pal.sunColor);

    buildOutdoorBackdrop(this.levelRoot, def.world, def.arenaWidth, def.arenaDepth);

    // Arena Floor Slab
    const floorTex = createFloorTexture(def.world, this.maxAnisotropy);
    floorTex.repeat.set(def.arenaWidth / 4, def.arenaDepth / 4);
    const floorGeo = new THREE.BoxGeometry(def.arenaWidth, 1.2, def.arenaDepth);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.72,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, -0.6, 0);
    floorMesh.receiveShadow = true;
    this.levelRoot.add(floorMesh);

    // Low decorative arena rim curb (prevents falling off unintended edges while keeping outdoor view open)
    const rimMat = new THREE.MeshStandardMaterial({
      color: pal.wallColor,
      roughness: 0.45,
      metalness: 0.3,
    });
    const curbTrimMat = new THREE.MeshStandardMaterial({
      color: pal.rimColor,
      roughness: 0.35,
    });
    const hw = def.arenaWidth / 2;
    const hd = def.arenaDepth / 2;
    const curbs: Array<[number, number, number, number]> = [
      [0, -hd - 0.45, def.arenaWidth + 1.8, 0.9],
      [0, hd + 0.45, def.arenaWidth + 1.8, 0.9],
      [-hw - 0.45, 0, 0.9, def.arenaDepth],
      [hw + 0.45, 0, 0.9, def.arenaDepth],
    ];
    curbs.forEach(([cx, cz, cw, cd]) => {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(cw, 1.5, cd), rimMat);
      curb.position.set(cx, 0.15, cz);
      curb.castShadow = true;
      curb.receiveShadow = true;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(cw + 0.04, 0.18, cd + 0.04), curbTrimMat);
      stripe.position.set(cx, 0.85, cz);
      this.levelRoot.add(curb, stripe);
    });

    // Platforms
    def.platforms.forEach((p) => {
      const pMat = new THREE.MeshStandardMaterial({
        color: p.color ? new THREE.Color(p.color) : new THREE.Color(pal.rimColor),
        roughness: 0.45,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), pMat);
      mesh.position.set(p.x, p.y - p.h / 2, p.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.levelRoot.add(mesh);
      this.platforms.push({
        def: p,
        mesh,
        curX: p.x,
        curY: p.y,
        curZ: p.z,
        prevX: p.x,
        prevZ: p.z,
      });
    });

    // Walls (Solid, Breakable, Tiny Tunnel, Pressure Gate)
    const solidTex = createBrickTexture(false, this.maxAnisotropy);
    const crackedTex = createBrickTexture(true, this.maxAnisotropy);
    const hazardTex = createHazardTexture(this.maxAnisotropy);

    def.walls.forEach((wDef) => {
      const group = new THREE.Group();
      group.position.set(wDef.x, 0, wDef.z);

      if (wDef.tunnelMaxScale !== undefined) {
        const th = wDef.tunnelHeight ?? 1.0;
        const lintelH = Math.max(0.8, wDef.h - th);
        const lintel = new THREE.Mesh(
          new THREE.BoxGeometry(wDef.w, lintelH, wDef.d),
          new THREE.MeshStandardMaterial({ map: solidTex, roughness: 0.65 }),
        );
        lintel.position.y = th + lintelH / 2;
        lintel.castShadow = true;
        lintel.receiveShadow = true;

        const trim = new THREE.Mesh(
          new THREE.BoxGeometry(wDef.w + 0.1, 0.24, wDef.d + 0.12),
          new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.4 }),
        );
        trim.position.y = th + 0.12;

        const badge = createBadgeSprite(`<= ${wDef.tunnelMaxScale.toFixed(1)}x`, '#06b6d4');
        badge.position.y = th + 1.4;
        group.add(lintel, trim, badge);
      } else if (wDef.breakScale !== undefined) {
        const tex = crackedTex.clone();
        tex.needsUpdate = true;
        tex.repeat.set(Math.max(1, Math.round(wDef.w / 2)), 2);
        const wallMesh = new THREE.Mesh(
          new THREE.BoxGeometry(wDef.w, wDef.h, wDef.d),
          new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72 }),
        );
        wallMesh.position.y = wDef.h / 2;
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;

        const badge = createBadgeSprite(`SMASH >= ${wDef.breakScale.toFixed(1)}x`, '#f97316');
        badge.position.y = wDef.h + 0.75;
        badge.scale.set(2.05, 0.65, 1);
        group.add(wallMesh, badge);
      } else if (wDef.gatePlateId) {
        const gateMesh = new THREE.Mesh(
          new THREE.BoxGeometry(wDef.w, wDef.h, wDef.d * 0.7),
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.45,
            roughness: 0.25,
            metalness: 0.6,
          }),
        );
        gateMesh.position.y = wDef.h / 2;
        gateMesh.castShadow = true;
        const badge = createBadgeSprite('PLATE LOCKED', '#38bdf8');
        badge.position.y = wDef.h + 0.7;
        badge.scale.set(1.9, 0.6, 1);
        group.add(gateMesh, badge);
      } else {
        const tex = solidTex.clone();
        tex.needsUpdate = true;
        tex.repeat.set(Math.max(1, Math.round(wDef.w / 2.5)), 2);
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(wDef.w, wDef.h, wDef.d),
          new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }),
        );
        mesh.position.y = wDef.h / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }

      this.levelRoot.add(group);
      this.walls.push({
        id: wDef.id,
        x: wDef.x,
        z: wDef.z,
        w: wDef.w,
        h: wDef.h,
        d: wDef.d,
        breakScale: wDef.breakScale,
        tunnelMaxScale: wDef.tunnelMaxScale,
        tunnelHeight: wDef.tunnelHeight,
        gatePlateId: wDef.gatePlateId,
        mesh: group,
        broken: false,
        gateOpenAmount: 0,
      });
    });

    // Push Blocks
    def.pushBlocks.forEach((pb) => {
      const group = new THREE.Group();
      group.position.set(pb.x, 0, pb.z);
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(pb.size, pb.size, pb.size),
        new THREE.MeshStandardMaterial({
          color: pb.color ?? '#f59e0b',
          roughness: 0.4,
          metalness: 0.25,
        }),
      );
      box.position.y = pb.size / 2;
      box.castShadow = true;
      box.receiveShadow = true;
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(pb.size + 0.06, 0.22, pb.size + 0.06),
        new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.45 }),
      );
      trim.position.y = pb.size / 2;
      const badge = createBadgeSprite(`PUSH >= ${pb.requiredScale.toFixed(1)}x`, '#f59e0b');
      badge.position.y = pb.size + 0.6;
      badge.scale.set(1.9, 0.58, 1);
      group.add(box, trim, badge);
      this.levelRoot.add(group);
      this.pushBlocks.push({
        id: pb.id,
        x: pb.x,
        z: pb.z,
        size: pb.size,
        requiredScale: pb.requiredScale,
        mesh: group,
      });
    });

    // Pressure Plates
    def.plates.forEach((pl) => {
      const group = new THREE.Group();
      group.position.set(pl.x, 0, pl.z);
      const frame = new THREE.Mesh(
        new THREE.CylinderGeometry(pl.radius + 0.18, pl.radius + 0.24, 0.12, 20),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.6 }),
      );
      frame.position.y = 0.06;
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(pl.radius, pl.radius, 0.14, 20),
        new THREE.MeshStandardMaterial({
          color: 0xf43f5e,
          emissive: 0xe11d48,
          emissiveIntensity: 0.5,
        }),
      );
      pad.position.y = 0.12;
      const badge = createBadgeSprite('PLATE', '#38bdf8');
      badge.position.y = 1.1;
      badge.scale.set(1.3, 0.48, 1);
      group.add(frame, pad, badge);
      this.levelRoot.add(group);
      this.plates.push({
        id: pl.id,
        x: pl.x,
        z: pl.z,
        radius: pl.radius,
        latch: pl.latch ?? true,
        requiredScale: pl.requiredScale ?? 1.6,
        pressed: false,
        padMesh: pad,
      });
    });

    // Size Props
    def.sizeProps.forEach((sp) => {
      const built = createSizePropGroup(sp.kind, sp.scale);
      built.group.position.set(sp.x, sp.y ?? 0, sp.z);
      this.levelRoot.add(built.group);
      this.sizeProps.push({
        id: sp.id,
        x: sp.x,
        y: sp.y ?? 0,
        z: sp.z,
        scale: sp.scale,
        cooldown: 0,
        group: built.group,
        visualMesh: built.visualMesh,
        ring: built.ring,
        badge: built.badge,
      });
    });

    // Enemies
    def.enemies.forEach((en, idx) => {
      const mesh = createEnemyGroup(en);
      mesh.position.set(en.x, en.y ?? 0, en.z);
      this.levelRoot.add(mesh);
      this.enemies.push({
        id: en.id,
        kind: en.kind,
        startX: en.x,
        startZ: en.z,
        endX: en.patrolEndX ?? en.x,
        endZ: en.patrolEndZ ?? en.z,
        x: en.x,
        z: en.z,
        speed: en.speed,
        crushScale: en.crushScale ?? 2.1,
        clearanceHeight: en.clearanceHeight ?? 1.05,
        width: en.width ?? 10,
        phase: idx * 1.1,
        alive: true,
        mesh,
      });
    });

    // Collectibles
    this.totalStars = def.collectibles.filter((c) => c.kind === 'star').length;
    this.starsCollected = 0;
    def.collectibles.forEach((c) => {
      const mesh = createCollectibleGroup(c);
      mesh.position.set(c.x, c.y, c.z);
      this.levelRoot.add(mesh);
      this.collectibles.push({
        id: c.id,
        kind: c.kind,
        x: c.x,
        y: c.y,
        z: c.z,
        collected: false,
        mesh,
      });
    });

    // Goal Portal
    const portal = createGoalPortal();
    portal.group.position.set(def.goal.x, def.goal.y, def.goal.z);
    this.levelRoot.add(portal.group);
    this.portalGroup = portal.group;
    this.portalRing = portal.innerRing;
    this.portalCore = portal.core;
    this.portalActive = def.mode !== 'endless';
    this.waveCoinsProgress = 0;
    this.waveCoinsGoal = 4;

    // Player Rig
    this.playerRig = createPlayerRig(this.activeSkinId);
    this.px = def.spawn.x;
    this.py = def.spawn.y;
    this.pz = def.spawn.z;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.rotY = Math.PI;
    this.actualScale = 1.0;
    this.targetScale = 1.0;
    this.scalePop = 0;
    this.grounded = true;
    this.hitInvulnTimer = 0;
    this.elapsed = 0;
    this.camYaw = 0;
    this.camPitch = 0.48;

    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.levelRoot.add(this.playerRig.root);

    // Shield visual bubble
    this.shieldBubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.28,
        wireframe: true,
      }),
    );
    this.shieldBubble.position.y = 0.78;
    this.shieldBubble.visible = false;
    this.playerRig.root.add(this.shieldBubble);

    // Rival Ghost Rig if challenge active
    this.rivalRig = null;
    if (rivalChallenge) {
      this.rivalRig = createPlayerRig(rivalChallenge.challengerSkin, true);
      this.rivalRig.root.position.set(def.spawn.x, def.spawn.y, def.spawn.z);
      this.levelRoot.add(this.rivalRig.root);
    }

    // Snap camera initially
    this.camera.position.set(this.px, this.py + 6.5, this.pz + 10.5);
    this.camera.lookAt(this.px, this.py + 1.1, this.pz);
  }

  private showToast(msg: string, duration = 2.0) {
    this.toastText = msg;
    this.toastTimer = duration;
  }

  private spawnBurst(x: number, y: number, z: number, colorHex: number, count = 14, speed = 7) {
    const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.debrisGeo, mat.clone());
      m.position.set(x, y, z);
      const s = 0.45 + Math.random() * 0.9;
      m.scale.setScalar(s);
      this.particleRoot.add(m);
      const a = Math.random() * Math.PI * 2;
      const spd = (0.35 + Math.random() * 0.85) * speed;
      this.particles.push({
        mesh: m,
        vx: Math.cos(a) * spd,
        vy: 3.5 + Math.random() * 6.5,
        vz: Math.sin(a) * spd,
        rx: (Math.random() - 0.5) * 12,
        ry: (Math.random() - 0.5) * 12,
        life: 0,
        maxLife: 0.65 + Math.random() * 0.45,
        gravity: 20,
      });
    }
    mat.dispose();
  }

  private scheduleNextTick() {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    if (!this.paused) {
      if (this.isDemoMode) {
        this.updateDemoDiorama(dt);
      } else {
        this.updateGameplay(dt);
      }
      this.updateParticles(dt);
    }

    this.renderer.render(this.scene, this.camera);
    this.scheduleNextTick();
  };

  private updateDemoDiorama(dt: number) {
    this.elapsed += dt;
    const t = this.elapsed;
    // Playful figure-8 showcase path
    const x = Math.sin(t * 0.65) * 5.2;
    const z = Math.cos(t * 0.65) * 7.5 + 2;
    const dx = Math.cos(t * 0.65) * 5.2 * 0.65;
    const dz = -Math.sin(t * 0.65) * 7.5 * 0.65;
    this.px = x;
    this.pz = z;
    this.py = Math.abs(Math.sin(t * 2.2)) * 0.45;
    this.rotY = Math.atan2(dx, dz);
    this.targetScale = 1.15 + Math.sin(t * 0.9) * 0.65;
    this.actualScale = THREE.MathUtils.damp(this.actualScale, this.targetScale, 6, dt);

    if (this.playerRig) {
      this.playerRig.root.position.set(this.px, this.py, this.pz);
      this.playerRig.root.rotation.y = this.rotY;
      this.playerRig.root.scale.setScalar(this.actualScale);
      this.animatePlayerRig(dt, 6.5, this.py > 0.05);
    }

    this.animateWorldProps(dt);

    // Gentle orbital camera around the diorama
    const orbit = t * 0.18;
    _camDesired.set(
      this.px + Math.sin(orbit) * 11,
      5.5 + Math.sin(t * 0.4) * 0.8,
      this.pz + Math.cos(orbit) * 11,
    );
    this.camera.position.lerp(_camDesired, 1 - Math.exp(-3 * dt));
    _lookTarget.set(this.px, 1.1 * this.actualScale, this.pz);
    this.camera.lookAt(_lookTarget);
  }

  private updateGameplay(dt: number) {
    if (!this.level || !this.playerRig || this.runFinished) return;

    this.elapsed += dt;

    // Power-up timers
    if (this.powerUps.speed > 0) this.powerUps.speed = Math.max(0, this.powerUps.speed - dt);
    if (this.powerUps.shield > 0) this.powerUps.shield = Math.max(0, this.powerUps.shield - dt);
    if (this.powerUps.magnet > 0) this.powerUps.magnet = Math.max(0, this.powerUps.magnet - dt);
    if (this.powerUps.surge > 0) this.powerUps.surge = Math.max(0, this.powerUps.surge - dt);

    if (this.shieldBubble) {
      this.shieldBubble.visible = this.powerUps.shield > 0 || this.powerUps.surge > 0;
      if (this.shieldBubble.visible) {
        this.shieldBubble.rotation.y += dt * 2.2;
        (this.shieldBubble.material as THREE.MeshBasicMaterial).color.setHex(
          this.powerUps.surge > 0 ? 0xa855f7 : 0x38bdf8,
        );
      }
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 1;
    }

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastText = null;
    }

    if (this.hitInvulnTimer > 0) {
      this.hitInvulnTimer -= dt;
      this.playerRig.bodyGroup.visible = Math.floor(this.hitInvulnTimer * 16) % 2 === 0;
    } else {
      this.playerRig.bodyGroup.visible = true;
    }

    // Time Challenge countdown
    if (this.level.mode === 'timeChallenge') {
      const limit = this.level.parTime * 1.65;
      if (this.elapsed >= limit) {
        this.finishRun(false);
        return;
      }
    }

    // Camera Q/E keyboard orbit
    if (this.keys.has('KeyQ')) this.camYaw += 2.1 * dt;
    if (this.keys.has('KeyE')) this.camYaw -= 2.1 * dt;

    // Smooth scale damping + spring pop
    this.actualScale = THREE.MathUtils.damp(this.actualScale, this.targetScale, 11, dt);
    this.scalePop = THREE.MathUtils.damp(this.scalePop, 0, 12, dt);

    const effectiveScale = this.actualScale;
    const effectiveStrength = this.actualScale + (this.powerUps.surge > 0 ? 0.85 : 0);

    // Core tradeoff: bigger = slower, smaller = faster!
    const sizeSpeedFactor = THREE.MathUtils.clamp(Math.pow(1 / effectiveScale, 0.56), 0.48, 1.95);
    const speedBoost = this.powerUps.speed > 0 ? 1.52 : 1.0;
    const moveSpeed = 7.8 * sizeSpeedFactor * speedBoost;

    // Gather movement vector relative to camera yaw
    let inX = this.joyX;
    let inZ = this.joyY;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) inZ -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) inZ += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) inX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) inX += 1;

    const len = Math.hypot(inX, inZ);
    if (len > 1) {
      inX /= len;
      inZ /= len;
    }

    const sinY = Math.sin(this.camYaw);
    const cosY = Math.cos(this.camYaw);
    const worldX = inX * cosY + inZ * sinY;
    const worldZ = -inX * sinY + inZ * cosY;

    const accel = this.grounded ? 16 : 9;
    this.vx = THREE.MathUtils.damp(this.vx, worldX * moveSpeed, accel, dt);
    this.vz = THREE.MathUtils.damp(this.vz, worldZ * moveSpeed, accel, dt);

    const horizSpeed = Math.hypot(this.vx, this.vz);
    if (horizSpeed > 0.25) {
      const targetRot = Math.atan2(this.vx, this.vz);
      let diff = targetRot - this.rotY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.rotY += diff * (1 - Math.exp(-14 * dt));
    }

    // Update moving platforms first so player can ride them
    for (const p of this.platforms) {
      p.prevX = p.curX;
      p.prevZ = p.curZ;
      if (p.def.moving) {
        const offset =
          Math.sin(this.elapsed * p.def.moving.speed + (p.def.moving.phase ?? 0)) *
          p.def.moving.range;
        if (p.def.moving.axis === 'x') p.curX = p.def.x + offset;
        if (p.def.moving.axis === 'z') p.curZ = p.def.z + offset;
        if (p.def.moving.axis === 'y') p.curY = p.def.y + offset;
        p.mesh.position.set(p.curX, p.curY - p.def.h / 2, p.curZ);
      }
    }

    // Jump & Gravity
    if (this.grounded) this.coyoteTimer = 0.12;
    else this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);

    if (this.jumpBufferTimer > 0) this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = 9.4 * (0.76 + 0.28 * Math.sqrt(effectiveScale));
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      soundEngine.playJump(effectiveScale);
    }

    this.vy -= 24 * dt;

    // Advance player position
    this.px += this.vx * dt;
    this.pz += this.vz * dt;
    const prevPy = this.py;
    this.py += this.vy * dt;

    // Ground & Platform support collision
    const playerRadius = 0.42 * effectiveScale;
    let supportY = 0;
    let ridingPlatform: RuntimePlatform | null = null;

    for (const p of this.platforms) {
      const halfW = p.def.w / 2 + playerRadius * 0.6;
      const halfD = p.def.d / 2 + playerRadius * 0.6;
      if (Math.abs(this.px - p.curX) <= halfW && Math.abs(this.pz - p.curZ) <= halfD) {
        if (prevPy >= p.curY - 0.15 && this.py <= p.curY + 0.05 && this.vy <= 0) {
          if (p.curY > supportY) {
            supportY = p.curY;
            ridingPlatform = p;
          }
        }
      }
    }

    if (this.py <= supportY) {
      if (!this.grounded && this.vy < -10 && effectiveScale >= 1.8) {
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.28 * effectiveScale);
      }
      this.py = supportY;
      this.vy = 0;
      this.grounded = true;
      if (ridingPlatform) {
        this.px += ridingPlatform.curX - ridingPlatform.prevX;
        this.pz += ridingPlatform.curZ - ridingPlatform.prevZ;
      }
    } else {
      this.grounded = false;
    }

    // Clamp to Arena Boundaries
    const maxX = this.level.arenaWidth / 2 - playerRadius;
    const maxZ = this.level.arenaDepth / 2 - playerRadius;
    this.px = THREE.MathUtils.clamp(this.px, -maxX, maxX);
    this.pz = THREE.MathUtils.clamp(this.pz, -maxZ, maxZ);

    // Pressure Plates check (pushed blocks or giant player)
    for (const plate of this.plates) {
      let activeNow = false;
      const distPlayer = Math.hypot(this.px - plate.x, this.pz - plate.z);
      if (distPlayer <= plate.radius + playerRadius * 0.4 && effectiveStrength >= plate.requiredScale) {
        activeNow = true;
      }
      for (const pb of this.pushBlocks) {
        if (Math.hypot(pb.x - plate.x, pb.z - plate.z) <= plate.radius + pb.size * 0.35) {
          activeNow = true;
        }
      }
      if (activeNow && !plate.pressed) {
        plate.pressed = true;
        soundEngine.playPlate();
        this.showToast('Gate Unlocked!', 2.0);
        const mat = plate.padMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0x22c55e);
        mat.emissive.setHex(0x16a34a);
        plate.padMesh.position.y = 0.06;
      } else if (!activeNow && !plate.latch && plate.pressed) {
        plate.pressed = false;
        const mat = plate.padMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(0xf43f5e);
        mat.emissive.setHex(0xe11d48);
        plate.padMesh.position.y = 0.12;
      }
    }

    // Push Blocks collision & sliding
    for (const pb of this.pushBlocks) {
      const half = pb.size / 2;
      const dx = this.px - pb.x;
      const dz = this.pz - pb.z;
      const overlapX = half + playerRadius - Math.abs(dx);
      const overlapZ = half + playerRadius - Math.abs(dz);
      if (overlapX > 0 && overlapZ > 0 && this.py < pb.size) {
        if (effectiveStrength >= pb.requiredScale) {
          if (overlapX < overlapZ) {
            const dir = dx > 0 ? -1 : 1;
            pb.x += dir * overlapX * 0.85;
            this.px -= dir * overlapX * 0.15;
          } else {
            const dir = dz > 0 ? -1 : 1;
            pb.z += dir * overlapZ * 0.85;
            this.pz -= dir * overlapZ * 0.15;
          }
          pb.x = THREE.MathUtils.clamp(pb.x, -this.level.arenaWidth / 2 + half, this.level.arenaWidth / 2 - half);
          pb.z = THREE.MathUtils.clamp(pb.z, -this.level.arenaDepth / 2 + half, this.level.arenaDepth / 2 - half);
          pb.mesh.position.set(pb.x, 0, pb.z);
        } else {
          if (overlapX < overlapZ) {
            this.px += (dx > 0 ? 1 : -1) * overlapX;
          } else {
            this.pz += (dz > 0 ? 1 : -1) * overlapZ;
          }
          this.showToast(`Grow to ${pb.requiredScale.toFixed(1)}x to Push!`, 1.4);
        }
      }
    }

    // Walls collision (Solid, Breakable, Tiny Tunnel, Pressure Gate)
    for (const w of this.walls) {
      if (w.broken) continue;

      if (w.gatePlateId) {
        const linkedPlate = this.plates.find((p) => p.id === w.gatePlateId);
        const isOpen = linkedPlate?.pressed ?? false;
        w.gateOpenAmount = THREE.MathUtils.damp(w.gateOpenAmount, isOpen ? 4.5 : 0, 6, dt);
        w.mesh.position.y = w.gateOpenAmount;
        if (w.gateOpenAmount > 2.2) continue;
      }

      if (w.tunnelMaxScale !== undefined && effectiveScale <= w.tunnelMaxScale) {
        // Tiny player glides freely underneath!
        continue;
      }

      const hw = w.w / 2;
      const hd = w.d / 2;
      const dx = this.px - w.x;
      const dz = this.pz - w.z;
      const overlapX = hw + playerRadius - Math.abs(dx);
      const overlapZ = hd + playerRadius - Math.abs(dz);

      if (overlapX > 0 && overlapZ > 0 && this.py < w.h) {
        if (w.breakScale !== undefined) {
          if (effectiveStrength >= w.breakScale) {
            // SMASH!
            w.broken = true;
            w.mesh.visible = false;
            this.wallsSmashed++;
            this.score += 250 * this.combo;
            this.combo = Math.min(8, this.combo + 1);
            this.comboTimer = 4.5;
            this.shakeIntensity = Math.max(this.shakeIntensity, 0.45);
            this.spawnBurst(w.x, 1.8, w.z, 0xf97316, 20, 9.5);
            soundEngine.playSmash();
            this.showToast('WALL SMASHED! +250', 1.8);
            if (this.level.mode === 'endless') {
              this.waveCoinsProgress++;
            }
            continue;
          } else {
            this.showToast(`Need ${w.breakScale.toFixed(1)}x Size to Smash!`, 1.5);
            soundEngine.playBounce();
          }
        } else if (w.tunnelMaxScale !== undefined) {
          this.showToast(`Shrink to <= ${w.tunnelMaxScale.toFixed(1)}x to Pass!`, 1.5);
        } else if (w.gatePlateId) {
          this.showToast('Push a Block onto the Plate!', 1.5);
        }

        // Resolve minimum penetration
        if (overlapX < overlapZ) {
          this.px += (dx > 0 ? 1 : -1) * overlapX;
          this.vx = 0;
        } else {
          this.pz += (dz > 0 ? 1 : -1) * overlapZ;
          this.vz = 0;
        }
      }
    }

    // Size Props (Touch to Steal & Swap Size!)
    for (const sp of this.sizeProps) {
      if (sp.cooldown > 0) sp.cooldown = Math.max(0, sp.cooldown - dt);
      const dist = Math.hypot(this.px - sp.x, this.pz - sp.z);
      const touchRadius = playerRadius + Math.max(0.55, sp.scale * 0.45);
      if (sp.cooldown <= 0 && dist <= touchRadius && Math.abs(this.py - sp.y) < 1.8) {
        const oldPlayerScale = Number(this.targetScale.toFixed(2));
        const stolenScale = Number(sp.scale.toFixed(2));
        this.targetScale = stolenScale;
        sp.scale = THREE.MathUtils.clamp(oldPlayerScale, 0.38, 3.3);
        sp.cooldown = 1.65;
        this.scalePop = 0.38;
        this.sizeSteals++;
        this.minScaleReached = Math.min(this.minScaleReached, stolenScale);
        this.maxScaleReached = Math.max(this.maxScaleReached, stolenScale);

        // Update prop visuals to reflect swapped size
        sp.visualMesh.scale.setScalar(Math.max(0.42, sp.scale * 0.85));
        sp.ring.scale.setScalar(Math.max(0.65, sp.scale * 0.72));
        const isPropBig = sp.scale >= 1.25;
        (sp.ring.material as THREE.MeshBasicMaterial).color.setHex(isPropBig ? 0xf59e0b : 0x06b6d4);

        sp.group.remove(sp.badge);
        sp.badge.material.map?.dispose();
        sp.badge.material.dispose();
        sp.badge = createBadgeSprite(`${sp.scale.toFixed(1)}x`, isPropBig ? '#f59e0b' : '#06b6d4');
        sp.badge.position.y = Math.max(1.2, sp.scale * 1.05 + 0.55);
        sp.group.add(sp.badge);

        if (stolenScale > oldPlayerScale) {
          soundEngine.playGrow();
          this.spawnBurst(this.px, this.py + 0.8, this.pz, 0xf59e0b, 12, 6);
          this.showToast(`GREW TO ${stolenScale.toFixed(1)}x!`, 1.4);
        } else {
          soundEngine.playShrink();
          this.spawnBurst(this.px, this.py + 0.6, this.pz, 0x06b6d4, 12, 6);
          this.showToast(`SHRUNK TO ${stolenScale.toFixed(1)}x!`, 1.4);
        }
      }
    }

    // Collectibles & Magnet Pull
    for (const c of this.collectibles) {
      if (c.collected) continue;
      const dist = Math.hypot(this.px - c.x, this.pz - c.z);
      if (this.powerUps.magnet > 0 && (c.kind === 'coin' || c.kind === 'star') && dist < 8.5) {
        const pull = 12 * dt;
        const angle = Math.atan2(this.pz - c.z, this.px - c.x);
        c.x += Math.cos(angle) * pull;
        c.z += Math.sin(angle) * pull;
        c.mesh.position.x = c.x;
        c.mesh.position.z = c.z;
      }

      if (dist <= playerRadius + 0.72 && Math.abs(this.py + 0.7 * effectiveScale - c.y) <= 1.4 * effectiveScale + 0.7) {
        c.collected = true;
        c.mesh.visible = false;
        if (c.kind === 'coin') {
          this.coinsRun++;
          this.score += 50 * this.combo;
          this.waveCoinsProgress++;
          soundEngine.playCoin();
          this.spawnBurst(c.x, c.y, c.z, 0xfacc15, 7, 4.5);
        } else if (c.kind === 'star') {
          this.starsCollected++;
          this.score += 500;
          soundEngine.playStar();
          this.spawnBurst(c.x, c.y, c.z, 0xfbbf24, 16, 7);
          this.showToast(`STAR COLLECTED! (${this.starsCollected}/${this.totalStars})`, 1.8);
        } else {
          this.activatePowerUp(c.kind);
        }
      }
    }

    // Enemies & Hazards
    for (const en of this.enemies) {
      if (!en.alive) continue;

      if (en.kind === 'laser') {
        const halfW = en.width / 2;
        if (Math.abs(this.px - en.x) <= halfW && Math.abs(this.pz - en.z) <= 0.45 + playerRadius * 0.5) {
          const playerTop = this.py + 1.38 * effectiveScale;
          if (playerTop > en.clearanceHeight && this.powerUps.surge <= 0) {
            this.handlePlayerHit(en.x, en.z, 'Shrink to pass under Lasers!');
          }
        }
        continue;
      }

      // Patrol movement
      en.phase += dt * en.speed * 0.45;
      const u = (Math.sin(en.phase) + 1) * 0.5;
      const nx = en.startX + (en.endX - en.startX) * u;
      const nz = en.startZ + (en.endZ - en.startZ) * u;
      const dirX = nx - en.x;
      const dirZ = nz - en.z;
      en.x = nx;
      en.z = nz;
      en.mesh.position.set(en.x, 0, en.z);
      if (en.kind === 'saw') {
        en.mesh.rotation.y += dt * 11;
      } else if (Math.hypot(dirX, dirZ) > 0.001) {
        en.mesh.rotation.y = Math.atan2(dirX, dirZ);
      }

      const dist = Math.hypot(this.px - en.x, this.pz - en.z);
      const hitDist = playerRadius + (en.kind === 'saw' ? 0.85 : 0.65);
      if (dist <= hitDist && this.py < 1.35) {
        if ((en.kind === 'chomper' || en.kind === 'drone') && effectiveStrength >= en.crushScale) {
          en.alive = false;
          en.mesh.visible = false;
          this.enemiesCrushed++;
          this.score += 300 * this.combo;
          this.combo = Math.min(8, this.combo + 1);
          this.comboTimer = 4.5;
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.35);
          this.spawnBurst(en.x, 0.8, en.z, 0xe11d48, 16, 8);
          soundEngine.playSmash();
          this.showToast('BOT CRUSHED! +300', 1.6);
        } else {
          this.handlePlayerHit(en.x, en.z);
        }
      }
    }

    // Endless Portal activation check
    if (this.level.mode === 'endless' && !this.portalActive) {
      if (this.waveCoinsProgress >= this.waveCoinsGoal || this.elapsed >= 18) {
        this.portalActive = true;
        this.showToast('Wave Portal Open! Enter to Advance!', 2.5);
        soundEngine.playPlate();
      }
    }

    // Goal Portal check
    if (this.portalActive) {
      const distGoal = Math.hypot(this.px - this.level.goal.x, this.pz - this.level.goal.z);
      if (distGoal <= 1.85 + playerRadius * 0.5 && Math.abs(this.py - this.level.goal.y) < 2.0) {
        if (this.level.mode === 'endless') {
          this.advanceEndlessWave();
          return;
        } else {
          this.finishRun(true);
          return;
        }
      }
    }

    // Update Player Visual Rig
    const popScale = this.actualScale * (1 + Math.sin(this.scalePop * Math.PI * 2) * 0.14);
    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.playerRig.root.rotation.y = this.rotY;
    this.playerRig.root.scale.setScalar(popScale);
    this.animatePlayerRig(dt, horizSpeed, !this.grounded);

    // Update World Props & Portal
    this.animateWorldProps(dt);

    // Record Ghost & Update Transport / Rival Rig
    this.ghostRecorder.sample(this.elapsed, this.px, this.py, this.pz, this.rotY, this.actualScale);
    if (this.transport) {
      this.transport.sendLocalSnapshot({
        playerId: 'local',
        playerName: this.playerName,
        skinId: this.activeSkinId,
        x: this.px,
        y: this.py,
        z: this.pz,
        rotY: this.rotY,
        scale: this.actualScale,
        timestamp: this.elapsed,
      });
    }
    if (this.rivalRig && this.rivalState.active) {
      this.rivalRig.root.position.set(this.rivalState.x, this.rivalState.y, this.rivalState.z);
      this.rivalRig.root.rotation.y = this.rivalState.ry;
      this.rivalRig.root.scale.setScalar(this.rivalState.s);
    }

    // Smooth Third-Person Camera with Scale-Adaptive Distance + Shake
    const desiredDist = 8.6 + this.actualScale * 2.7;
    this.camDist = THREE.MathUtils.damp(this.camDist, desiredDist, 6, dt);

    const horizDist = Math.cos(this.camPitch) * this.camDist;
    const vertDist = Math.sin(this.camPitch) * this.camDist + this.actualScale * 0.8;

    _camOffset.set(Math.sin(this.camYaw) * horizDist, vertDist, Math.cos(this.camYaw) * horizDist);
    _camDesired.set(this.px, this.py, this.pz).add(_camOffset);

    if (this.shakeIntensity > 0.01) {
      _camDesired.x += (Math.random() - 0.5) * this.shakeIntensity;
      _camDesired.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 10, dt);
    }

    this.camera.position.lerp(_camDesired, 1 - Math.exp(-10 * dt));
    _lookTarget.set(this.px, this.py + 0.9 * this.actualScale, this.pz);
    this.camera.lookAt(_lookTarget);

    // Move key directional light with player so shadows stay crisp across large levels
    this.dirLight.position.set(this.px + 16, 28, this.pz + 14);
    this.dirLight.target.position.set(this.px, 0, this.pz);

    // Throttled HUD updates (~20 Hz) to keep React UI crisp without extra renders
    this.hudEmitTimer += dt;
    if (this.hudEmitTimer >= 0.05) {
      this.hudEmitTimer = 0;
      this.emitHud();
    }
  }

  private activatePowerUp(kind: PowerUpKind) {
    soundEngine.playPowerUp();
    this.score += 150;
    if (kind === 'speed') {
      this.powerUps.speed = 8;
      this.showToast('TURBO BOOTS! +50% Speed (8s)', 2.0);
    } else if (kind === 'shield') {
      this.powerUps.shield = 12;
      this.showToast('TITAN SHIELD! Blocks Next Hit (12s)', 2.0);
    } else if (kind === 'magnet') {
      this.powerUps.magnet = 10;
      this.showToast('COIN MAGNET! Auto-Pulling Coins (10s)', 2.0);
    } else {
      this.powerUps.surge = 6;
      this.showToast('MEGA SURGE! +Strength & Invincible (6s)', 2.0);
    }
    this.spawnBurst(this.px, this.py + 1.0, this.pz, 0x38bdf8, 14, 6.5);
  }

  private handlePlayerHit(fromX: number, fromZ: number, customToast?: string) {
    if (this.hitInvulnTimer > 0 || this.powerUps.surge > 0) return;

    const dx = this.px - fromX;
    const dz = this.pz - fromZ;
    const d = Math.max(0.01, Math.hypot(dx, dz));
    this.vx = (dx / d) * 10;
    this.vz = (dz / d) * 10;
    this.vy = 5.5;

    if (this.powerUps.shield > 0) {
      this.powerUps.shield = 0;
      this.hitInvulnTimer = 1.2;
      soundEngine.playBounce();
      this.spawnBurst(this.px, this.py + 0.8, this.pz, 0x38bdf8, 12, 6);
      this.showToast('SHIELD ABSORBED HIT!', 1.6);
      return;
    }

    this.health--;
    this.combo = 1;
    this.hitInvulnTimer = 1.5;
    this.shakeIntensity = 0.45;
    soundEngine.playHit();
    this.spawnBurst(this.px, this.py + 0.8, this.pz, 0xf43f5e, 14, 7);
    this.showToast(customToast ?? 'OUCH! Watch Out!', 1.6);

    if (this.health <= 0) {
      this.finishRun(false);
    }
  }

  private advanceEndlessWave() {
    this.wave++;
    this.score += 500;
    this.health = Math.min(this.maxHealth, this.health + 1);
    soundEngine.playWin();
    const nextWaveDef = buildEndlessLevel(this.wave);
    this.loadLevelScene(nextWaveDef, null);
    this.showToast(`WAVE ${this.wave}! Collect 4 Coins or Smash Walls!`, 2.6);
    this.emitHud();
  }

  private finishRun(victory: boolean) {
    if (!this.level || this.runFinished) return;
    this.runFinished = true;
    this.emitHud();

    if (victory) {
      soundEngine.playWin();
      this.spawnBurst(this.px, this.py + 1.5, this.pz, 0xfacc15, 24, 10);
    } else {
      soundEngine.playHit();
    }

    let starsEarned = 0;
    if (victory && this.level.mode === 'story') {
      // 1 star for finish, 2 for <= par time or 2 collectibles, 3 for all 3 stars or fast finish
      starsEarned = Math.max(
        1,
        Math.min(3, this.starsCollected > 0 ? this.starsCollected : this.elapsed <= this.level.parTime ? 3 : 2),
      );
    }

    const bonusScore = victory ? Math.max(0, Math.round((this.level.parTime - this.elapsed) * 30)) : 0;
    const totalScore = this.score + bonusScore + (victory ? 500 : 0);
    const coinsEarned = this.coinsRun + (victory ? 15 + starsEarned * 5 : 0);

    const result: RunResult = {
      victory,
      mode: this.level.mode,
      levelId: this.level.id,
      levelName: this.level.name,
      elapsed: Number(this.elapsed.toFixed(1)),
      parTime: this.level.parTime,
      score: totalScore,
      coinsEarned,
      starsEarned,
      wallsSmashed: this.wallsSmashed,
      enemiesCrushed: this.enemiesCrushed,
      sizeSteals: this.sizeSteals,
      waveReached: this.wave,
      newRecord: false,
      newlyUnlockedAchievements: [],
      ghostFrames: victory ? this.ghostRecorder.getFrames() : undefined,
    };

    this.callbacks.onRunComplete(result, {
      minScale: this.minScaleReached,
      maxScale: this.maxScaleReached,
    });
  }

  private animatePlayerRig(dt: number, horizSpeed: number, airborne: boolean) {
    if (!this.playerRig) return;

    // Blinking
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = 2.6 + Math.random() * 2.5;
    }
    const eyeScaleY = this.blinkTimer < 0.12 ? 0.12 : 1.0;
    this.playerRig.leftEye.scale.y = eyeScaleY;
    this.playerRig.rightEye.scale.y = eyeScaleY;

    if (airborne) {
      this.playerRig.bodyGroup.scale.set(0.88, 1.15, 0.88);
      this.playerRig.leftArm.rotation.x = -2.4;
      this.playerRig.rightArm.rotation.x = -2.4;
      this.playerRig.leftLeg.rotation.x = 0.45;
      this.playerRig.rightLeg.rotation.x = -0.35;
    } else if (horizSpeed > 0.35) {
      const freq = 9 + Math.min(8, horizSpeed * 0.7);
      this.walkPhase += dt * freq;
      const swing = Math.sin(this.walkPhase) * 0.75;
      this.playerRig.leftLeg.rotation.x = swing;
      this.playerRig.rightLeg.rotation.x = -swing;
      this.playerRig.leftArm.rotation.x = -swing * 0.85;
      this.playerRig.rightArm.rotation.x = swing * 0.85;
      const bob = Math.abs(Math.cos(this.walkPhase)) * 0.08;
      this.playerRig.bodyGroup.position.y = bob;
      this.playerRig.bodyGroup.rotation.z = Math.sin(this.walkPhase) * 0.07;
      this.playerRig.bodyGroup.scale.set(1, 1 - bob * 0.6, 1);
    } else {
      // Cheerful idle breathing
      this.walkPhase += dt * 3;
      const breath = Math.sin(this.walkPhase) * 0.035;
      this.playerRig.bodyGroup.position.y = 0;
      this.playerRig.bodyGroup.rotation.z = 0;
      this.playerRig.bodyGroup.scale.set(1 + breath, 1 - breath, 1 + breath);
      this.playerRig.leftArm.rotation.x = THREE.MathUtils.damp(this.playerRig.leftArm.rotation.x, 0, 10, dt);
      this.playerRig.rightArm.rotation.x = THREE.MathUtils.damp(this.playerRig.rightArm.rotation.x, 0, 10, dt);
      this.playerRig.leftLeg.rotation.x = THREE.MathUtils.damp(this.playerRig.leftLeg.rotation.x, 0, 10, dt);
      this.playerRig.rightLeg.rotation.x = THREE.MathUtils.damp(this.playerRig.rightLeg.rotation.x, 0, 10, dt);
    }

    // Grounded contact shadow shrinks as player jumps higher
    const shadowFade = THREE.MathUtils.clamp(1 - this.py * 0.25, 0.2, 0.85);
    (this.playerRig.contactShadow.material as THREE.MeshBasicMaterial).opacity = shadowFade;
  }

  private animateWorldProps(dt: number) {
    for (const sp of this.sizeProps) {
      sp.visualMesh.rotation.y += dt * 1.1;
      sp.visualMesh.position.y = Math.sin(this.elapsed * 2.5 + sp.x) * 0.08;
      sp.ring.rotation.z += dt * 0.9;
    }

    for (const c of this.collectibles) {
      if (c.collected) continue;
      c.mesh.rotation.y += dt * 2.4;
      c.mesh.position.y = c.y + Math.sin(this.elapsed * 3.2 + c.x) * 0.14;
    }

    if (this.portalRing && this.portalCore) {
      this.portalRing.rotation.z += dt * (this.portalActive ? 2.4 : 0.4);
      const mat = this.portalCore.material as THREE.MeshBasicMaterial;
      if (this.portalActive) {
        _tmpColor.setHex(0x22d3ee);
        mat.opacity = 0.45 + Math.sin(this.elapsed * 4) * 0.15;
      } else {
        _tmpColor.setHex(0x64748b);
        mat.opacity = 0.15;
      }
      mat.color.copy(_tmpColor);
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particleRoot.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.mesh.position.y < 0.15) {
        p.mesh.position.y = 0.15;
        p.vy = Math.abs(p.vy) * 0.45;
      }
      p.mesh.rotation.x += p.rx * dt;
      p.mesh.rotation.y += p.ry * dt;
      const fade = 1 - p.life / p.maxLife;
      p.mesh.scale.setScalar(fade * 0.9);
    }
  }

  private emitHud() {
    if (!this.level) return;
    const sizeSpeedFactor = THREE.MathUtils.clamp(Math.pow(1 / this.actualScale, 0.56), 0.48, 1.95);
    const speedMultiplier = sizeSpeedFactor * (this.powerUps.speed > 0 ? 1.52 : 1.0);
    const strength = this.actualScale + (this.powerUps.surge > 0 ? 0.85 : 0);
    let strengthTier = 'Normal';
    if (this.actualScale <= 0.65) strengthTier = 'Tiny Sprinter';
    else if (strength >= 2.4) strengthTier = 'Titan Crusher';
    else if (strength >= 1.55) strengthTier = 'Wall Breaker';

    let timeRemaining: number | null = null;
    if (this.level.mode === 'timeChallenge') {
      timeRemaining = Math.max(0, this.level.parTime * 1.65 - this.elapsed);
    }

    let rivalDistance: number | null = null;
    if (this.rivalState.active && this.level) {
      const myDistToGoal = Math.hypot(this.px - this.level.goal.x, this.pz - this.level.goal.z);
      const rivalDistToGoal = Math.hypot(
        this.rivalState.x - this.level.goal.x,
        this.rivalState.z - this.level.goal.z,
      );
      rivalDistance = Number((rivalDistToGoal - myDistToGoal).toFixed(1));
    }

    this.callbacks.onHudUpdate({
      scale: Number(this.actualScale.toFixed(2)),
      speedMultiplier: Number(speedMultiplier.toFixed(2)),
      strengthTier,
      health: this.health,
      maxHealth: this.maxHealth,
      coinsRun: this.coinsRun,
      starsCollected: this.starsCollected,
      totalStars: this.totalStars,
      score: this.score,
      elapsed: Number(this.elapsed.toFixed(1)),
      timeRemaining: timeRemaining !== null ? Number(timeRemaining.toFixed(1)) : null,
      wave: this.wave,
      combo: this.combo,
      powerUps: { ...this.powerUps },
      toastText: this.toastText,
      levelName: this.level.name,
      levelHint: this.level.hint,
      mode: this.level.mode,
      levelId: this.level.id,
      rivalDistance,
    });
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.disconnectTransport();
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.clearGroup(this.levelRoot);
    this.clearGroup(this.particleRoot);
    this.debrisGeo.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
