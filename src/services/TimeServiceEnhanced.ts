/**
 * TimeServiceEnhanced - Cross-Tab Synchronized Time Service
 * 
 * Extends TimeService with:
 * - BroadcastChannel for cross-tab synchronization
 * - Drift detection and correction
 * - Leader election for single timer across tabs
 * 
 * @see src/services/TimeService.md for developer guide
 */

import { TimeService, TimeUpdate } from './TimeService';

interface SyncMessage {
  type: 'HEARTBEAT' | 'LEADER_ELECTION' | 'TIME_SYNC' | 'DRIFT_DETECTED';
  tabId: string;
  timestamp: number;
  data?: any;
}

interface TabInfo {
  id: string;
  lastSeen: number;
  isLeader: boolean;
}

export class TimeServiceEnhanced extends TimeService {
  private broadcastChannel?: BroadcastChannel;
  private tabId: string;
  private tabs: Map<string, TabInfo> = new Map();
  private isLeader = false;
  private heartbeatInterval?: NodeJS.Timeout;
  private driftCheckInterval?: NodeJS.Timeout;
  private lastSystemTime = Date.now();
  private lastMonotonicTime = performance.now();
  private driftThreshold = 100; // 100ms drift threshold
  private syncEnabled = true;
  
  constructor() {
    super();
    
    // Generate unique tab ID
    this.tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize cross-tab synchronization if supported
    if (typeof BroadcastChannel !== 'undefined') {
      this.initializeBroadcastChannel();
    } else {
      // If no broadcast channel, we're the only tab and should be leader
      this.isLeader = true;
    }
  }
  
  /**
   * Initialize BroadcastChannel for cross-tab communication
   */
  private initializeBroadcastChannel(): void {
    try {
      this.broadcastChannel = new BroadcastChannel('time-service-sync');
      
      // Listen for messages from other tabs
      this.broadcastChannel.addEventListener('message', (event: MessageEvent<SyncMessage>) => {
        this.handleSyncMessage(event.data);
      });
      
      // Start heartbeat and leader election
      this.startHeartbeat();
      this.performLeaderElection();
      
      // Start drift detection
      this.startDriftDetection();
      
      // Notify other tabs of our presence
      this.broadcast({
        type: 'LEADER_ELECTION',
        tabId: this.tabId,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn('BroadcastChannel not available, falling back to single-tab mode:', error);
      this.syncEnabled = false;
      this.isLeader = true; // If no broadcast, we're the only tab
    }
  }
  
  /**
   * Handle incoming sync messages from other tabs
   */
  private handleSyncMessage(message: SyncMessage): void {
    // Update tab registry
    if (message.tabId !== this.tabId) {
      this.tabs.set(message.tabId, {
        id: message.tabId,
        lastSeen: Date.now(),
        isLeader: false,
      });
    }
    
    switch (message.type) {
      case 'HEARTBEAT':
        // Track active tabs
        break;
        
      case 'LEADER_ELECTION':
        // Participate in leader election
        this.performLeaderElection();
        break;
        
      case 'TIME_SYNC':
        // Sync time if we're not the leader
        if (!this.isLeader && message.data) {
          this.syncTime(message.data);
        }
        break;
        
      case 'DRIFT_DETECTED':
        // Handle drift notification
        if (!this.isLeader) {
          this.correctDrift();
        }
        break;
    }
  }
  
  /**
   * Broadcast a message to all tabs
   */
  private broadcast(message: SyncMessage): void {
    if (this.broadcastChannel && this.syncEnabled) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (error) {
        console.error('Failed to broadcast message:', error);
      }
    }
  }
  
  /**
   * Start heartbeat to detect active tabs
   */
  private startHeartbeat(): void {
    // Send heartbeat every 2 seconds
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        type: 'HEARTBEAT',
        tabId: this.tabId,
        timestamp: Date.now(),
      });
      
      // Clean up stale tabs (not seen in 10 seconds)
      const now = Date.now();
      const staleThreshold = 10000;
      
