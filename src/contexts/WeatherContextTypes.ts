import { createContext } from 'react';
import type { WeatherContextType } from '../types/weather.types';

export const WeatherContext = createContext<WeatherContextType | undefined>(undefined);