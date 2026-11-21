import * as THREE from 'three';
import { getSkinById } from '../../data/skins';
import {
  CollectibleDef,
  EnemyDef,
  PowerUpKind,
  SizePropKind,
  WorldTheme,
} from '../../types/game';

export interface PlayerRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  accessoryGroup: THREE.Group;
  contactShadow: THREE.Mesh;
}

export interface WorldPalette {
  skyColor: number;
  fogColor: number;
  floorPrimary: string;
  floorSecondary: string;
  wallColor: number;
  rimColor: number;
  foliageColors: number[];
  sunColor: number;
  hemiSky: number;
  hemiGround: number;
}

export const WORLD_PALETTES: Record<WorldTheme, WorldPalette> = {
  meadow: {
    skyColor: 0x7dd3fc,
    fogColor: 0xbae6fd,
    floorPrimary: '#4ade80',
    floorSecondary: '#22c55e',
    wallColor: 0x334155,
    rimColor: 0xfacc15,
    foliageColors: [0x16a34a, 0x22c55e, 0x15803d, 0x4ade80],
    sunColor: 0xfffbeb,
    hemiSky: 0xbae6fd,
    hemiGround: 0x3f6212,
  },
  factory: {
    skyColor: 0x1e293b,
    fogColor: 0x334155,
    floorPrimary: '#475569',
    floorSecondary: '#334155',
    wallColor: 0x1e293b,
    rimColor: 0xf97316,
    foliageColors: [0x64748b, 0xf97316, 0x475569, 0xfbbf24],
    sunColor: 0xffedd5,
    hemiSky: 0x94a3b8,
    hemiGround: 0x1e293b,
  },
  sky: {
    skyColor: 0x38bdf8,
    fogColor: 0xe0f2fe,
    floorPrimary: '#f1f5f9',
    floorSecondary: '#cbd5e1',
    wallColor: 0x0f172a,
    rimColor: 0x06b6d4,
    foliageColors: [0x0ea5e9, 0x38bdf8, 0x818cf8, 0xf8fafc],
    sunColor: 0xffffff,
    hemiSky: 0xe0f2fe,
    hemiGround: 0x0284c7,
  },
  citadel: {
    skyColor: 0x311042,
    fogColor: 0x4c1d95,
    floorPrimary: '#2e1065',
    floorSecondary: '#4c1d95',
    wallColor: 0x1e1b4b,
    rimColor: 0xf43f5e,
    foliageColors: [0x7c3aed, 0xa855f7, 0xf43f5e, 0xf59e0b],
    sunColor: 0xfef3c7,
    hemiSky: 0xc084fc,
    hemiGround: 0x1e1b4b,
  },
};

