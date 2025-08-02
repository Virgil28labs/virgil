/**
 * Persistence Demo Component
 * 
 * A simple demo component to test and showcase the persistence functionality
 * of the Context Store. Shows storage usage, cached data, and allows testing
 * of TTL expiration.
 */

import React from 'react';
import { 
  useContextStore,
  useWeatherCacheStore, 
  useLocationCacheStore,
  usePreferencesStore,
  storage,
  storageDebug,
  STORAGE_CONFIG, 
} from '../../stores';
import { timeService } from '../../services/TimeService';

export const PersistenceDemo: React.FC = () => {
  const user = useContextStore((state) => state.user);
  const weatherCache = useWeatherCacheStore();
  const locationCache = useLocationCacheStore();
  const preferences = usePreferencesStore();

  const storageUsage = storage.getUsage();

  const handleSetTestUser = () => {
    user.setUser({
      id: 'demo-user-123',
      name: 'Ben',
      dob: '28-11-1982',
      username: 'Ben28',
      email: 'ben@demo.com',
      app_metadata: {},
      user_metadata: { demo: true },
      aud: 'authenticated',
      created_at: timeService.toISOString(timeService.getCurrentDateTime()),
      updated_at: timeService.toISOString(timeService.getCurrentDateTime()),
      role: 'authenticated',
      identities: [],
      is_anonymous: false,
    });
  };

  const handleSetTestWeather = () => {
    const testWeather = {
      temperature: 72,
      feelsLike: 75,
      tempMin: 68,
      tempMax: 78,
      humidity: 65,
      pressure: 1013,
      windSpeed: 8.5,
      windDeg: 315,
      clouds: 0,
      visibility: 10000,
      condition: {
        id: 800,
        main: 'Clear',
        description: 'Clear sky',
        icon: '01d',
      },
      sunrise: timeService.getTimestamp() - 6 * 3600000, // 6 hours ago
      sunset: timeService.getTimestamp() + 6 * 3600000,  // 6 hours from now
      timezone: -18000,
      cityName: 'San Francisco',
      country: 'US',
      timestamp: timeService.getTimestamp(),
    };

    weatherCache.setCachedWeather(testWeather, { lat: 37.7749, lon: -122.4194 });
  };

  const handleSetTestLocation = () => {
    const testLocation = {
      ip: '192.168.1.100',
      city: 'San Francisco',
      region: 'CA',
      country: 'US',
      timezone: 'America/Los_Angeles',
      lat: 37.7749,
      lon: -122.4194,
    };

    locationCache.setCachedIpLocation(testLocation, testLocation.ip);
  };

  const handleSetTestPreferences = () => {
    preferences.setTheme('dark');
    preferences.setTemperatureUnit('celsius');
    preferences.updateDisplayPreferences({ compactMode: true });
  };

  const handleClearAllStorage = () => {
    storage.clearAll();
    window.location.reload(); // Reload to see cleared state
  };

  const handleLogStorageDebug = () => {
    storageDebug.logAll();
    storageDebug.checkTTL();
  };

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'monospace',
      backgroundColor: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: '8px',
      margin: '20px',
    }}
    >
      <h2>🗄️ Persistence Demo</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Storage Usage</h3>
        <p>Used: {(storageUsage.used / 1024).toFixed(2)}KB</p>
        <p>Total: {(storageUsage.total / 1024).toFixed(0)}KB</p>
        <div style={{
          width: '200px',
          height: '10px',
          backgroundColor: '#eee',
          borderRadius: '5px',
          overflow: 'hidden',
        }}
        >
          <div style={{
            width: `${(storageUsage.used / storageUsage.total) * 100}%`,
            height: '100%',
            backgroundColor: '#4CAF50',
          }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>User Data</h3>
        <p>Authenticated: {user.isAuthenticated ? '✅' : '❌'}</p>
        <p>Name: {user.user?.name || 'Not set'}</p>
        <p>Username: {user.user?.username || 'Not set'}</p>
        <button onClick={handleSetTestUser}>Set Test User</button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Weather Cache</h3>
        <p>Has Cache: {weatherCache.getCachedWeather() ? '✅' : '❌'}</p>
        <p>Valid: {weatherCache.isWeatherCacheValid() ? '✅' : '❌'}</p>
        {weatherCache.getCachedWeather() && (
          <p>Temperature: {weatherCache.getCachedWeather()?.temperature}°F</p>
        )}
        <button onClick={handleSetTestWeather}>Set Test Weather</button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Location Cache</h3>
        <p>Has Cache: {locationCache.getCachedIpLocation() ? '✅' : '❌'}</p>
        <p>Valid: {locationCache.isIpLocationCacheValid() ? '✅' : '❌'}</p>
        {locationCache.getCachedIpLocation() && (
          <p>City: {locationCache.getCachedIpLocation()?.city}</p>
        )}
        <button onClick={handleSetTestLocation}>Set Test Location</button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Preferences</h3>
        <p>Theme: {preferences.theme}</p>
        <p>Temperature Unit: {preferences.temperatureUnit}</p>
        <p>Compact Mode: {preferences.display.compactMode ? '✅' : '❌'}</p>
        <button onClick={handleSetTestPreferences}>Set Test Preferences</button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Storage Keys</h3>
        {Object.entries(STORAGE_CONFIG.keys).map(([name, key]) => (
          <p key={name}>
            {name}: <code>{key}</code> 
            {localStorage.getItem(key) ? ' ✅' : ' ❌'}
          </p>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={handleLogStorageDebug}>
          Debug Storage (Check Console)
        </button>
        <button 
          onClick={handleClearAllStorage}
          style={{ backgroundColor: '#ff4444', color: 'white' }}
        >
          Clear All Storage & Reload
        </button>
        <button onClick={() => window.location.reload()}>
          Reload Page (Test Persistence)
        </button>
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>💡 Tips:</p>
        <ul>
          <li>Set some test data, then reload the page to see persistence</li>
          <li>Check browser DevTools → Application → Local Storage</li>
          <li>Weather cache expires in 30 minutes</li>
          <li>Location cache expires in 24 hours</li>
        </ul>
      </div>
    </div>
  );
};