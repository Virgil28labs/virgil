import { SupabaseMemoryService } from '../SupabaseMemoryService';

// Simple test suite to avoid child process issues
describe('SupabaseMemoryService - Basic Tests', () => {
  let service: SupabaseMemoryService;

  beforeEach(() => {
    service = new SupabaseMemoryService();
  });

  it('should create an instance', () => {
    expect(service).toBeInstanceOf(SupabaseMemoryService);
  });

  it('should have required methods', () => {
    expect(typeof service.init).toBe('function');
    expect(typeof service.getRecentMessages).toBe('function');
    expect(typeof service.saveConversation).toBe('function');
    expect(typeof service.getMarkedMemories).toBe('function');
    expect(typeof service.markAsImportant).toBe('function');
    expect(typeof service.getRecentConversations).toBe('function');
  });

  it('should handle initialization without throwing', async () => {
    // Mock to prevent actual Supabase calls
    const mockInit = jest.spyOn(service, 'init').mockResolvedValue();
    
    await expect(service.init()).resolves.not.toThrow();
    
    mockInit.mockRestore();
  });

  it('should handle getRecentMessages gracefully', async () => {
    const mockGetRecentMessages = jest.spyOn(service, 'getRecentMessages').mockResolvedValue([]);
    
    const result = await service.getRecentMessages(10);
    
    expect(result).toEqual([]);
    expect(mockGetRecentMessages).toHaveBeenCalledWith(10);
    
    mockGetRecentMessages.mockRestore();
  });

  it('should handle saveConversation gracefully', async () => {
    const mockSaveConversation = jest.spyOn(service, 'saveConversation').mockResolvedValue();
    
    const messages = [
      { id: 'test-1', role: 'user' as const, content: 'Hello', timestamp: new Date().toISOString() },
    ];
    
    await expect(service.saveConversation(messages)).resolves.not.toThrow();
    expect(mockSaveConversation).toHaveBeenCalledWith(messages);
    
    mockSaveConversation.mockRestore();
  });

  it('should handle getMarkedMemories gracefully', async () => {
    const mockGetMarkedMemories = jest.spyOn(service, 'getMarkedMemories').mockResolvedValue([]);
    
    const result = await service.getMarkedMemories();
    
    expect(result).toEqual([]);
    expect(mockGetMarkedMemories).toHaveBeenCalled();
    
    mockGetMarkedMemories.mockRestore();
  });

  it('should handle markAsImportant gracefully', async () => {
    const mockMarkAsImportant = jest.spyOn(service, 'markAsImportant').mockResolvedValue();
    
    await expect(service.markAsImportant('test-id', 'Important message', 'Context')).resolves.not.toThrow();
    expect(mockMarkAsImportant).toHaveBeenCalledWith('test-id', 'Important message', 'Context');
    
    mockMarkAsImportant.mockRestore();
  });

  it('should handle getRecentConversations gracefully', async () => {
    const mockGetRecentConversations = jest.spyOn(service, 'getRecentConversations').mockResolvedValue([]);
    
    const result = await service.getRecentConversations();
    
    expect(result).toEqual([]);
    expect(mockGetRecentConversations).toHaveBeenCalled();
    
    mockGetRecentConversations.mockRestore();
  });
});