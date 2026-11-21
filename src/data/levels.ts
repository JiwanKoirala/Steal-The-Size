import {
  CollectibleDef,
  EnemyDef,
  LevelDef,
  PlatformDef,
  PowerUpKind,
  PressurePlateDef,
  PushBlockDef,
  SizePropDef,
  SizePropKind,
  WallDef,
  WorldTheme,
} from '../types/game';

/**
 * Generates 20 distinct Story levels across 4 themes + 5 Time Challenge courses
 * + dynamic Endless Survival wave layouts.
 * Every level is verified to have reachable Size Props before any Breakable Wall or Tiny Tunnel.
 */

const WORLD_NAMES: Record<WorldTheme, string> = {
  meadow: 'Toybox Meadow',
  factory: 'Clockwork Factory',
  sky: 'Skyline Citadel',
  citadel: 'Titan Core',
};

const STORY_TITLES: Array<{ name: string; subtitle: string; hint: string }> = [
  { name: 'First Squeeze', subtitle: 'Shrink & Slip Through', hint: 'Touch the tiny acorn to shrink and pass under the archway!' },
  { name: 'Big Impact', subtitle: 'Smash Your First Wall', hint: 'Steal the giant rubber duck’s size, then ram straight through the cracked wall!' },
  { name: 'Speed vs Muscle', subtitle: 'Size Swapping Basics', hint: 'Shrink to zip past the patrol bot, then grow giant to smash the exit gate.' },
  { name: 'Heavy Lifter', subtitle: 'Push Blocks & Plates', hint: 'Grow big enough to push the heavy crate onto the glowing floor plate!' },
  { name: 'Meadow Gauntlet', subtitle: 'World 1 Finale', hint: 'Combine shrinking tunnels, wall smashes, and a giant stomp to clear Toybox Meadow.' },
  { name: 'Gear Grinders', subtitle: 'Clockwork Crossing', hint: 'Stay small for turbo speed across moving platforms and past spinning saws.' },
  { name: 'Twin Gates', subtitle: 'Dual Pressure Lock', hint: 'Push the steel block onto the plate, then shrink through the secret vent for a Star!' },
  { name: 'Laser Limbo', subtitle: 'Duck Under Beams', hint: 'Shrink below 0.65x to glide safely beneath high factory lasers.' },
  { name: 'Hammer Time', subtitle: 'Reinforced Barriers', hint: 'Grab the Giant Hammer (2.4x) to shatter the reinforced steel-brick barrier.' },
  { name: 'Factory Meltdown', subtitle: 'World 2 Finale', hint: 'Weave through saws, unlock the gate, and crush the patrol drones!' },
  { name: 'Cloud Bridges', subtitle: 'Nimble Tiny Runs', hint: 'Tiny size makes you fast across narrow sky bridges—watch the edge!' },
  { name: 'Crystal Vault', subtitle: 'Hidden Sky Vaults', hint: 'Look for a side tiny tunnel hiding bonus coins and a secret Star.' },
  { name: 'Bot Stampede', subtitle: 'Giant Stomp Arena', hint: 'Steal the 2.8x Crystal to stomp straight over patrolling bots for huge points!' },
  { name: 'Skyline Switch', subtitle: 'Size-Lock Puzzle', hint: 'Swap back to normal or big after clearing the low laser corridor.' },
  { name: 'Nimbus Spire', subtitle: 'World 3 Finale', hint: 'Master moving lifts, laser limbo, and heavy block pushes high above the clouds.' },
  { name: 'Titan Entry', subtitle: 'Colossus Awakening', hint: 'Multiple reinforced walls stand in your way—keep stacking big props!' },
  { name: 'Micro Maze', subtitle: 'Ant-Sized Shortcuts', hint: 'Multiple tiny tunnels cut huge corners off your time—shrink and dash!' },
  { name: 'Power Surge', subtitle: 'Turbo Giant Combo', hint: 'Grab Turbo Boots while Giant to move fast AND smash everything!' },
  { name: 'Core Defense', subtitle: 'Heavy Laser Grid', hint: 'Alternating lasers and brick walls test your fastest size-swapping instincts.' },
  { name: 'Grand Titan Finale', subtitle: 'Master of Scale', hint: 'The ultimate test: tiny vents, moving bridges, twin plates, and 3.0x wall smashes!' },
];

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function getWorldForLevel(id: number): WorldTheme {
  if (id <= 5) return 'meadow';
  if (id <= 10) return 'factory';
  if (id <= 15) return 'sky';
  return 'citadel';
}