export function createFloorTexture(
  world: WorldTheme,
  anisotropy: number,
): THREE.CanvasTexture {
  const palette = WORLD_PALETTES[world];
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = palette.floorPrimary;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = palette.floorSecondary;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillRect(128, 128, 128, 128);

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 252);

  if (world === 'factory') {
    ctx.fillStyle = 'rgba(249, 115, 22, 0.25)';
    ctx.fillRect(118, 0, 20, 256);
    ctx.fillRect(0, 118, 256, 20);
  } else if (world === 'citadel') {
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, 220, 220);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createBrickTexture(
  cracked: boolean,
  anisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = cracked ? '#c2410c' : '#475569';
  ctx.fillRect(0, 0, 256, 256);

  const rows = 4;
  const cols = 4;
  const bh = 256 / rows;
  const bw = 256 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (bw / 2);
    for (let c = -1; c <= cols; c++) {
      const shade = ((r * 3 + c) % 3) * 10;
      ctx.fillStyle = cracked
        ? `rgb(${210 - shade}, ${90 - shade}, ${40})`
        : `rgb(${75 + shade}, ${90 + shade}, ${110 + shade})`;
      ctx.fillRect(c * bw + offset + 3, r * bh + 3, bw - 6, bh - 6);
    }
  }

  if (cracked) {
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(40, 30);
    ctx.lineTo(115, 110);
    ctx.lineTo(95, 165);
    ctx.lineTo(175, 230);
    ctx.moveTo(115, 110);
    ctx.lineTo(195, 80);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createHazardTexture(anisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#0f172a';
  for (let i = -128; i < 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 16, 0);
    ctx.lineTo(i - 48, 128);
    ctx.lineTo(i - 64, 128);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createBadgeSprite(
  label: string,
  bgColor: string,
  textColor = '#ffffff',
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.beginPath();
  ctx.roundRect(16, 12, 224, 72, 20);
  ctx.fill();

  ctx.strokeStyle = bgColor;
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = 'bold 40px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 49);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.65, 0.62, 1);
  return sprite;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.6)');
  grad.addColorStop(0.55, 'rgba(2, 6, 23, 0.25)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let sharedShadowTex: THREE.CanvasTexture | null = null;
export function createContactShadow(radius = 0.6): THREE.Mesh {
  if (!sharedShadowTex) sharedShadowTex = createContactShadowTexture();
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: sharedShadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.75,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.02;
  return mesh;
}

/**
 * Builds an articulated 9-part cartoon character pivoted at bottom-center (y = 0).
 */
export function createPlayerRig(skinId: string, isGhost = false): PlayerRig {
  const skin = getSkinById(skinId);
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: skin.primaryColor,
    roughness: 0.35,
    metalness: 0.12,
    transparent: isGhost,
    opacity: isGhost ? 0.55 : 1,
  });

  const secondaryMat = new THREE.MeshStandardMaterial({
    color: skin.secondaryColor,
    roughness: 0.55,
    metalness: 0.1,
    transparent: isGhost,
    opacity: isGhost ? 0.55 : 1,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: skin.accentColor,
    roughness: 0.25,
    metalness: 0.65,
    transparent: isGhost,
    opacity: isGhost ? 0.65 : 1,
  });

  // Legs (pivoted at hip y = 0.38)
  const makeLeg = (xOff: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(xOff, 0.38, 0);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.16, 4, 8), secondaryMat);
    shin.position.y = -0.16;
    shin.castShadow = !isGhost;
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.34), accentMat);
    shoe.position.set(0, -0.31, 0.05);
    shoe.castShadow = !isGhost;
    legGroup.add(shin, shoe);
    return legGroup;
  };
  const leftLeg = makeLeg(-0.18);
  const rightLeg = makeLeg(0.18);
  bodyGroup.add(leftLeg, rightLeg);

  // Torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.3, 6, 12), primaryMat);
  torso.position.y = 0.68;
  torso.castShadow = !isGhost;
  torso.receiveShadow = true;
  bodyGroup.add(torso);

  // Belly patch
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), secondaryMat);
  belly.scale.set(0.95, 0.9, 0.45);
  belly.position.set(0, 0.64, 0.22);
  bodyGroup.add(belly);

  // Belt trim
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.045, 8, 20), accentMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.48;
  bodyGroup.add(belt);

  // Arms
  const makeArm = (xOff: number) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(xOff, 0.84, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.22, 4, 8), primaryMat);
    arm.position.y = -0.15;
    arm.castShadow = !isGhost;
    const mitten = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), accentMat);
    mitten.position.y = -0.32;
    mitten.castShadow = !isGhost;
    armGroup.add(arm, mitten);
    return armGroup;
  };
  const leftArm = makeArm(-0.4);
  const rightArm = makeArm(0.4);
  bodyGroup.add(leftArm, rightArm);

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.12, 0);
  bodyGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 18, 14), primaryMat);
  head.scale.set(1.06, 0.95, 1.0);
  head.castShadow = !isGhost;
  headGroup.add(head);

  // Expressive Eyes
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15 });
  const makeEye = (xOff: number) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.088, 12, 10), scleraMat);
    eye.position.set(xOff, 0.04, 0.27);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.046, 10, 8), pupilMat);
    pupil.position.set(0, 0, 0.058);
    eye.add(pupil);
    return eye;
  };
  const leftEye = makeEye(-0.12);
  const rightEye = makeEye(0.12);
  headGroup.add(leftEye, rightEye);

  // Skin-specific Accessory
  const accessoryGroup = new THREE.Group();
  headGroup.add(accessoryGroup);

  if (skin.accessory === 'antenna') {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.28, 8), secondaryMat);
    stem.position.y = 0.36;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), accentMat);
    bulb.position.y = 0.52;
    accessoryGroup.add(stem, bulb);
  } else if (skin.accessory === 'visor') {
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.14, 0.18),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.6,
        roughness: 0.15,
        metalness: 0.8,
      }),
    );
    visor.position.set(0, 0.05, 0.26);
    accessoryGroup.add(visor);
  } else if (skin.accessory === 'sprout') {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.22, 8), accentMat);
    stem.position.y = 0.34;
    const leaf1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), accentMat);
    leaf1.scale.set(1.5, 0.4, 0.7);
    leaf1.position.set(0.1, 0.44, 0);
    leaf1.rotation.z = 0.4;
    const leaf2 = leaf1.clone();
    leaf2.position.x = -0.1;
    leaf2.rotation.z = -0.4;
    accessoryGroup.add(stem, leaf1, leaf2);
  } else if (skin.accessory === 'crown') {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.14, 8), accentMat);
    band.position.y = 0.34;
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 6), accentMat);
      const a = (i / 4) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.16, 0.46, Math.sin(a) * 0.16);
      accessoryGroup.add(spike);
    }
    accessoryGroup.add(band);
  } else if (skin.accessory === 'headband') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 8, 20), accentMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.16;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.34), accentMat);
    tail.position.set(0.12, 0.12, -0.38);
    tail.rotation.y = 0.35;
    accessoryGroup.add(band, tail);
  } else if (skin.accessory === 'helmet') {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.045, 8, 22), accentMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.02;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.39, 16, 12),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.32,
        roughness: 0.08,
        metalness: 0.2,
      }),
    );
    accessoryGroup.add(rim, dome);
  }

  const contactShadow = createContactShadow(0.58);
  root.add(contactShadow);

  return {
    root,
    bodyGroup,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    leftEye,
    rightEye,
    accessoryGroup,
    contactShadow,
  };
}

