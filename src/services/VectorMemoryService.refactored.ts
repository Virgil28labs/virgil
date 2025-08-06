// Re-export the refactored service as VectorMemoryService for backward compatibility
export { VectorMemoryServiceRefactored as VectorMemoryService } from './VectorMemoryServiceRefactored';
export type { VectorMemory } from './VectorMemoryServiceRefactored';

// Create singleton instance
import { VectorMemoryServiceRefactored } from './VectorMemoryServiceRefactored';
export const vectorMemoryService = VectorMemoryServiceRefactored.getInstance();