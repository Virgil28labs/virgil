/**
 * Location Cache Store
 * 
 * Separate store for location data caching with TTL support.
 * Persists IP-based location data for 24 hours to reduce lookups.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_CONFIG, createTTLData, getTTLData, type TTLData } from './utils/persistence';
import type { LocationSliceState } from './types/store.types';

export interface LocationCacheState {
  ipLocationCache: TTLData<LocationSliceState['ipLocation']> | null;
  addressCache: TTLData<LocationSliceState['address']> | null;
  lastIp: string | null;
}

export interface LocationCacheActions {
  setCachedIpLocation: (ipLocation: LocationSliceState['ipLocation'], ip?: string) => void;
  setCachedAddress: (address: LocationSliceState['address']) => void;
  getCachedIpLocation: () => LocationSliceState['ipLocation'] | null;
  getCachedAddress: () => LocationSliceState['address'] | null;
  clearLocationCache: () => void;
  isIpLocationCacheValid: (ip?: string) => boolean;
}

export interface LocationCacheStore extends LocationCacheState, LocationCacheActions {}

export const useLocationCacheStore = create<LocationCacheStore>()(
  persist(
    (set, get) => ({
      // State
      ipLocationCache: null,
      addressCache: null,
      lastIp: null,

      // Actions
      setCachedIpLocation: (ipLocation, ip) => {
        const ttlData = createTTLData(ipLocation, STORAGE_CONFIG.ttl.location);
        set({
          ipLocationCache: ttlData,
          lastIp: ip || ipLocation?.ip || get().lastIp,
        });
      },

      setCachedAddress: (address) => {
        const ttlData = createTTLData(address, STORAGE_CONFIG.ttl.location);
        set({ addressCache: ttlData });
      },

      getCachedIpLocation: () => {
        const state = get();
        return getTTLData(state.ipLocationCache);
      },

      getCachedAddress: () => {
        const state = get();
        return getTTLData(state.addressCache);
      },

      clearLocationCache: () => {
        set({
          ipLocationCache: null,
          addressCache: null,
          lastIp: null,
        });
      },

      isIpLocationCacheValid: (ip) => {
        const state = get();
        const cachedLocation = getTTLData(state.ipLocationCache);
        
        if (!cachedLocation) return false;
        
        // Check if IP has changed
        if (ip && state.lastIp && ip !== state.lastIp) {
          return false;
        }
        
        return true;
      },
    }),
    {
      name: STORAGE_CONFIG.keys.locationCache,
      // Only persist the cached data
      partialize: (state) => ({
        ipLocationCache: state.ipLocationCache,
        addressCache: state.addressCache,
        lastIp: state.lastIp,
      }),
    },
  ),
);