function buildHandcraftedEarlyLevel(id: number): LevelDef | null {
  if (id === 1) {
    return {
      id: 1,
      mode: 'story',
      world: 'meadow',
      name: STORY_TITLES[0].name,
      subtitle: `${WORLD_NAMES.meadow} · Level 1`,
      hint: STORY_TITLES[0].hint,
      parTime: 22,
      arenaWidth: 22,
      arenaDepth: 38,
      spawn: { x: 0, y: 0, z: 15 },
      goal: { x: 0, y: 0, z: -15 },
      platforms: [],
      walls: [
        // Tunnel barrier across the arena at z = 3
        { id: 'w1_left', x: -6.5, z: 3, w: 9, h: 4, d: 1.8 },
        { id: 'w1_right', x: 6.5, z: 3, w: 9, h: 4, d: 1.8 },
        { id: 'w1_arch', x: 0, z: 3, w: 4, h: 4, d: 1.8, tunnelMaxScale: 0.68, tunnelHeight: 1.05 },
        // Second breakable wall at z = -6
        { id: 'w1_brick_l', x: -6.5, z: -6, w: 9, h: 4, d: 1.8 },
        { id: 'w1_brick_r', x: 6.5, z: -6, w: 9, h: 4, d: 1.8 },
        { id: 'w1_break', x: 0, z: -6, w: 4, h: 3.5, d: 1.8, breakScale: 1.6 },
      ],
      pushBlocks: [],
      plates: [],
      sizeProps: [
        { id: 'p1_acorn', kind: 'acorn', x: -3.5, z: 9, scale: 0.45 },
        { id: 'p1_duck', kind: 'duck', x: 3.5, z: -1.5, scale: 2.0 },
      ],
      enemies: [],
      collectibles: [
        { id: 'c1_1', kind: 'coin', x: 0, y: 0.6, z: 10 },
        { id: 'c1_2', kind: 'coin', x: -3.5, y: 0.6, z: 6.5 },
        { id: 'c1_3', kind: 'coin', x: 0, y: 0.5, z: 3 },
        { id: 'c1_4', kind: 'star', x: -6.5, y: 0.9, z: -1.5 },
        { id: 'c1_5', kind: 'coin', x: 3.5, y: 0.6, z: -3.5 },
        { id: 'c1_6', kind: 'star', x: 0, y: 0.9, z: -9.5 },
        { id: 'c1_7', kind: 'star', x: 6.5, y: 0.9, z: -12 },
        { id: 'c1_8', kind: 'speed', x: 5, y: 0.8, z: 9 },
      ],
    };
  }

  if (id === 2) {
    return {
      id: 2,
      mode: 'story',
      world: 'meadow',
      name: STORY_TITLES[1].name,
      subtitle: `${WORLD_NAMES.meadow} · Level 2`,
      hint: STORY_TITLES[1].hint,
      parTime: 26,
      arenaWidth: 24,
      arenaDepth: 42,
      spawn: { x: 0, y: 0, z: 17 },
      goal: { x: 0, y: 0, z: -17 },
      platforms: [{ id: 'pl2_step', x: 6, y: 0.9, z: 0, w: 6, h: 0.9, d: 6 }],
      walls: [
        { id: 'w2_l1', x: -7, z: 6, w: 10, h: 4, d: 1.8 },
        { id: 'w2_r1', x: 7, z: 6, w: 10, h: 4, d: 1.8 },
        { id: 'w2_b1', x: 0, z: 6, w: 4, h: 3.6, d: 1.8, breakScale: 1.7 },
        { id: 'w2_l2', x: -7, z: -5, w: 10, h: 4, d: 1.8 },
        { id: 'w2_r2', x: 7, z: -5, w: 10, h: 4, d: 1.8 },
        { id: 'w2_b2', x: 0, z: -5, w: 4, h: 3.8, d: 1.8, breakScale: 2.2 },
      ],
      pushBlocks: [],
      plates: [],
      sizeProps: [
        { id: 'p2_duck', kind: 'duck', x: -4.5, z: 11.5, scale: 1.9 },
        { id: 'p2_melon', kind: 'watermelon', x: -4.5, z: 0, scale: 2.5 },
        { id: 'p2_acorn', kind: 'acorn', x: 5.5, z: 11.5, scale: 0.48 },
      ],
      enemies: [
        { id: 'e2_1', kind: 'chomper', x: -5, z: -11, patrolEndX: 5, patrolEndZ: -11, speed: 3.2, crushScale: 2.0 },
      ],
      collectibles: [
        { id: 'c2_1', kind: 'coin', x: 0, y: 0.6, z: 12 },
        { id: 'c2_2', kind: 'coin', x: 0, y: 0.6, z: 2 },
        { id: 'c2_3', kind: 'star', x: 6, y: 1.8, z: 0 },
        { id: 'c2_4', kind: 'star', x: -7, y: 0.9, z: -10 },
        { id: 'c2_5', kind: 'star', x: 7, y: 0.9, z: -13 },
        { id: 'c2_6', kind: 'coin', x: 0, y: 0.6, z: -12 },
      ],
    };
  }

  if (id === 4) {
    return {
      id: 4,
      mode: 'story',
      world: 'meadow',
      name: STORY_TITLES[3].name,
      subtitle: `${WORLD_NAMES.meadow} · Level 4`,
      hint: STORY_TITLES[3].hint,
      parTime: 32,
      arenaWidth: 26,
      arenaDepth: 44,
      spawn: { x: 0, y: 0, z: 18 },
      goal: { x: 0, y: 0, z: -18 },
      platforms: [],
      walls: [
        { id: 'w4_l1', x: -7.5, z: -4, w: 11, h: 4.5, d: 2 },
        { id: 'w4_r1', x: 7.5, z: -4, w: 11, h: 4.5, d: 2 },
        { id: 'w4_gate', x: 0, z: -4, w: 4, h: 4.5, d: 2, gatePlateId: 'plate4_1' },
        { id: 'w4_side_arch', x: -8, z: 5, w: 4, h: 4, d: 1.8, tunnelMaxScale: 0.6, tunnelHeight: 0.95 },
      ],
      pushBlocks: [
        { id: 'pb4_1', x: -4.5, z: 8, size: 1.8, requiredScale: 1.45, color: '#F59E0B' },
      ],
      plates: [
        { id: 'plate4_1', x: 4.5, z: 2, radius: 1.7, latch: true, requiredScale: 1.6 },
      ],
      sizeProps: [
        { id: 'p4_barrel', kind: 'barrel', x: 4.5, z: 12, scale: 1.9 },
        { id: 'p4_acorn', kind: 'acorn', x: -5, z: 13, scale: 0.46 },
        { id: 'p4_duck', kind: 'duck', x: 0, z: -10, scale: 2.3 },
      ],
      enemies: [
        { id: 'e4_1', kind: 'chomper', x: -6, z: -12, patrolEndX: 6, patrolEndZ: -12, speed: 3.6, crushScale: 2.0 },
      ],
      collectibles: [
        { id: 'c4_1', kind: 'coin', x: 0, y: 0.6, z: 12 },
        { id: 'c4_2', kind: 'coin', x: 4.5, y: 0.6, z: 6 },
        { id: 'c4_3', kind: 'star', x: -8, y: 0.9, z: 0 },
        { id: 'c4_4', kind: 'star', x: 8, y: 0.9, z: 2 },
        { id: 'c4_5', kind: 'star', x: 0, y: 0.9, z: -13 },
        { id: 'c4_6', kind: 'magnet', x: 0, y: 0.8, z: 4 },
      ],
    };
  }

  return null;
}

