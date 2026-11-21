import { SkinDef } from '../types/game';

export const SKINS: SkinDef[] = [
  {
    id: 'volt_blob',
    name: 'Volt Morph',
    tagline: 'Cobalt jumper with springy signal antenna',
    price: 0,
    primaryColor: '#2563EB',
    secondaryColor: '#38BDF8',
    accentColor: '#FACC15',
    accessory: 'antenna',
  },
  {
    id: 'tangerine_mech',
    name: 'Tangerine Bot',
    tagline: 'Amber alloy shell and high-contrast visor',
    price: 45,
    primaryColor: '#EA580C',
    secondaryColor: '#FDBA74',
    accentColor: '#0F172A',
    accessory: 'visor',
  },
  {
    id: 'emerald_sprout',
    name: 'Meadow Sprout',
    tagline: 'Mossy jade coat with twin leaf shoots',
    price: 80,
    primaryColor: '#059669',
    secondaryColor: '#6EE7B7',
    accentColor: '#A3E635',
    accessory: 'sprout',
  },
  {
    id: 'crimson_ninja',
    name: 'Crimson Dash',
    tagline: 'Ruby stealth suit with trailing headband',
    price: 130,
    primaryColor: '#DC2626',
    secondaryColor: '#1E293B',
    accentColor: '#F8FAFC',
    accessory: 'headband',
  },
  {
    id: 'royal_jelly',
    name: 'Royal Crown',
    tagline: 'Plum velvet finish and solid gold crown',
    price: 200,
    primaryColor: '#7C3AED',
    secondaryColor: '#C4B5FD',
    accentColor: '#FBBF24',
    accessory: 'crown',
  },
  {
    id: 'cosmic_astro',
    name: 'Orbit Walker',
    tagline: 'Midnight starlight shell and golden dome visor',
    price: 300,
    primaryColor: '#0F172A',
    secondaryColor: '#38BDF8',
    accentColor: '#F59E0B',
    accessory: 'helmet',
  },
];

export function getSkinById(id: string): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
