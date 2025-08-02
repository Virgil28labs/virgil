import { useState, useEffect } from 'react';
import { SimpleContextSnapshotService } from '../services/SimpleContextSnapshotService';
import { StorageAnalyzer } from './StorageAnalyzer';
import type { Context } from '../types/context.types';
import styles from './ContextDebugger.module.css';
import { timeService } from '../services/TimeService';

interface SnapshotWithTimestamp extends Context {
  timestamp?: number;
}

export function ContextDebugger() {
  const [snapshots, setSnapshots] = useState<SnapshotWithTimestamp[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [showStorage, setShowStorage] = useState(false);

  useEffect(() => {
    const loadSnapshots = async () => {
      const service = SimpleContextSnapshotService.getInstance();
      
      // Initialize service if needed
      if (!service.isInitialized()) {
        await service.init();
      }
      
      // Try to get from memory first (most recent), then merge with DB
      const memorySnapshots = service.getRecentSnapshots(28);
      const dbSnapshots = await service.loadSnapshotsFromDB(28);
      
      // Merge and deduplicate by timestamp
      const allSnapshots = [...memorySnapshots, ...dbSnapshots];
      const uniqueSnapshots = Array.from(
        new Map(allSnapshots.map(snap => [snap.timestamp, snap])).values(),
      );
      
      // Sort by timestamp and take most recent 28
      const sortedSnapshots = uniqueSnapshots
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-28);
      
      setSnapshots(sortedSnapshots);
      
    };
    
    // Load immediately
    loadSnapshots();
    
    // Then update every 5 seconds
    const interval = setInterval(loadSnapshots, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const getRelativeTime = (timestamp?: number): string => {
    if (!timestamp) return 'Just now';
    
    const now = timeService.getTimestamp();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes === 0) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  };

  if (!isVisible) {
    return (
      <div className={styles.buttonGroup}>
        <button 
          onClick={() => setIsVisible(true)}
          className={styles.toggleButton}
          aria-label="Show context debugger"
        >
          🔍 Context
        </button>
        <button 
          onClick={() => {
            setShowStorage(true);
            setIsVisible(true);
          }}
          className={styles.toggleButton}
          aria-label="Show storage analyzer"
        >
          🗄️ Storage
        </button>
      </div>
    );
  }

  if (showStorage) {
    return (
      <div className={styles.debugger}>
        <div className={styles.header}>
          <h3>Storage Analysis</h3>
          <div className={styles.headerButtons}>
            <button 
              onClick={() => setShowStorage(false)}
              className={styles.switchButton}
              aria-label="Show context history"
            >
              🔍 Context
            </button>
            <button 
              onClick={() => {
                setIsVisible(false);
                setShowStorage(false);
              }}
              className={styles.closeButton}
              aria-label="Hide debugger"
            >
              ✕
            </button>
          </div>
        </div>
        <StorageAnalyzer />
      </div>
    );
  }

  return (
    <div className={styles.debugger}>
      <div className={styles.header}>
        <h3>Context History (28 min)</h3>
        <div className={styles.headerButtons}>
          <button 
            onClick={() => setShowStorage(true)}
            className={styles.switchButton}
            aria-label="Show storage analysis"
          >
            🗄️ Storage
          </button>
          <button 
            onClick={() => setIsVisible(false)}
            className={styles.closeButton}
            aria-label="Hide debugger"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className={styles.snapshots}>
        {snapshots.length === 0 ? (
          <p className={styles.empty}>No snapshots yet. They capture every minute.</p>
        ) : (
          snapshots.slice().reverse().map((snap, i) => (
            <div key={i} className={styles.snapshot}>
              <div className={styles.snapshotHeader}>
                <span className={styles.relativeTime}>
                  {i === 0 ? 'Just now' : getRelativeTime(snap.timestamp)}
                </span>
                <span className={styles.absoluteTime}>{snap.time.local}</span>
              </div>
              
              <div className={styles.snapshotBody}>
                <div className={styles.contextRow}>
                  <span className={styles.username}>👤 {snap.user?.username || snap.user?.name || 'user'}</span>
                  <span className={styles.location}>📍 {snap.env.city || 'Unknown location'}</span>
                  {snap.locationContext && (
                    <span className={styles.locationContext}>
                      {snap.locationContext.probablePlace === 'Home' && '🏠 Home'}
                      {snap.locationContext.probablePlace === 'Work' && '💼 Work'}
                      {snap.locationContext.probablePlace === 'Travel' && '🚗 Travel'}
                      {snap.locationContext.probablePlace === 'Unknown' && '📍 Unknown'}
                    </span>
                  )}
                  {snap.env.weather && <span className={styles.weather}>{snap.env.weather}</span>}
                </div>
                
                <div className={styles.stateRow}>
                  <span className={styles.partOfDay}>{snap.time.partOfDay}</span>
                  <span className={styles.separator}>•</span>
                  <span className={styles.device}>{snap.env.deviceType}</span>
                  <span className={styles.separator}>•</span>
                  <span className={styles.platform}>{snap.env.browser} on {snap.env.os}</span>
                </div>
                
                <div className={styles.activityRow}>
                  <span className={styles.activityLevel}>
                    {snap.sensors?.motion === 'moving' ? '🟢 Moving' : 
                      snap.sensors?.motion === 'still' ? '🟡 Still' : 
                        '🔴 Unknown'}
                  </span>
                  <span className={styles.visibilityState}>
                    {snap.sensors?.visibility === 'visible' ? '👁️ Tab visible' : '🙈 Tab hidden'}
                  </span>
                  {snap.sensors?.inputActivity && (
                    <span className={styles.inputIndicators}>
                      {snap.sensors.inputActivity.mouse && '🖱️'}
                      {snap.sensors.inputActivity.keyboard && '⌨️'}
                    </span>
                  )}
                  {snap.sensors?.battery && (
                    <span className={styles.battery}>
                      🔋 {Math.round(snap.sensors.battery.level * 100)}%
                      {snap.sensors.battery.charging && ' ⚡'}
                    </span>
                  )}
                </div>
                
                {(snap.network?.online !== undefined || snap.env.ip) && (
                  <div className={styles.networkRow}>
                    {snap.network?.online === false && <span className={styles.offline}>📵 Offline</span>}
                    {snap.network?.connectionType && <span className={styles.connection}>📶 {snap.network.connectionType}</span>}
                    {snap.env.ip && <span className={styles.ip}>🌐 {snap.env.ip}</span>}
                  </div>
                )}
                
                {snap.sensors?.systemIdleTime !== undefined && (
                  <div className={styles.idleRow}>
                    <span className={styles.idleTime}>
                      ⏱️ Idle: {snap.sensors.systemIdleTime}s
                    </span>
                    {snap.system?.pageTitle && (
                      <span className={styles.pageTitle} title={snap.system.pageTitle}>
                        📄 {snap.system.pageTitle.substring(0, 30)}{snap.system.pageTitle.length > 30 ? '...' : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className={styles.footer}>
        <small>Updates every minute • Showing last 28 minutes</small>
      </div>
    </div>
  );
}