interface IPResponse {
  ip: string;
}

export const ipService = {
  async getIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      if (!response.ok) {
        throw new Error('Failed to fetch IP address');
      }
      const data: IPResponse = await response.json();
      return data.ip;
    } catch (error: any) {
      console.error('Failed to get IP address:', error);
      throw error;
    }
  }
};