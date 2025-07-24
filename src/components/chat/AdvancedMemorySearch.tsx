import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import type { MarkedMemory, StoredConversation } from '../../services/MemoryService';
import './memory-modals.css';

interface SearchFilters {
  query: string;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  contentType: 'all' | 'memories' | 'conversations';
  sortBy: 'recent' | 'oldest' | 'relevance' | 'length';
  tags: string[];
}

interface AdvancedMemorySearchProps {
  memories: MarkedMemory[];
  conversations: StoredConversation[];
  onResultsChange: (results: {
    memories: MarkedMemory[];
    conversations: StoredConversation[];
  }) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const AdvancedMemorySearch = memo(function AdvancedMemorySearch({
  memories,
  conversations,
  onResultsChange,
  isExpanded,
  onToggleExpanded,
}: AdvancedMemorySearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    dateRange: 'all',
    contentType: 'all',
    sortBy: 'recent',
    tags: [],
  });

  // Extract available tags from memories
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    memories.forEach(memory => {
      if (memory.tag) {
        tagSet.add(memory.tag);
      }
      // Extract hashtags from content
      const hashtags = memory.content.match(/#\w+/g);
      if (hashtags) {
        hashtags.forEach(tag => tagSet.add(tag.slice(1))); // Remove #
      }
    });
    return Array.from(tagSet).sort();
  }, [memories]);

  // Filter and search logic
  const filteredResults = useMemo(() => {
    let filteredMemories = memories;
    let filteredConversations = conversations;

    // Text search
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase();
      
      filteredMemories = memories.filter(memory =>
        memory.content.toLowerCase().includes(query) ||
        memory.context.toLowerCase().includes(query) ||
        memory.tag?.toLowerCase().includes(query)
      );

      filteredConversations = conversations.filter(conv =>
        conv.firstMessage.toLowerCase().includes(query) ||
        conv.lastMessage.toLowerCase().includes(query) ||
        conv.messages.some(msg => msg.content.toLowerCase().includes(query))
      );
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = Date.now();
      let startTime = 0;
      
      switch (filters.dateRange) {
        case 'today':
          startTime = now - (24 * 60 * 60 * 1000);
          break;
        case 'week':
          startTime = now - (7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startTime = now - (30 * 24 * 60 * 60 * 1000);
          break;
        case 'custom':
          if (filters.customStartDate) {
            startTime = new Date(filters.customStartDate).getTime();
          }
          break;
      }

      let endTime = now;
      if (filters.dateRange === 'custom' && filters.customEndDate) {
        endTime = new Date(filters.customEndDate).getTime() + (24 * 60 * 60 * 1000);
      }

      filteredMemories = filteredMemories.filter(memory =>
        memory.timestamp >= startTime && memory.timestamp <= endTime
      );

      filteredConversations = filteredConversations.filter(conv =>
        conv.timestamp >= startTime && conv.timestamp <= endTime
      );
    }

    // Tag filter
    if (filters.tags.length > 0) {
      filteredMemories = filteredMemories.filter(memory => {
        if (memory.tag && filters.tags.includes(memory.tag)) return true;
        return filters.tags.some(tag => 
          memory.content.toLowerCase().includes(`#${tag.toLowerCase()}`)
        );
      });
    }

    // Content type filter
    if (filters.contentType === 'memories') {
      filteredConversations = [];
    } else if (filters.contentType === 'conversations') {
      filteredMemories = [];
    }

    // Sorting
    const sortFn = (a: any, b: any) => {
      switch (filters.sortBy) {
        case 'oldest':
          return a.timestamp - b.timestamp;
        case 'recent':
          return b.timestamp - a.timestamp;
        case 'length':
          const aLength = a.content?.length || a.messageCount || 0;
          const bLength = b.content?.length || b.messageCount || 0;
          return bLength - aLength;
        case 'relevance':
          // Simple relevance based on query matches
          if (!filters.query.trim()) return b.timestamp - a.timestamp;
          const query = filters.query.toLowerCase();
          const aMatches = (a.content || a.firstMessage || '').toLowerCase().split(query).length - 1;
          const bMatches = (b.content || b.firstMessage || '').toLowerCase().split(query).length - 1;
          return bMatches - aMatches;
        default:
          return b.timestamp - a.timestamp;
      }
    };

    filteredMemories.sort(sortFn);
    filteredConversations.sort(sortFn);

    return {
      memories: filteredMemories,
      conversations: filteredConversations,
    };
  }, [memories, conversations, filters]);

  // Update results when filters change
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Notify parent of results changes
  useEffect(() => {
    onResultsChange(filteredResults);
  }, [filteredResults, onResultsChange]);

  const handleTagToggle = useCallback((tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      query: '',
      dateRange: 'all',
      contentType: 'all',
      sortBy: 'recent',
      tags: [],
    });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return filters.query.trim() !== '' ||
           filters.dateRange !== 'all' ||
           filters.contentType !== 'all' ||
           filters.sortBy !== 'recent' ||
           filters.tags.length > 0;
  }, [filters]);

  return (
    <div className="advanced-memory-search">
      <div className="search-header">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Search memories and conversations..."
            value={filters.query}
            onChange={(e) => updateFilters({ query: e.target.value })}
            className="search-input"
          />
          <button
            className="advanced-toggle"
            onClick={onToggleExpanded}
            aria-label={isExpanded ? 'Hide advanced filters' : 'Show advanced filters'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? '🔼' : '🔽'}
          </button>
        </div>
        
        {hasActiveFilters && (
          <button className="clear-filters" onClick={clearFilters}>
            Clear Filters
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="advanced-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label>Date Range</label>
              <select 
                value={filters.dateRange}
                onChange={(e) => updateFilters({ dateRange: e.target.value as any })}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Content Type</label>
              <select 
                value={filters.contentType}
                onChange={(e) => updateFilters({ contentType: e.target.value as any })}
              >
                <option value="all">All Content</option>
                <option value="memories">Memories Only</option>
                <option value="conversations">Conversations Only</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Sort By</label>
              <select 
                value={filters.sortBy}
                onChange={(e) => updateFilters({ sortBy: e.target.value as any })}
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="relevance">Most Relevant</option>
                <option value="length">Longest Content</option>
              </select>
            </div>
          </div>

          {filters.dateRange === 'custom' && (
            <div className="custom-date-range">
              <div className="date-input-group">
                <label>From</label>
                <input
                  type="date"
                  value={filters.customStartDate || ''}
                  onChange={(e) => updateFilters({ customStartDate: e.target.value })}
                />
              </div>
              <div className="date-input-group">
                <label>To</label>
                <input
                  type="date"
                  value={filters.customEndDate || ''}
                  onChange={(e) => updateFilters({ customEndDate: e.target.value })}
                />
              </div>
            </div>
          )}

          {availableTags.length > 0 && (
            <div className="tag-filter">
              <label>Tags</label>
              <div className="tag-list">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    className={`tag-chip ${filters.tags.includes(tag) ? 'active' : ''}`}
                    onClick={() => handleTagToggle(tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="search-results-info">
        {filteredResults.memories.length + filteredResults.conversations.length} result(s) found
        {hasActiveFilters && ' with current filters'}
      </div>
    </div>
  );
});

export { AdvancedMemorySearch };
export default AdvancedMemorySearch;