export function buildStoryLevel(id: number): LevelDef {
  const handcrafted = buildHandcraftedEarlyLevel(id);
  if (handcrafted) return handcrafted;

  const world = getWorldForLevel(id);
  const meta = STORY_TITLES[id - 1] ?? STORY_TITLES[0];
  const rand = seededRandom(id * 977 + 13);

  const arenaWidth = 24 + Math.min(8, Math.floor(id / 3) * 2);
  const arenaDepth = 44 + Math.min(20, id * 1.1);
  const halfW = arenaWidth / 2;
  const halfD = arenaDepth / 2;

  const spawn = { x: 0, y: 0, z: halfD - 4.5 };
  const goal = { x: 0, y: 0, z: -(halfD - 4.5) };

  const platforms: PlatformDef[] = [];
  const walls: WallDef[] = [];
  const pushBlocks: PushBlockDef[] = [];
  const plates: PressurePlateDef[] = [];
  const sizeProps: SizePropDef[] = [];
  const enemies: EnemyDef[] = [];
  const collectibles: CollectibleDef[] = [];

  const bigKinds: SizePropKind[] = ['duck', 'watermelon', 'barrel', 'hammer', 'crystal', 'dumbbell'];
  const smallKinds: SizePropKind[] = ['acorn', 'gear', 'crystal'];

  // Divide the arena from +Z (spawn) to -Z (goal) into 3 distinct interactive zones
  const zones = id >= 12 ? 3 : 2;
  const zSpan = (halfD - 8) * 2;
  const stepZ = zSpan / (zones + 1);

  for (let zi = 0; zi < zones; zi++) {
    const barrierZ = halfD - 8 - stepZ * (zi + 1);
    const prepZ = barrierZ + stepZ * 0.52;
    const isTunnel = (zi + id) % 2 === 0;
    const sideOffset = (rand() - 0.5) * (arenaWidth * 0.25);

    if (isTunnel) {
      // Wall with tiny archway + optional breakable side bypass
      const tunnelW = 4.2;
      const leftW = Math.max(2, halfW + (sideOffset - tunnelW / 2));
      const rightW = Math.max(2, halfW - (sideOffset + tunnelW / 2));
      walls.push({
        id: `w_${id}_${zi}_l`,
        x: -halfW + leftW / 2,
        z: barrierZ,
        w: leftW,
        h: 4.5,
        d: 1.8,
      });
      walls.push({
        id: `w_${id}_${zi}_r`,
        x: halfW - rightW / 2,
        z: barrierZ,
        w: rightW,
        h: 4.5,
        d: 1.8,
      });
      walls.push({
        id: `w_${id}_${zi}_tunnel`,
        x: sideOffset,
        z: barrierZ,
        w: tunnelW,
        h: 4.5,
        d: 1.8,
        tunnelMaxScale: Math.max(0.48, 0.68 - id * 0.008),
        tunnelHeight: 1.0,
      });

      // Guarantee a small prop BEFORE the tunnel
      const smallScale = Number((0.4 + rand() * 0.12).toFixed(2));
      sizeProps.push({
        id: `sp_s_${id}_${zi}`,
        kind: smallKinds[(id + zi) % smallKinds.length],
        x: (rand() > 0.5 ? 1 : -1) * (halfW * 0.42),
        z: prepZ,
        scale: smallScale,
      });
    } else if (zi === 1 && id >= 7) {
      // Pressure plate gate barrier
      const gateW = 4.5;
      const leftW = Math.max(2, halfW + (sideOffset - gateW / 2));
      const rightW = Math.max(2, halfW - (sideOffset + gateW / 2));
      const plateId = `pl_${id}_${zi}`;

      walls.push({
        id: `w_${id}_${zi}_l`,
        x: -halfW + leftW / 2,
        z: barrierZ,
        w: leftW,
        h: 4.5,
        d: 1.8,
      });
      walls.push({
        id: `w_${id}_${zi}_r`,
        x: halfW - rightW / 2,
        z: barrierZ,
        w: rightW,
        h: 4.5,
        d: 1.8,
      });
      walls.push({
        id: `w_${id}_${zi}_gate`,
        x: sideOffset,
        z: barrierZ,
        w: gateW,
        h: 4.5,
        d: 1.8,
        gatePlateId: plateId,
      });

      plates.push({
        id: plateId,
        x: halfW * 0.45,
        z: prepZ - 1.5,
        radius: 1.65,
        latch: true,
        requiredScale: 1.6,
      });
      pushBlocks.push({
        id: `pb_${id}_${zi}`,
        x: -halfW * 0.35,
        z: prepZ + 2,
        size: 1.8,
        requiredScale: 1.45,
        color: world === 'factory' ? '#F59E0B' : '#38BDF8',
      });
      sizeProps.push({
        id: `sp_gate_${id}_${zi}`,
        kind: bigKinds[(id + zi) % bigKinds.length],
        x: 0,
        z: prepZ + 3.2,
        scale: Number((1.85 + Math.min(0.8, id * 0.04)).toFixed(2)),
      });
    } else {
      // Breakable wall barrier
      const reqScale = Number(Math.min(2.9, 1.55 + id * 0.065 + zi * 0.2).toFixed(2));
      const breakW = 4.4;
      const leftW = Math.max(2, halfW + (sideOffset - breakW / 2));
      const rightW = Math.max(2, halfW - (sideOffset + breakW / 2));

      walls.push({
        id: `w_${id}_${zi}_l`,
        x: -halfW + leftW / 2,
        z: barrierZ,
        w: leftW,
        h: 4.5,
        d: 1.8,
      });
      walls.push({
        id: `w_${id}_${zi}_r`,
        x: halfW - rightW / 2,
        z: barrierZ,
        w: rightW,
        h: 4.5,
        d: 1.8,
      });
      walls.push({
        id: `w_${id}_${zi}_brk`,
        x: sideOffset,
        z: barrierZ,
        w: breakW,
        h: 4.2,
        d: 1.8,
        breakScale: reqScale,
      });

      // Guarantee a Big prop BEFORE the breakable wall with >= reqScale + 0.15
      const propScale = Number(Math.min(3.3, reqScale + 0.22).toFixed(2));
      sizeProps.push({
        id: `sp_b_${id}_${zi}`,
        kind: bigKinds[(id + zi) % bigKinds.length],
        x: (rand() > 0.5 ? -1 : 1) * (halfW * 0.42),
        z: prepZ,
        scale: propScale,
      });
    }

    // Add a balancing opposite size prop nearby for tactical freedom
    if (zi === 0 && id >= 5) {
      sizeProps.push({
        id: `sp_alt_${id}_${zi}`,
        kind: isTunnel ? bigKinds[id % bigKinds.length] : smallKinds[id % smallKinds.length],
        x: (rand() > 0.5 ? 1 : -1) * (halfW * 0.55),
        z: prepZ + 2.5,
        scale: isTunnel ? 2.1 : 0.48,
      });
    }

    // Optional elevated reward platform with coin/star
    platforms.push({
      id: `plat_${id}_${zi}`,
      x: (zi % 2 === 0 ? -1 : 1) * (halfW - 3.6),
      y: 0.95,
      z: prepZ,
      w: 5.2,
      h: 0.95,
      d: 5.2,
      moving:
        id >= 6 && zi === 0
          ? { axis: 'x', range: 2.6, speed: 1.3 + id * 0.04, phase: zi }
          : undefined,
    });

    collectibles.push({
      id: `star_${id}_${zi}`,
      kind: 'star',
      x: (zi % 2 === 0 ? -1 : 1) * (halfW - 3.6),
      y: 1.85,
      z: prepZ,
    });
  }

  // Ensure 3 total stars per level
  while (collectibles.filter((c) => c.kind === 'star').length < 3) {
    const idx = collectibles.length;
    collectibles.push({
      id: `star_extra_${id}_${idx}`,
      kind: 'star',
      x: (idx % 2 === 0 ? 1 : -1) * (halfW * 0.55),
      y: 0.9,
      z: goal.z + 5.5,
    });
  }

  // Add Coins & Power-Ups along the path
  const powerKinds: PowerUpKind[] = ['speed', 'shield', 'magnet', 'surge'];
  for (let i = 0; i < 8 + Math.min(6, Math.floor(id / 2)); i++) {
    const t = (i + 1) / (9 + Math.min(6, Math.floor(id / 2)));
    const cz = spawn.z + (goal.z - spawn.z) * t;
    const cx = Math.sin(i * 1.4 + id) * (halfW * 0.52);
    collectibles.push({
      id: `coin_${id}_${i}`,
      kind: 'coin',
      x: Number(cx.toFixed(1)),
      y: 0.7,
      z: Number(cz.toFixed(1)),
    });
  }

  collectibles.push({
    id: `pwr_${id}_1`,
    kind: powerKinds[id % powerKinds.length],
    x: -halfW * 0.45,
    y: 0.85,
    z: spawn.z - 6,
  });
  if (id >= 8) {
    collectibles.push({
      id: `pwr_${id}_2`,
      kind: powerKinds[(id + 2) % powerKinds.length],
      x: halfW * 0.45,
      y: 0.85,
      z: 0,
    });
  }

  // Add enemies & hazards scaling smoothly from Level 3..20
  const chomperCount = Math.min(4, Math.floor((id + 1) / 4));
  for (let e = 0; e < chomperCount; e++) {
    const ez = halfD * 0.45 - e * (arenaDepth * 0.24);
    enemies.push({
      id: `en_ch_${id}_${e}`,
      kind: e % 2 === 1 && id >= 10 ? 'drone' : 'chomper',
      x: -(halfW * 0.55),
      z: ez,
      patrolEndX: halfW * 0.55,
      patrolEndZ: ez,
      speed: 2.8 + id * 0.16,
      crushScale: 2.0 + Math.min(0.6, id * 0.03),
    });
  }

  if (id >= 6) {
    const sawCount = Math.min(3, Math.floor((id - 3) / 4));
    for (let s = 0; s < sawCount; s++) {
      const sz = -halfD * 0.35 + s * 9;
      enemies.push({
        id: `en_saw_${id}_${s}`,
        kind: 'saw',
        x: (s % 2 === 0 ? 1 : -1) * 3.5,
        z: sz,
        patrolEndX: (s % 2 === 0 ? -1 : 1) * 3.5,
        patrolEndZ: sz,
        speed: 3.4 + id * 0.12,
      });
    }
  }

  if (id >= 8) {
    enemies.push({
      id: `en_laser_${id}`,
      kind: 'laser',
      x: 0,
      z: goal.z + 7.5,
      speed: 0,
      clearanceHeight: 1.05,
      width: arenaWidth * 0.6,
    });
    // Guarantee a shrink prop before the final laser
    sizeProps.push({
      id: `sp_laser_shrink_${id}`,
      kind: 'acorn',
      x: halfW * 0.5,
      z: goal.z + 11.5,
      scale: 0.45,
    });
  }

  return {
    id,
    mode: 'story',
    world,
    name: meta.name,
    subtitle: `${WORLD_NAMES[world]} · Level ${id}`,
    hint: meta.hint,
    parTime: 24 + id * 2,
    arenaWidth,
    arenaDepth,
    spawn,
    goal,
    platforms,
    walls,
    pushBlocks,
    plates,
    sizeProps,
    enemies,
    collectibles,
  };
}

