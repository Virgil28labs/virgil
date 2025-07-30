import { memo } from 'react';
import type { DashboardContext } from '../../services/DashboardContextService';
import './ui-controls.css';

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
  isRealtimeConnected: _isRealtimeConnected,
}: StatusPillsProps) {
  // Only show the status pills area if memory is available
  if (!showMemoryIndicator) {
    return null;
  }


  const memoryTitle = `Memory & Conversations (${markedMemoriesCount} marked memories)`;

  return (
    <div className="status-cluster">
      {showMemoryIndicator && (
        <button
          className="status-pill memory-pill"
          onClick={onMemoryClick}
          title={memoryTitle}
        >
          🧠 MEM
        </button>
      )}
    </div>
  );
});

export { StatusPills };
export default StatusPills;