/**
 * Builds 4–7 part composite cartoon Size Props, grounded at y = 0.
 */
export function createSizePropGroup(
  kind: SizePropKind,
  targetScale: number,
): { group: THREE.Group; visualMesh: THREE.Group; ring: THREE.Mesh; badge: THREE.Sprite } {
  const group = new THREE.Group();
  const visualMesh = new THREE.Group();
  group.add(visualMesh);

  const isBig = targetScale >= 1.25;
  const ringColor = isBig ? 0xf59e0b : 0x06b6d4;

  // Base glowing target ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.78, 24),
    new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  // Build specific composite prop (normalized around ~1.0 base height, then scaled)
  if (kind === 'duck') {
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), yellowMat);
    body.scale.set(1.0, 0.82, 1.25);
    body.position.y = 0.35;
    body.castShadow = true;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 12), yellowMat);
    head.position.set(0, 0.76, 0.24);
    head.castShadow = true;

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 8), orangeMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.74, 0.52);

    const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), yellowMat);
    wingL.scale.set(0.35, 0.65, 1.1);
    wingL.position.set(-0.38, 0.42, 0);
    const wingR = wingL.clone();
    wingR.position.x = 0.38;

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), eyeMat);
    eyeL.position.set(-0.12, 0.84, 0.44);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.12;

    visualMesh.add(body, head, beak, wingL, wingR, eyeL, eyeR);
  } else if (kind === 'watermelon') {
    const rindMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.35 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.5 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.8 });

    const melon = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 12), rindMat);
    melon.scale.set(1.18, 0.92, 0.92);
    melon.position.y = 0.43;
    melon.castShadow = true;

    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.035, 6, 18), stripeMat);
      band.position.y = 0.43;
      band.rotation.y = (i / 3) * Math.PI;
      visualMesh.add(band);
    }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.18, 8), stemMat);
    stem.position.y = 0.88;
    visualMesh.add(melon, stem);
  } else if (kind === 'acorn') {
    const nutMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 12), nutMat);
    nut.scale.set(0.95, 1.15, 0.95);
    nut.position.y = 0.42;
    nut.castShadow = true;

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    cap.position.y = 0.56;
    cap.castShadow = true;

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.22, 8), capMat);
    stem.position.y = 0.98;
    visualMesh.add(nut, cap, stem);
  } else if (kind === 'barrel') {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.72 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.75 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.9, 14), woodMat);
    body.position.y = 0.45;
    body.castShadow = true;
    const band1 = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.035, 8, 20), ironMat);
    band1.rotation.x = Math.PI / 2;
    band1.position.y = 0.22;
    const band2 = band1.clone();
    band2.position.y = 0.68;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 14), woodMat);
    lid.position.y = 0.91;
    visualMesh.add(body, band1, band2, lid);
  } else if (kind === 'hammer') {
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.65 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.28, metalness: 0.8 });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 });

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.85, 10), handleMat);
    handle.position.y = 0.43;
    handle.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.34, 0.34), headMat);
    head.position.y = 0.84;
    head.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 0.36), bandMat);
    stripe.position.y = 0.84;
    visualMesh.add(handle, head, stripe);
  } else if (kind === 'gear') {
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.82 });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 });

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.18, 16), brassMat);
    disc.rotation.x = Math.PI / 2;
    disc.position.y = 0.48;
    disc.castShadow = true;
    for (let i = 0; i < 8; i++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.18), brassMat);
      const a = (i / 8) * Math.PI * 2;
      tooth.position.set(Math.cos(a) * 0.42, 0.48 + Math.sin(a) * 0.42, 0);
      tooth.rotation.z = a;
      visualMesh.add(tooth);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 12), coreMat);
    hub.rotation.x = Math.PI / 2;
    hub.position.y = 0.48;
    visualMesh.add(disc, hub);
  } else if (kind === 'dumbbell') {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.85 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 10), steelMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.y = 0.34;
    const plateL = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.16, 16), steelMat);
    plateL.rotation.z = Math.PI / 2;
    plateL.position.set(-0.36, 0.34, 0);
    plateL.castShadow = true;
    const plateR = plateL.clone();
    plateR.position.x = 0.36;
    const collarL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 12), capMat);
    collarL.rotation.z = Math.PI / 2;
    collarL.position.set(-0.44, 0.34, 0);
    const collarR = collarL.clone();
    collarR.position.x = 0.44;
    visualMesh.add(bar, plateL, plateR, collarL, collarR);
  } else {
    // crystal
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: isBig ? 0xf59e0b : 0x22d3ee,
      emissive: isBig ? 0x78350f : 0x0e7490,
      emissiveIntensity: 0.45,
      roughness: 0.12,
      metalness: 0.2,
      clearcoat: 1.0,
    });
    const spireMain = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), crystalMat);
    spireMain.scale.set(0.85, 1.45, 0.85);
    spireMain.position.y = 0.56;
    spireMain.castShadow = true;
    const spireL = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), crystalMat);
    spireL.scale.set(0.8, 1.3, 0.8);
    spireL.position.set(-0.24, 0.36, 0.1);
    spireL.rotation.z = 0.35;
    const spireR = spireL.clone();
    spireR.position.set(0.24, 0.32, -0.08);
    spireR.rotation.z = -0.4;
    visualMesh.add(spireMain, spireL, spireR);
  }

  visualMesh.scale.setScalar(Math.max(0.45, targetScale * 0.85));
  ring.scale.setScalar(Math.max(0.65, targetScale * 0.72));

  const label = `${targetScale.toFixed(1)}x`;
  const badge = createBadgeSprite(label, isBig ? '#f59e0b' : '#06b6d4');
  badge.position.y = Math.max(1.2, targetScale * 1.05 + 0.55);
  group.add(badge);

  return { group, visualMesh, ring, badge };
}