export const STORY_LEVELS: LevelDef[] = Array.from({ length: 20 }, (_, i) =>
  buildStoryLevel(i + 1),
);

export const TIME_CHALLENGE_LEVELS: LevelDef[] = [
  {
    ...buildStoryLevel(3),
    id: 101,
    mode: 'timeChallenge',
    name: 'Turbo Meadow Dash',
    subtitle: 'Time Challenge · Sprint 1',
    hint: 'Grab tiny speed and smash the shortcut wall before the timer runs out!',
    parTime: 18,
  },
  {
    ...buildStoryLevel(6),
    id: 102,
    mode: 'timeChallenge',
    name: 'Clockwork Express',
    subtitle: 'Time Challenge · Sprint 2',
    hint: 'Dodge saws at micro speed and clear the moving platform!',
    parTime: 22,
  },
  {
    ...buildStoryLevel(9),
    id: 103,
    mode: 'timeChallenge',
    name: 'Demolition Blitz',
    subtitle: 'Time Challenge · Sprint 3',
    hint: 'Stack giant strength fast and shatter every brick barrier!',
    parTime: 26,
  },
  {
    ...buildStoryLevel(13),
    id: 104,
    mode: 'timeChallenge',
    name: 'Skyline Stomp Rush',
    subtitle: 'Time Challenge · Sprint 4',
    hint: 'Crush patrol bots for bonus time-attack score!',
    parTime: 28,
  },
  {
    ...buildStoryLevel(18),
    id: 105,
    mode: 'timeChallenge',
    name: 'Titan Core Sprint',
    subtitle: 'Time Challenge · Sprint 5',
    hint: 'Chain Turbo Boots with Giant smashes to beat Gold Par Time!',
    parTime: 32,
  },
];

