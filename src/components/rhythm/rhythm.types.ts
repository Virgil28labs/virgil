export interface DrumSound {
  name: string
  type: DrumType
}

export enum DrumType {
  KICK = 'kick',
  SNARE = 'snare',
  HIHAT = 'hihat',
  OPENHAT = 'openhat',
  CLAP = 'clap'
}

export interface SavedPattern {
  pattern: boolean[][]
  description: string
  category?: string
  timestamp: number
}

export interface BarLength {
  label: string
  bars: number
  steps: number
}

export const DRUM_SOUNDS: DrumSound[] = [
  { name: 'KICK', type: DrumType.KICK },
  { name: 'SNARE', type: DrumType.SNARE },
  { name: 'HIHAT', type: DrumType.HIHAT },
  { name: 'OPENHAT', type: DrumType.OPENHAT },
  { name: 'CLAP', type: DrumType.CLAP },
];

export const GENRE_TAGS = [
  '808 Cowbell', 'Glitch', 'Jazz Fusion', 'Afrobeat', 'Lo-Fi', 'Stadium Rock', 'Ambient',
];

export const DEFAULT_BPM = 120;

export const BAR_LENGTHS: BarLength[] = [
  { label: '1 Bar', bars: 1, steps: 4 },
  { label: '2 Bars', bars: 2, steps: 8 },
  { label: '4 Bars', bars: 4, steps: 16 },
  { label: '8 Bars', bars: 8, steps: 32 },
];
