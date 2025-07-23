import { memo } from 'react';
import { DashboardContext } from '../../services/DashboardContextService';
import './StatusPills.css';

interface StatusPillsProps {
  showMemoryIndicator: boolean;
  onMemoryClick: () => void;
  dashboardContext: DashboardContext | null;
  markedMemoriesCount: number;
  recentConversationsCount: number;
}

const StatusPills = memo(function StatusPills({
  showMemoryIndicator,
  onMemoryClick,
  dashboardContext,
  markedMemoriesCount,
  recentConversationsCount,
}: StatusPillsProps) {
  if (!showMemoryIndicator && !dashboardContext) {
    return null;
  }

  const contextTitle = dashboardContext 
    ? `Context Aware: ${dashboardContext.timeOfDay}${dashboardContext.weather.hasData ? ', weather' : ''}${dashboardContext.location.hasGPS ? ', location' : ''}`
    : '';

  const memoryTitle = `Memory Active - View conversations (${markedMemoriesCount} memories, ${recentConversationsCount} conversations)`;

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