import { memo } from 'react';
import { DashboardContext } from '../../services/DashboardContextService';
import './StatusPills.css';

interface StatusPillsProps {
  showMemoryIndicator: boolean;
  onMemoryClick: () => void;
  dashboardContext: DashboardContext | null;
  markedMemoriesCount: number;
  recentConversationsCount: number; // Keep for future use
}

const StatusPills = memo(function StatusPills({
  showMemoryIndicator,
  onMemoryClick,
  dashboardContext,
  markedMemoriesCount,
  recentConversationsCount: _recentConversationsCount, // Not used in continuous conversation model
}: StatusPillsProps) {
  // Always show the status pills area if memory or context is available
  if (!showMemoryIndicator && !dashboardContext) {
    return null;
  }

  const contextTitle = dashboardContext 
    ? `Context Aware: ${dashboardContext.timeOfDay}${dashboardContext.weather.hasData ? ', weather' : ''}${dashboardContext.location.hasGPS ? ', location' : ''}`
    : '';

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
      {dashboardContext && (
        <div 
          className="status-pill context-pill"
          title={contextTitle}
        >
          🎯 CTX
        </div>
      )}
    </div>
  );
});

export { StatusPills };
export default StatusPills;