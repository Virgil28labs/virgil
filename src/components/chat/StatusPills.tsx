import { memo, useMemo } from 'react';
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

  const contextTitle = useMemo(() => {
    if (!dashboardContext) return '';
    const parts: string[] = [dashboardContext.timeOfDay];
    if (dashboardContext.weather.hasData) parts.push('weather');
    if (dashboardContext.location.hasGPS) parts.push('location');
    return `Context Aware: ${parts.join(', ')}`;
  }, [dashboardContext]);

  const memoryTitle = useMemo(() => 
    `Memory Active - View conversations (${markedMemoriesCount} memories, ${recentConversationsCount} conversations)`
  , [markedMemoriesCount, recentConversationsCount]);

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