/**
 * Builds composite 3–5 part Enemy models grounded at y = 0.
 */
export function createEnemyGroup(def: EnemyDef): THREE.Group {
  const group = new THREE.Group();

  if (def.kind === 'chomper') {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.35, metalness: 0.15 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.5 });
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });

    const chassis = new THREE.Mesh(new THREE.SphereGeometry(0.58, 16, 12), bodyMat);
    chassis.position.y = 0.62;
    chassis.castShadow = true;

    const wheelL = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 12), darkMat);
    wheelL.rotation.z = Math.PI / 2;
    wheelL.position.set(-0.56, 0.24, 0);
    const wheelR = wheelL.clone();
    wheelR.position.x = 0.56;

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.7 }),
    );
    visor.position.set(0, 0.74, 0.48);

    for (let i = -1; i <= 1; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 6), toothMat);
      tooth.rotation.x = Math.PI;
      tooth.position.set(i * 0.18, 0.52, 0.52);
      group.add(tooth);
    }
    group.add(chassis, wheelL, wheelR, visor);
    group.add(createContactShadow(0.7));
  } else if (def.kind === 'drone') {
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.25, metalness: 0.5 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.9,
    });
    const hull = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 1), hullMat);
    hull.position.y = 1.05;
    hull.castShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.06, 8, 24), glowMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.05;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), glowMat);
    eye.position.set(0, 1.05, 0.45);
    group.add(hull, ring, eye);
    group.add(createContactShadow(0.65));
  } else if (def.kind === 'saw') {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.14, 18), steelMat);
    disc.position.y = 0.28;
    disc.castShadow = true;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12), hubMat);
    hub.position.y = 0.28;
    for (let i = 0; i < 8; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 4), steelMat);
      const a = (i / 8) * Math.PI * 2;
      tooth.position.set(Math.cos(a) * 0.96, 0.28, Math.sin(a) * 0.96);
      tooth.rotation.z = -Math.PI / 2;
      tooth.rotation.y = -a;
      group.add(tooth);
    }
    group.add(disc, hub);
  } else {
    // laser barrier
    const w = def.width ?? 10;
    const clearance = def.clearanceHeight ?? 1.05;
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7 });
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.88,
    });
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 2.8, 10), postMat);
    postL.position.set(-w / 2, 1.4, 0);
    postL.castShadow = true;
    const postR = postL.clone();
    postR.position.x = w / 2;

    const beam1 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, w, 10), beamMat);
    beam1.rotation.z = Math.PI / 2;
    beam1.position.set(0, clearance + 0.15, 0);
    const beam2 = beam1.clone();
    beam2.position.y = clearance + 0.85;
    const beam3 = beam1.clone();
    beam3.position.y = clearance + 1.55;

    const badge = createBadgeSprite('TINY LIMBO', '#f43f5e');
    badge.position.set(0, clearance + 2.2, 0);
    group.add(postL, postR, beam1, beam2, beam3, badge);
  }

  return group;
}

