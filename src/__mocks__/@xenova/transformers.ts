export const pipeline = jest.fn().mockImplementation(() => {
  return jest.fn().mockImplementation((text: string) => {
    // Return a mock 384-dimensional embedding
    const mockEmbedding = new Float32Array(384);
    for (let i = 0; i < 384; i++) {
      // Generate deterministic values based on text for testing
      const seed = text.charCodeAt(i % text.length) || 1;
      mockEmbedding[i] = Math.sin(seed * (i + 1)) * 0.5;
    }
    
    return Promise.resolve({
      data: mockEmbedding,
    });
  });
});