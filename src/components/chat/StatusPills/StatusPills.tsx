import { memo } from 'react';
import type { DashboardContext } from '../../../services/DashboardContextService';
import styles from './StatusPills.module.css';

interface StatusPillsProps {
  showMemoryIndicator: boolean;
  onMemoryClick: () => void;
  dashboardContext: DashboardContext | null;
  markedMemoriesCount: number;
  recentConversationsCount: number; // Keep for future use
  isRealtimeConnected?: boolean; // Keep for future use
}

const StatusPills = memo(function StatusPills({
  showMemoryIndicator,
  onMemoryClick,
  dashboardContext: _dashboardContext,
  markedMemoriesCount,
  recentConversationsCount: _recentConversationsCount, // Not used in continuous conversation model
  isRealtimeConnected,
}: StatusPillsProps) {
  // Only show the status pills area if memory is available
  if (!showMemoryIndicator) {
    return null;
  }


  const memoryTitle = `Memory & Conversations (${markedMemoriesCount} marked memories)`;

  return (
    <div className={styles.cluster}>
      {showMemoryIndicator && (
        <button
          className={styles.memoryPill}
          onClick={onMemoryClick}
          title={memoryTitle}
        >
          🧠 MEM
        </button>
      )}
      {isRealtimeConnected !== undefined && (
        <div 
          className={isRealtimeConnected ? styles.syncConnected : styles.syncDisconnected}
          title={isRealtimeConnected ? 'Sync connected' : 'Sync disconnected'}
        >
          {isRealtimeConnected ? '🔄' : '⚠️'}
        </div>
      )}
    </div>
  );
});

export { StatusPills };
export default StatusPills;