/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export enum BuildingType {
  None = 'None',
  Road = 'Road',
  Residential = 'Residential',
  Commercial = 'Commercial',
  Industrial = 'Industrial',
  Park = 'Park',
  Mansion = 'Mansion',
  Hotel = 'Hotel',
  Casino = 'Casino',
  Library = 'Library',
  Restaurant = 'Restaurant',
  FastFood = 'FastFood',
  GasStation = 'GasStation',
  Bridge = 'Bridge',
  Tunnel = 'Tunnel',
  Wall = 'Wall',
  ApartmentComplex = 'ApartmentComplex',
  Skyscraper = 'Skyscraper',
  University = 'University',
  PowerPlant = 'PowerPlant',
  WaterTower = 'WaterTower',
}

export interface BuildingConfig {
  type: BuildingType;
  cost: number;
  name: string;
  description: string;
  color: string; // Main color for 3D material
  popGen: number; // Population generation per tick
  incomeGen: number; // Money generation per tick
  upgradeCost?: number;
  maxLevel?: number;
  powerRequired?: number;
  waterRequired?: number;
  powerGen?: number;
  waterGen?: number;
  happinessGen?: number;
}

export interface TileData {
  x: number;
  y: number;
  buildingType: BuildingType;
  level: number;
  variant?: number;
  demolishing?: boolean;
  justUpgraded?: boolean;
  powerCurrent?: boolean; // Does it have power?
  waterCurrent?: boolean; // Does it have water?
}

export type Grid = TileData[][];

export interface CityStats {
  money: number;
  population: number;
  day: number;
  invested: number;
  profitMade: number;
  revenue: number;
  powerTotal: number;
  powerUsed: number;
  waterTotal: number;
  waterUsed: number;
  happiness: number;
  xp: number;
}

export interface PlayerCharacter {
  x: number;
  y: number;
  rotation: number;
  appearance: {
    skinColor: string;
    shirtColor: string;
    hairColor: string;
  };
  mood: string;
  trait: string;
  rank: number;
}

export interface NPC {
  id: string;
  x: number;
  y: number;
  type: string;
  mood: string;
  speech?: string;
  speechTimer?: number;
}

export interface HistoryPoint {
  day: number;
  money: number;
  population: number;
  revenue: number;
}

export interface GameSettings {
  display: 'standard' | 'high' | 'minimal';
  uiScale: number;
  fpsLimit: number;
  volume: number;
  weather: 'sunny' | 'rainy' | 'cloudy' | 'night';
  weatherIntensity: number; // 0 to 1
  weatherFrequency: number; // 0 to 1
  graphicsQuality: 'low' | 'med' | 'high';
  gameSpeed: number;
  timeScale: 1 | 2 | 4 | 8;
  panLocked: boolean;
  camLocked: boolean;
  autoScrollNews: boolean;
  showTooltips: boolean;
  showLevelIndicators: boolean;
  soundEnabled: boolean;
  ambientEnabled: boolean;
  volumetricFog: boolean;
  fogDensity: number;
  lodEnabled: boolean;
  textureLevel: number; // 0: low, 1: med, 2: high
  shadowQuality: 'off' | 'low' | 'med' | 'high';
  shadowDarkness: number;
  antiAliasing: boolean;
  reflections: boolean;
  secondaryColor: string;
  theme: 'cyber' | 'minimal' | 'modern' | 'dnd' | 'cyberpunk' | 'gta' | 'lol' | 'pacman' | 'snowbros' | 'cadillacs' | 'streetfighter' | 'kof' | 'ss13' | 'ss14';
  npcAppearance: {
    advisorColor: string;
    citizenColor: string;
    skinColor: string;
  };
  cameraZoomSensitivity: number;
  maxVehicles: number;
  orientation: 'auto' | 'portrait' | 'landscape';
  cameraPerspective: 'isometric' | 'topdown' | 'ffp' | 'ttp' | 'map';
  brightness: number;
  contrast: number;
  bloomIntensity: number;
  globalLight: number;
  nightLight: number;
  nightDarkness: number;
}

export interface GameState {
  grid: Grid;
  stats: CityStats;
}

export interface HistoryItem {
  state: GameState;
  action: string;
}

export interface AIGoal {
  description: string;
  targetType: 'population' | 'money' | 'building_count';
  targetValue: number;
  buildingType?: BuildingType; // If target is building_count
  reward: number;
  completed: boolean;
}

export interface NewsItem {
  id: string;
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}