/**
 * Builds Coins, Stars, and 4 Power-up pickups as multi-part 3D objects.
 */
export function createCollectibleGroup(def: CollectibleDef): THREE.Group {
  const group = new THREE.Group();

  if (def.kind === 'coin') {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.2,
      metalness: 0.85,
      emissive: 0xca8a04,
      emissiveIntensity: 0.2,
    });
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.1, 18), goldMat);
    rim.rotation.x = Math.PI / 2;
    rim.castShadow = true;
    const inner = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.36, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.2, metalness: 0.9 }),
    );
    group.add(rim, inner);
  } else if (def.kind === 'star') {
    const starMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
      roughness: 0.15,
      metalness: 0.7,
      clearcoat: 1,
    });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), starMat);
    core.castShadow = true;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.66, 0.05, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.6 }),
    );
    group.add(core, ring);
  } else {
    const colorMap: Record<PowerUpKind, number> = {
      speed: 0x06b6d4,
      shield: 0x3b82f6,
      magnet: 0xec4899,
      surge: 0xa855f7,
    };
    const labelMap: Record<PowerUpKind, string> = {
      speed: 'TURBO',
      shield: 'SHIELD',
      magnet: 'MAGNET',
      surge: 'SURGE',
    };
    const hex = colorMap[def.kind];
    const orb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 1),
      new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.55,
        roughness: 0.2,
        metalness: 0.4,
      }),
    );
    orb.castShadow = true;
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.045, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    halo.rotation.x = Math.PI / 3;
    const badge = createBadgeSprite(labelMap[def.kind], `#${hex.toString(16).padStart(6, '0')}`);
    badge.position.y = 0.95;
    badge.scale.set(1.3, 0.48, 1);
    group.add(orb, halo, badge);
  }

  return group;
}

