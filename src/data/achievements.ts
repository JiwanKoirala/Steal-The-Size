import { AchievementDef } from '../types/game';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_steal',
    title: 'Size Thief',
    description: 'Steal the size of your very first object.',
    rewardCoins: 15,
  },
  {
    id: 'micro_sprinter',
    title: 'Pocket Rocket',
    description: 'Shrink down to 0.45x size or smaller.',
    rewardCoins: 25,
  },
  {
    id: 'colossus',
    title: 'Walking Titan',
    description: 'Grow to 2.6x size or larger.',
    rewardCoins: 25,
  },
  {
    id: 'first_smash',
    title: 'Wrecking Ball',
    description: 'Smash through your first breakable wall.',
    rewardCoins: 20,
  },
  {
    id: 'demolition_expert',
    title: 'Demolition Crew',
    description: 'Smash 25 breakable walls across any modes.',
    rewardCoins: 60,
  },
  {
    id: 'bot_crusher',
    title: 'Heavy Footstep',
    description: 'Crush 10 patrol bots while gigantic.',
    rewardCoins: 50,
  },
  {
    id: 'coin_collector',
    title: 'Treasure Magnet',
    description: 'Collect 150 total coins across your runs.',
    rewardCoins: 45,
  },
  {
    id: 'meadow_clear',
    title: 'Meadow Graduate',
    description: 'Complete Level 5 in Story Mode.',
    rewardCoins: 50,
  },
  {
    id: 'factory_clear',
    title: 'Factory Boss',
    description: 'Complete Level 10 in Story Mode.',
    rewardCoins: 75,
  },
  {
    id: 'sky_clear',
    title: 'Sky Striker',
    description: 'Complete Level 15 in Story Mode.',
    rewardCoins: 100,
  },
  {
    id: 'story_champion',
    title: 'Master of Scale',
    description: 'Complete all 20 Story Mode levels.',
    rewardCoins: 200,
  },
  {
    id: 'endless_wave_5',
    title: 'Endless Survivor',
    description: 'Reach Wave 5 in Endless Survival Mode.',
    rewardCoins: 80,
  },
];
