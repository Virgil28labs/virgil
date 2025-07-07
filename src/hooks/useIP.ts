import { useState, useEffect } from 'react';
import { ipService } from '../lib/ipService';

interface UseIPReturn {
  ip: string | null;
  loading: boolean;
}

export function useIP(): UseIPReturn {
  const [ip, setIP] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchIP = async () => {
      try {
        const ipAddress = await ipService.getIP();
        setIP(ipAddress);
      } catch (error: any) {
        console.error('Failed to fetch IP:', error);
        setIP(null);
      } finally {
        setLoading(false);
      }
    };

    fetchIP();
  }, []);

  return { ip, loading };
}