/**
 * Builds the Swirling Goal Portal grounded at y = 0.
 */
export function createGoalPortal(): { group: THREE.Group; innerRing: THREE.Mesh; core: THREE.Mesh } {
  const group = new THREE.Group();

  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.65 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.8,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 0.28, 24), pillarMat);
  base.position.y = 0.14;
  base.receiveShadow = true;

  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.22, 12, 32, Math.PI), pillarMat);
  arch.position.y = 1.65;
  arch.castShadow = true;

  const colL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 1.65, 12), pillarMat);
  colL.position.set(-1.75, 0.85, 0);
  colL.castShadow = true;
  const colR = colL.clone();
  colR.position.x = 1.75;

  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.08, 10, 28), trimMat);
  innerRing.position.y = 1.75;

  const core = new THREE.Mesh(
    new THREE.CircleGeometry(1.32, 24),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    }),
  );
  core.position.y = 1.75;

  const badge = createBadgeSprite('FINISH', '#22c55e');
  badge.position.y = 4.1;

  group.add(base, arch, colL, colR, innerRing, core, badge);
  return { group, innerRing, core };
}

/**
 * Builds stylized natural scenery beyond the playable arena perimeter (hills + trees via InstancedMesh).
 */
export function buildOutdoorBackdrop(
  scene: THREE.Object3D,
  world: WorldTheme,
  arenaW: number,
  arenaD: number,
): THREE.Object3D[] {
  const created: THREE.Object3D[] = [];
  const pal = WORLD_PALETTES[world];

  // Outer ground skirt extending far to horizon fog
  const skirtGeo = new THREE.PlaneGeometry(320, 320);
  skirtGeo.rotateX(-Math.PI / 2);
  const skirtMat = new THREE.MeshStandardMaterial({
    color: world === 'meadow' ? 0x15803d : world === 'factory' ? 0x0f172a : world === 'sky' ? 0xbae6fd : 0x1e1b4b,
    roughness: 0.92,
  });
  const skirt = new THREE.Mesh(skirtGeo, skirtMat);
  skirt.position.y = -1.2;
  skirt.receiveShadow = false;
  scene.add(skirt);
  created.push(skirt);

  // Stylized distant mounds / towers around perimeter
  const moundCount = 48;
  const moundGeo =
    world === 'factory' || world === 'citadel'
      ? new THREE.CylinderGeometry(2.2, 3.2, 9, 8)
      : new THREE.ConeGeometry(4.5, 9, 7);
  const moundMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: world === 'factory' ? 0.4 : 0.05 });
  const mounds = new THREE.InstancedMesh(moundGeo, moundMat, moundCount);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  for (let i = 0; i < moundCount; i++) {
    const angle = (i / moundCount) * Math.PI * 2;
    const radius = Math.max(arenaW, arenaD) * 0.72 + (i % 4) * 9;
    dummy.position.set(
      Math.cos(angle) * radius,
      -1.2 + (i % 3) * 1.1,
      Math.sin(angle) * radius,
    );
    const s = 0.75 + (i % 5) * 0.28;
    dummy.scale.set(s, s * (0.8 + (i % 3) * 0.35), s);
    dummy.rotation.y = i * 0.7;
    dummy.updateMatrix();
    mounds.setMatrixAt(i, dummy.matrix);
    col.setHex(pal.foliageColors[i % pal.foliageColors.length]);
    mounds.setColorAt(i, col);
  }
  mounds.instanceMatrix.needsUpdate = true;
  if (mounds.instanceColor) mounds.instanceColor.needsUpdate = true;
  mounds.computeBoundingSphere();
  scene.add(mounds);
  created.push(mounds);

  return created;
}