      for (const [tabId, info] of this.tabs.entries()) {
        if (now - info.lastSeen > staleThreshold) {
          this.tabs.delete(tabId);
          
          // Re-elect leader if a stale tab was the leader
          if (info.isLeader) {
            this.performLeaderElection();
          }
        }
      }
    }, 2000);
  }
  
  /**
   * Perform leader election among active tabs
   */
  private performLeaderElection(): void {
    // Simple leader election: lowest tab ID wins
    const activeTabs = [this.tabId, ...Array.from(this.tabs.keys())];
    const sortedTabs = activeTabs.sort();
    const newLeader = sortedTabs[0];
    
    const wasLeader = this.isLeader;
    this.isLeader = newLeader === this.tabId;
    
    // Update leader status for other tabs
    this.tabs.forEach((info, tabId) => {
      info.isLeader = tabId === newLeader;
    });
    
    // Handle leadership change
    if (this.isLeader && !wasLeader) {
      this.onBecomeLeader();
    } else if (!this.isLeader && wasLeader) {
      this.onLoseLeadership();
    }
  }
  
  /**
   * Called when this tab becomes the leader
   */
  private onBecomeLeader(): void {
    // Start the main timer by calling parent method
    this.startTimer();
    
    // Start broadcasting time updates
    this.startTimeBroadcast();
  }
  
  /**
   * Called when this tab loses leadership
   */
  private onLoseLeadership(): void {
    // Stop the main timer to save resources
    if (this.mainTimer) {
      clearInterval(this.mainTimer);
      this.mainTimer = undefined;
    }
  }
  
  /**
   * Start broadcasting time updates to other tabs
   */
  private startTimeBroadcast(): void {
    // Broadcast time sync every second when we're the leader
    if (this.isLeader) {
      const broadcastTime = () => {
        if (this.isLeader) {
          this.broadcast({
            type: 'TIME_SYNC',
            tabId: this.tabId,
            timestamp: Date.now(),
            data: {
              currentTime: this.getCurrentTime(),
              currentDate: this.getCurrentDate(),
              timestamp: Date.now(),
            },
          });
        }
      };
      
      // Include in the main timer loop
      this.timeListeners.push(() => broadcastTime());
    }
  }
  
  /**
   * Sync time from leader tab
   */
  private syncTime(data: any): void {
    // Update cached values from leader
    if (data.timestamp) {
      // Calculate latency and adjust
      const latency = (Date.now() - data.timestamp) / 2;
      
      // Only sync if the latency is reasonable
      if (latency < 50) {
        // Clear cache to force refresh
        this.localDateCache = null;
        
        // Notify listeners with synced time
        if (this.timeListeners.length > 0) {
          const timeUpdate: TimeUpdate = {
            currentTime: data.currentTime,
            currentDate: data.currentDate,
            dateObject: new Date(data.timestamp + latency),
          };
          
          this.timeListeners.forEach(callback => {
            try {
              callback(timeUpdate);
            } catch (error) {
              console.error('Error in time update callback:', error);
            }
          });
        }
      }
    }
  }
  
  /**
   * Start drift detection using monotonic clock
   */
  private startDriftDetection(): void {
    this.driftCheckInterval = setInterval(() => {
      const currentSystemTime = Date.now();
      const currentMonotonicTime = performance.now();
      
      // Calculate expected system time based on monotonic clock
      const monotonicDelta = currentMonotonicTime - this.lastMonotonicTime;
      const expectedSystemTime = this.lastSystemTime + monotonicDelta;
      
      // Check for drift
      const drift = Math.abs(currentSystemTime - expectedSystemTime);
      
      if (drift > this.driftThreshold) {
        console.warn(`Time drift detected: ${drift}ms`);
        
        // Notify other tabs if we're the leader
        if (this.isLeader) {
          this.broadcast({
            type: 'DRIFT_DETECTED',
            tabId: this.tabId,
            timestamp: currentSystemTime,
            data: { drift },
          });
        }
        
        // Correct the drift
        this.correctDrift();
      }
      
      // Update reference points
      this.lastSystemTime = currentSystemTime;
      this.lastMonotonicTime = currentMonotonicTime;
    }, 5000); // Check every 5 seconds
  }
  
  /**
   * Correct detected time drift
   */
  private correctDrift(): void {
    // Clear all caches
    this.localDateCache = null;
    
    // Force update all listeners
    if (this.timeListeners.length > 0) {
      const timeUpdate: TimeUpdate = {
        currentTime: this.getCurrentTime(),
        currentDate: this.getCurrentDate(),
        dateObject: new Date(),
      };
      
      this.timeListeners.forEach(callback => {
        try {
          callback(timeUpdate);
        } catch (error) {
          console.error('Error in time update callback:', error);
        }
      });
    }
  }
  
  /**
   * Get monotonic timestamp (unaffected by system time changes)
   * @returns Monotonic timestamp in milliseconds
   */
  getMonotonicTimestamp(): number {
    return performance.now();
  }
  
  /**
   * Enable or disable cross-tab synchronization
   * @param enabled Whether to enable synchronization
   */
  setSyncEnabled(enabled: boolean): void {
    this.syncEnabled = enabled;
    
    if (!enabled && !this.isLeader) {
      // If disabling sync and we're not leader, become leader for this tab
      this.isLeader = true;
      this.onBecomeLeader();
    }
  }
  
  /**
   * Get information about active tabs
   * @returns Array of tab information
   */
  getActiveTabs(): TabInfo[] {
    const tabs = Array.from(this.tabs.values());
    tabs.push({
      id: this.tabId,
      lastSeen: Date.now(),
      isLeader: this.isLeader,
    });
    return tabs;
  }
  
  /**
   * Override destroy to clean up broadcast channel
   */
  override destroy(): void {
    // Clean up broadcast channel
    if (this.broadcastChannel) {
      this.broadcast({
        type: 'HEARTBEAT',
        tabId: this.tabId,
        timestamp: Date.now(),
        data: { closing: true },
      });
      this.broadcastChannel.close();
    }
    
    // Clean up intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.driftCheckInterval) {
      clearInterval(this.driftCheckInterval);
    }
    
    // Call parent destroy
    super.destroy();
  }
}

// Export enhanced singleton instance
export const timeServiceEnhanced = new TimeServiceEnhanced();