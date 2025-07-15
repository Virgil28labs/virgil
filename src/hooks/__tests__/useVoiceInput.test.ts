import { renderHook, act } from '@testing-library/react';
import { useVoiceInput } from '../useVoiceInput';

// Mock SpeechRecognition
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  start() {
    if (this.onstart) {
      this.onstart();
    }
  }
  
  stop() {
    if (this.onend) {
      this.onend();
    }
  }
}

describe('useVoiceInput', () => {
  let mockSpeechRecognition: MockSpeechRecognition;
  let originalSpeechRecognition: any;

  beforeEach(() => {
    mockSpeechRecognition = new MockSpeechRecognition();
    originalSpeechRecognition = (window as any).SpeechRecognition;
    
    (window as any).SpeechRecognition = jest.fn(() => mockSpeechRecognition);
    (window as any).webkitSpeechRecognition = jest.fn(() => mockSpeechRecognition);
  });

  afterEach(() => {
    (window as any).SpeechRecognition = originalSpeechRecognition;
    (window as any).webkitSpeechRecognition = undefined;
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useVoiceInput());

      expect(result.current.isListening).toBe(false);
      expect(result.current.transcript).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.isSupported).toBe(true);
    });

    it('should detect when speech recognition is not supported', () => {
      (window as any).SpeechRecognition = undefined;
      (window as any).webkitSpeechRecognition = undefined;

      const { result } = renderHook(() => useVoiceInput());

      expect(result.current.isSupported).toBe(false);
    });

    it('should configure recognition with options', () => {
      renderHook(() => useVoiceInput({
        continuous: false,
        interimResults: false,
        language: 'es-ES'
      }));

      expect(mockSpeechRecognition.continuous).toBe(false);
      expect(mockSpeechRecognition.interimResults).toBe(false);
      expect(mockSpeechRecognition.lang).toBe('es-ES');
    });

    it('should use default options', () => {
      renderHook(() => useVoiceInput());

      expect(mockSpeechRecognition.continuous).toBe(true);
      expect(mockSpeechRecognition.interimResults).toBe(true);
      expect(mockSpeechRecognition.lang).toBe('en-US');
    });
  });

  describe('startListening', () => {
    it('should start speech recognition', () => {
      const startSpy = jest.spyOn(mockSpeechRecognition, 'start');
      const { result } = renderHook(() => useVoiceInput());

      act(() => {
        const success = result.current.startListening();
        expect(success).toBe(true);
      });

      expect(startSpy).toHaveBeenCalled();
      expect(result.current.isListening).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should return false when not supported', () => {
      (window as any).SpeechRecognition = undefined;
      (window as any).webkitSpeechRecognition = undefined;

      const { result } = renderHook(() => useVoiceInput());

      act(() => {
        const success = result.current.startListening();
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe('Speech recognition is not supported in this browser');
    });

    it('should not start if already listening', () => {
      const startSpy = jest.spyOn(mockSpeechRecognition, 'start');
      const { result } = renderHook(() => useVoiceInput());

      act(() => {
        result.current.startListening();
      });

      startSpy.mockClear();

      act(() => {
        const success = result.current.startListening();
        expect(success).toBe(true);
      });

      expect(startSpy).not.toHaveBeenCalled();
    });

    it('should handle start errors', () => {
      mockSpeechRecognition.start = jest.fn(() => {
        throw new Error('Start failed');
      });

      const { result } = renderHook(() => useVoiceInput());

      act(() => {
        const success = result.current.startListening();
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe('Failed to start speech recognition');
    });

    it('should reset transcript on start', () => {
      const { result } = renderHook(() => useVoiceInput());

      // Set initial transcript
      act(() => {
        if (mockSpeechRecognition.onresult) {
          mockSpeechRecognition.onresult({
            resultIndex: 0,
            results: [{
              isFinal: true,
              0: { transcript: 'Previous text' }
            }]
          });
        }
      });

      expect(result.current.transcript).toBe('Previous text');

      // Start listening again
      act(() => {
        result.current.startListening();
      });

      expect(result.current.transcript).toBe('');
    });
  });

  describe('stopListening', () => {
    it('should stop speech recognition', () => {
      const stopSpy = jest.spyOn(mockSpeechRecognition, 'stop');
      const { result } = renderHook(() => useVoiceInput());

      act(() => {
        result.current.startListening();
      });

      act(() => {
        result.current.stopListening();
      });

      expect(stopSpy).toHaveBeenCalled();
      expect(result.current.isListening).toBe(false);
    });

    it('should not stop if not listening', () => {
      const stopSpy = jest.spyOn(mockSpeechRecognition, 'stop');
      const { result } = renderHook(() => useVoiceInput());

      act(() => {
        result.current.stopListening();
      });

      expect(stopSpy).not.toHaveBeenCalled();
    });
  });

  describe('toggleListening', () => {
    it('should toggle between start and stop', () => {
      const { result } = renderHook(() => useVoiceInput());

      expect(result.current.isListening).toBe(false);

      act(() => {
        result.current.toggleListening();
      });

      expect(result.current.isListening).toBe(true);

      act(() => {
        result.current.toggleListening();
      });

      expect(result.current.isListening).toBe(false);
    });
  });

  describe('speech recognition events', () => {
    it('should handle speech results', () => {
      const onResult = jest.fn();
      const { result } = renderHook(() => useVoiceInput({ onResult }));

      act(() => {
        result.current.startListening();
      });

      act(() => {
        if (mockSpeechRecognition.onresult) {
          mockSpeechRecognition.onresult({
            resultIndex: 0,
            results: [{
              isFinal: false,
              0: { transcript: 'Hello' }
            }]
          });
        }
      });

      expect(result.current.transcript).toBe('Hello');
      expect(onResult).toHaveBeenCalledWith({
        transcript: 'Hello',
        isFinal: false,
        confidence: undefined
      });
    });

    it('should handle final results', () => {
      const onResult = jest.fn();
      const { result } = renderHook(() => useVoiceInput({ onResult }));

      act(() => {
        result.current.startListening();
      });

      act(() => {
        if (mockSpeechRecognition.onresult) {
          mockSpeechRecognition.onresult({
            resultIndex: 0,
            results: [{
              isFinal: true,
              0: { transcript: 'Hello world', confidence: 0.95 }
            }]
          });
        }
      });

      expect(result.current.transcript).toBe('Hello world');
      expect(onResult).toHaveBeenCalledWith({
        transcript: 'Hello world',
        isFinal: true,
        confidence: 0.95
      });
    });

    it('should handle multiple results', () => {
      const { result } = renderHook(() => useVoiceInput());

      act(() => {
        result.current.startListening();
      });

      act(() => {
        if (mockSpeechRecognition.onresult) {
          mockSpeechRecognition.onresult({
            resultIndex: 0,
            results: [
              { isFinal: true, 0: { transcript: 'Hello' } },
              { isFinal: true, 0: { transcript: ' world' } },
              { isFinal: false, 0: { transcript: ' today' } }
            ]
          });
        }
      });

      expect(result.current.transcript).toBe('Hello world');
    });

    it('should handle recognition errors', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useVoiceInput({ onError }));

      act(() => {
        result.current.startListening();
      });

      act(() => {
        if (mockSpeechRecognition.onerror) {
          mockSpeechRecognition.onerror({ error: 'no-speech' });
        }
      });

      expect(result.current.error).toBe('No speech was detected. Please try again.');
      expect(result.current.isListening).toBe(false);
      expect(onError).toHaveBeenCalledWith('No speech was detected. Please try again.');
    });

    it('should handle various error types', () => {
      const errorMap = {
        'audio-capture': 'Microphone access was denied or failed.',
        'not-allowed': 'Microphone permission is required for voice input.',
        'network': 'Network error occurred during speech recognition.',
        'aborted': 'Speech recognition was aborted.',
        'bad-grammar': 'Speech recognition grammar error.',
        'language-not-supported': 'The selected language is not supported.',
        'unknown-error': 'Speech recognition error: unknown-error'
      };

      const { result } = renderHook(() => useVoiceInput());

      Object.entries(errorMap).forEach(([error, expectedMessage]) => {
        act(() => {
          if (mockSpeechRecognition.onerror) {
            mockSpeechRecognition.onerror({ error });
          }
        });

        expect(result.current.error).toBe(expectedMessage);
      });
    });
  });

  describe('callbacks', () => {
    it('should call onStart callback', () => {
      const onStart = jest.fn();
      const { result } = renderHook(() => useVoiceInput({ onStart }));

      act(() => {
        result.current.startListening();
      });

      expect(onStart).toHaveBeenCalled();
    });

    it('should call onEnd callback', () => {
      const onEnd = jest.fn();
      const { result } = renderHook(() => useVoiceInput({ onEnd }));

      act(() => {
        result.current.startListening();
      });

      act(() => {
        result.current.stopListening();
      });

      expect(onEnd).toHaveBeenCalled();
    });
  });

  describe('utility functions', () => {
    it('should reset transcript', () => {
      const { result } = renderHook(() => useVoiceInput());

      act(() => {
        result.current.startListening();
      });

      act(() => {
        if (mockSpeechRecognition.onresult) {
          mockSpeechRecognition.onresult({
            resultIndex: 0,
            results: [{
              isFinal: true,
              0: { transcript: 'Test text' }
            }]
          });
        }
      });

      expect(result.current.transcript).toBe('Test text');

      act(() => {
        result.current.resetTranscript();
      });

      expect(result.current.transcript).toBe('');
      expect(result.current.error).toBeNull();
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useVoiceInput());

      act(() => {
        if (mockSpeechRecognition.onerror) {
          mockSpeechRecognition.onerror({ error: 'no-speech' });
        }
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should stop recognition on unmount', () => {
      const stopSpy = jest.spyOn(mockSpeechRecognition, 'stop');
      const { result, unmount } = renderHook(() => useVoiceInput());

      act(() => {
        result.current.startListening();
      });

      unmount();

      expect(stopSpy).toHaveBeenCalled();
    });
  });
});