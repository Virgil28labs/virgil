import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/StorageService';
import { appDataService } from '../services/AppDataService';

interface StorageItem {
  key: string;
  value: string;
  size: number;
  keySize: number;
  valueSize: number;
}

interface IndexedDBInfo {
  name: string;
  stores: {
    name: string;
    count: number;
  }[];
}

interface AppDataDetail {
  key: string;
  size: number;
  preview: string;
}

export const StorageAnalyzer: React.FC = () => {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [indexedDBs, setIndexedDBs] = useState<IndexedDBInfo[]>([]);
  const [showDetail, setShowDetail] = useState<'local' | 'indexed'>('local');
  const [appDataDetails, setAppDataDetails] = useState<AppDataDetail[]>([]);
  const [showAppDataDetails, setShowAppDataDetails] = useState(false);
  const [_storageQuota, setStorageQuota] = useState<{
    usage: number;
    quota: number;
  } | null>(null);

  const analyzeStorage = () => {
    const storageItems: StorageItem[] = [];
    let total = 0;

    // Get all localStorage keys
    const keys = StorageService.getKeys();
    
    keys.forEach(key => {
      try {
        const value = localStorage.getItem(key) || '';
        const keySize = new Blob([key]).size;
        const valueSize = new Blob([value]).size;
        const itemSize = keySize + valueSize;
        
        total += itemSize;
        storageItems.push({
          key,
          value,
          size: itemSize,
          keySize,
          valueSize,
        });
      } catch (error) {
        console.error(`Error reading key ${key}:`, error);
      }
    });

    // Sort by size descending
    storageItems.sort((a, b) => b.size - a.size);
    
    setItems(storageItems);
    setTotalSize(total);

    // Check browser storage quota
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        setStorageQuota({
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      });
    }
  };

  const analyzeIndexedDB = async () => {
    try {
      const dbInfos: IndexedDBInfo[] = [];
      
      // Use modern browser API to list all databases
      if ('databases' in indexedDB) {
        const databases = await (indexedDB as IDBFactory & { databases?: () => Promise<IDBDatabaseInfo[]> }).databases?.() || [];
        
        for (const dbInfo of databases) {
          try {
            const db = await new Promise<IDBDatabase>((resolve, reject) => {
              const request = indexedDB.open(dbInfo.name || 'unknown');
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });
            
            const storeNames = Array.from(db.objectStoreNames);
            const stores: { name: string; count: number }[] = [];
            
            if (storeNames.length > 0) {
              const tx = db.transaction(storeNames, 'readonly');
              
              for (const storeName of storeNames) {
                const countRequest = tx.objectStore(storeName).count();
                const count = await new Promise<number>((resolve) => {
                  countRequest.onsuccess = () => resolve(countRequest.result);
                });
                stores.push({ name: storeName, count });
              }
            }
            
            db.close();
            dbInfos.push({ name: dbInfo.name || 'unknown', stores });
          } catch (e) {
            console.error(`Error opening database ${dbInfo.name}:`, e);
          }
        }
      } else {
        // Fallback for browsers without databases() API
        // Browser does not support indexedDB.databases()
      }
      
      setIndexedDBs(dbInfos);
    } catch (error) {
      console.error('Error analyzing IndexedDB:', error);
      setIndexedDBs([]);
    }
  };

  useEffect(() => {
    analyzeStorage();
    analyzeIndexedDB();
  }, []);

  // Refresh IndexedDB analysis when switching tabs
  useEffect(() => {
    if (showDetail === 'indexed') {
      analyzeIndexedDB();
    }
  }, [showDetail]);

  const loadAppDataDetails = async () => {
    try {
      const keys = await appDataService.getAllKeys();
      const details: AppDataDetail[] = [];
      
      for (const key of keys) {
        const data = await appDataService.get(key);
        if (data) {
          const dataStr = JSON.stringify(data);
          const size = new Blob([dataStr]).size;
          let preview = '';
          
          // Generate preview based on key
          if (key === 'virgil_dog_favorites' || key === 'virgil_nasa_favorites') {
            const count = Array.isArray(data) ? data.length : 0;
            preview = `${count} favorites`;
          } else if (key === 'giphy-favorites') {
            const count = Array.isArray(data) ? data.length : 0;
            preview = `${count} GIFs`;
          } else if (key === 'virgil_habits') {
            const habits = (data as { habits?: unknown[] }).habits?.length || 0;
            preview = `${habits} habits`;
          } else if (key === 'rhythmMachineSaveSlots') {
            const patterns = Array.isArray(data) ? data.filter(Boolean).length : 0;
            preview = `${patterns} patterns`;
          } else if (key === 'virgil_selected_timezones') {
            const count = Array.isArray(data) ? data.length : 0;
            preview = `${count} timezones`;
          } else if (key === 'perfectCircleBestScore') {
            preview = `Best: ${data}%`;
          } else if (key === 'perfectCircleAttempts') {
            preview = `${data} attempts`;
          } else {
            preview = dataStr.substring(0, 50) + (dataStr.length > 50 ? '...' : '');
          }
          
          details.push({ key, size, preview });
        }
      }
      
      setAppDataDetails(details.sort((a, b) => b.size - a.size));
    } catch (error) {
      console.error('Failed to load app data details:', error);
    }
  };


  const getStoragePercentage = (): number => {
    // localStorage typically has a 5-10MB limit
    const assumedLimit = 5 * 1024 * 1024; // 5MB
    return (totalSize / assumedLimit) * 100;
  };

  const formatCompactBytes = (bytes: number): string => {
    if (bytes < 1024) return bytes + 'B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + 'KB';
    const mb = kb / 1024;
    return mb.toFixed(1) + 'MB';
  };

  const getTotalIndexedDBRecords = () => {
    return indexedDBs.reduce((total, db) => 
      total + db.stores.reduce((sum, store) => sum + store.count, 0), 0,
    );
  };

  const estimateIndexedDBSize = () => {
    // Rough estimate based on data type
    let estimate = 0;
    indexedDBs.forEach(db => {
      db.stores.forEach(store => {
        if (db.name === 'VirgilContextDB') {
          estimate += store.count * 1024; // 1KB per snapshot
        } else if (db.name === 'VirgilCameraDB') {
          estimate += store.count * 100 * 1024; // 100KB per photo
        } else if (db.name === 'VirgilAppDataDB') {
          // Estimate based on typical app data sizes
          estimate += store.count * 5 * 1024; // ~5KB average per item
        } else {
          estimate += store.count * 512; // 512B per memory
        }
      });
    });
    return estimate;
  };

  return (
    <div style={{ padding: '8px', fontSize: '12px', color: '#e0e0e0' }}>
      <div style={{ 
        marginBottom: '8px', 
        paddingBottom: '8px', 
        borderBottom: '1px solid #444',
      }}
      >
        <div style={{ color: '#4CAF50', marginBottom: '4px' }}>
          localStorage: {items.length} items • {formatCompactBytes(totalSize)}
        </div>
        <div style={{ color: '#4CAF50' }}>
          IndexedDB: {indexedDBs.length} DBs • ~{formatCompactBytes(estimateIndexedDBSize())}
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '8px',
      }}
      >
        <button
          onClick={() => setShowDetail('local')}
          style={{
            padding: '4px 8px',
            background: showDetail === 'local' ? '#444' : 'transparent',
            border: '1px solid #444',
            color: showDetail === 'local' ? '#4CAF50' : '#888',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          📦 localStorage
        </button>
        <button
          onClick={() => setShowDetail('indexed')}
          style={{
            padding: '4px 8px',
            background: showDetail === 'indexed' ? '#444' : 'transparent',
            border: '1px solid #444',
            color: showDetail === 'indexed' ? '#4CAF50' : '#888',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          🗄️ IndexedDB
        </button>
      </div>

      <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
        {showDetail === 'local' ? (
          <>
            <div style={{ color: '#888', marginBottom: '4px', fontSize: '11px' }}>
              localStorage ({formatCompactBytes(totalSize)} - {getStoragePercentage().toFixed(1)}% of 5MB)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {items.slice(0, 12).map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ 
                      padding: '4px 8px', 
                      color: '#42A5F5',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    >
                      {item.key.length > 30 ? item.key.substring(0, 30) + '...' : item.key}
                    </td>
                    <td style={{ 
                      padding: '4px 8px', 
                      color: '#FFA726',
                      textAlign: 'right',
                      minWidth: '60px',
                    }}
                    >
                      {formatCompactBytes(item.size)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length > 12 && (
              <div style={{ padding: '4px', textAlign: 'center', color: '#666', fontSize: '10px' }}>
                ... and {items.length - 12} more items
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ color: '#888', marginBottom: '4px', fontSize: '11px' }}>
              IndexedDB (~{formatCompactBytes(estimateIndexedDBSize())} - {getTotalIndexedDBRecords()} records)
            </div>
            {indexedDBs.map((db, dbIndex) => (
              <div key={dbIndex} style={{ marginBottom: '8px' }}>
                <div style={{ color: '#42A5F5', fontWeight: 'bold', marginBottom: '2px' }}>
                  {db.name}
                </div>
                {db.stores.map((store, storeIndex) => (
                  <div
                    key={storeIndex}
                    style={{ 
                      paddingLeft: '16px', 
                      color: '#888',
                      fontSize: '11px',
                    }}
                  >
                    └─ {store.name}: {store.count} {db.name === 'VirgilAppDataDB' ? 'items' : 'records'}
                    {db.name === 'VirgilAppDataDB' && store.count > 0 && (
                      <>
                        <button
                          onClick={() => {
                            setShowAppDataDetails(!showAppDataDetails);
                            if (!showAppDataDetails && appDataDetails.length === 0) {
                              loadAppDataDetails();
                            }
                          }}
                          style={{
                            marginLeft: '8px',
                            padding: '1px 4px',
                            fontSize: '10px',
                            background: 'transparent',
                            border: '1px solid #666',
                            color: '#888',
                            borderRadius: '3px',
                            cursor: 'pointer',
                          }}
                        >
                          {showAppDataDetails ? '▼' : '▶'} details
                        </button>
                      </>
                    )}
                  </div>
                ))}
                {showAppDataDetails && db.name === 'VirgilAppDataDB' && (
                  <div style={{ 
                    marginTop: '8px', 
                    paddingLeft: '32px',
                    fontSize: '10px',
                    color: '#666',
                  }}
                  >
                    {appDataDetails.map((detail, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '2px 0',
                          borderBottom: '1px solid #333',
                        }}
                      >
                        <span style={{ color: '#9C27B0' }}>{detail.key}</span>
                        <span style={{ color: '#888' }}>{detail.preview}</span>
                        <span style={{ color: '#FFA726' }}>{formatCompactBytes(detail.size)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {indexedDBs.length === 0 && (
              <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                No IndexedDB databases found
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};