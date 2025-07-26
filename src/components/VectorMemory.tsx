import React, { useState } from 'react';
import { vectorService } from '../services/vectorService';
import type { VectorSearchResult } from '../services/vectorService';

export const VectorMemory = () => {
  const [text, setText] = useState('');
  const [results, setResults] = useState<VectorSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [memoryCount, setMemoryCount] = useState<number | null>(null);
  
  // Load memory count on component mount
  React.useEffect(() => {
    loadMemoryCount();
  }, []);
  
  const loadMemoryCount = async () => {
    const count = await vectorService.getCount();
    setMemoryCount(count);
  };
  
  const handleStore = async () => {
    if (!text.trim()) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      const id = await vectorService.store(text);
      setText('');
      setMessage(`✅ Stored successfully with ID: ${id}`);
      await loadMemoryCount(); // Refresh count
    } catch (error) {
      console.error('Store failed:', error);
      setMessage('❌ Store failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = async () => {
    if (!text.trim()) return;
    
    setLoading(true);
    setMessage('');
    setResults([]);
    
    try {
      const searchResults = await vectorService.search(text, 10);
      setResults(searchResults);
      setMessage(`Found ${searchResults.length} similar memories`);
    } catch (error) {
      console.error('Search failed:', error);
      setMessage('❌ Search failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleHealthCheck = async () => {
    setLoading(true);
    try {
      const isHealthy = await vectorService.isHealthy();
      setMessage(isHealthy ? '✅ Vector service is healthy!' : '❌ Vector service is not healthy');
    } catch (error) {
      setMessage('❌ Health check failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Semantic Memory</h2>
        
        {memoryCount !== null && (
          <div className="mb-4 text-sm text-gray-600">
            Total stored memories: {memoryCount}
          </div>
        )}
        
        <div className="mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to store or search..."
            className="w-full h-24 p-3 border border-gray-300 rounded-md resize-none text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>
        
        <div className="flex gap-2 mb-4">
          <button 
            onClick={handleStore} 
            disabled={loading || !text.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Store Text'}
          </button>
          
          <button 
            onClick={handleSearch} 
            disabled={loading || !text.trim()}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'Search Similar'}
          </button>
          
          <button 
            onClick={handleHealthCheck} 
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Health Check
          </button>
        </div>
        
        {message && (
          <div className={`mb-4 p-3 rounded-md ${
            message.startsWith('✅') ? 'bg-green-100 text-green-700' : 
              message.startsWith('❌') ? 'bg-red-100 text-red-700' : 
                'bg-blue-100 text-blue-700'
          }`}
          >
            {message}
          </div>
        )}
        
        {results.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Search Results:</h3>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div 
                  key={result.id} 
                  className="border border-gray-200 rounded-md p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-semibold text-blue-600">
                      Similarity: {(result.similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-gray-800">{result.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            This component tests the Supabase vector memory integration. 
            Store some text samples and then search for similar content using semantic similarity.
          </p>
        </div>
      </div>
    </div>
  );
};