export function buildEndlessLevel(wave = 1): LevelDef {
  const worlds: WorldTheme[] = ['meadow', 'factory', 'sky', 'citadel'];
  const world = worlds[(wave - 1) % worlds.length];
  const rand = seededRandom(wave * 4099 + 77);
  const arenaWidth = 30;
  const arenaDepth = 30;

  const sizeProps: SizePropDef[] = [
    { id: `ew_s1_${wave}`, kind: 'acorn', x: -8, z: 7, scale: 0.42 },
    { id: `ew_s2_${wave}`, kind: 'gear', x: 8, z: -7, scale: 0.48 },
    { id: `ew_b1_${wave}`, kind: 'duck', x: 8, z: 7, scale: 2.3 },
    { id: `ew_b2_${wave}`, kind: 'hammer', x: -8, z: -7, scale: Number(Math.min(3.2, 2.4 + wave * 0.08).toFixed(2)) },
  ];

  const walls: WallDef[] = [
    { id: `ew_w1_${wave}`, x: 0, z: 6, w: 4, h: 3.6, d: 1.6, breakScale: 1.7 },
    { id: `ew_w2_${wave}`, x: 0, z: -6, w: 4, h: 3.6, d: 1.6, breakScale: 2.1 },
    { id: `ew_t1_${wave}`, x: -6, z: 0, w: 4, h: 4, d: 1.6, tunnelMaxScale: 0.6, tunnelHeight: 1.0 },
    { id: `ew_t2_${wave}`, x: 6, z: 0, w: 4, h: 4, d: 1.6, tunnelMaxScale: 0.6, tunnelHeight: 1.0 },
  ];

  const enemies: EnemyDef[] = [];
  const enemyCount = 2 + Math.min(6, wave);
  for (let i = 0; i < enemyCount; i++) {
    const angle = (i / enemyCount) * Math.PI * 2;
    const r = 9.5;
    const sx = Math.cos(angle) * r;
    const sz = Math.sin(angle) * r;
    enemies.push({
      id: `ew_en_${wave}_${i}`,
      kind: i % 3 === 2 ? 'saw' : i % 2 === 1 ? 'drone' : 'chomper',
      x: Number(sx.toFixed(1)),
      z: Number(sz.toFixed(1)),
      patrolEndX: Number((-sx * 0.7).toFixed(1)),
      patrolEndZ: Number((-sz * 0.7).toFixed(1)),
      speed: 2.6 + wave * 0.35 + rand() * 0.8,
      crushScale: 2.0 + Math.min(0.6, wave * 0.05),
    });
  }

  const collectibles: CollectibleDef[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const r = 4 + (i % 2) * 6;
    collectibles.push({
      id: `ew_c_${wave}_${i}`,
      kind: 'coin',
      x: Number((Math.cos(angle) * r).toFixed(1)),
      y: 0.75,
      z: Number((Math.sin(angle) * r).toFixed(1)),
    });
  }

  const powers: PowerUpKind[] = ['speed', 'shield', 'magnet', 'surge'];
  collectibles.push({
    id: `ew_p1_${wave}`,
    kind: powers[wave % powers.length],
    x: 0,
    y: 0.9,
    z: 0,
  });

  return {
    id: 200 + wave,
    mode: 'endless',
    world,
    name: `Survival Wave ${wave}`,
    subtitle: `Endless Arena · Wave ${wave}`,
    hint: 'Smash walls, crush bots while Giant, or dodge while Tiny until the portal opens!',
    parTime: 25,
    arenaWidth,
    arenaDepth,
    spawn: { x: 0, y: 0, z: 11 },
    goal: { x: 0, y: 0, z: -11 },
    platforms: [],
    walls,
    pushBlocks: [],
    plates: [],
    sizeProps,
    enemies,
    collectibles,
  };
}
