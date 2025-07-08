import { useState, useRef, useCallback, useEffect } from 'react';

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceResult {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
}

interface VoiceInputOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  onResult?: (result: VoiceResult) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  startListening: () => boolean;
  stopListening: () => void;
  toggleListening: () => void;
  resetTranscript: () => void;
  clearError: () => void;
}

export function useVoiceInput(options: VoiceInputOptions = {}): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  
  const recognitionRef = useRef<any>(null);
  const {
    continuous = true,
    interimResults = true,
    language = 'en-US',
    onResult,
    onError,
    onStart,
    onEnd
  } = options;

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      
      // Configure recognition
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = interimResults;
      recognitionRef.current.lang = language;

      // Event handlers
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
        onStart?.();
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        onEnd?.();
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const fullTranscript = finalTranscript || interimTranscript;
        setTranscript(fullTranscript);
        
        onResult?.({
          transcript: fullTranscript,
          isFinal: !!finalTranscript,
          confidence: event.results[event.results.length - 1]?.[0]?.confidence
        });
      };

      recognitionRef.current.onerror = (event: any) => {
        const errorMessage = getErrorMessage(event.error);
        setError(errorMessage);
        setIsListening(false);
        onError?.(errorMessage);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [continuous, interimResults, language, onResult, onError, onStart, onEnd]);

  const startListening = useCallback((): boolean => {
    if (!isSupported) {
      const errorMsg = 'Speech recognition is not supported in this browser';
      setError(errorMsg);
      return false;
    }

    if (isListening) {
      return true;
    }

    try {
      setTranscript('');
      setError(null);
      recognitionRef.current?.start();
      return true;
    } catch (_err: any) {
      const errorMsg = 'Failed to start speech recognition';
      setError(errorMsg);
      return false;
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback((): void => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback((): void => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resetTranscript = useCallback((): void => {
    setTranscript('');
    setError(null);
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    clearError
  };
}

function getErrorMessage(error: string): string {
  switch (error) {
    case 'no-speech':
      return 'No speech was detected. Please try again.';
    case 'audio-capture':
      return 'Microphone access was denied or failed.';
    case 'not-allowed':
      return 'Microphone permission is required for voice input.';
    case 'network':
      return 'Network error occurred during speech recognition.';
    case 'aborted':
      return 'Speech recognition was aborted.';
    case 'bad-grammar':
      return 'Speech recognition grammar error.';
    case 'language-not-supported':
      return 'The selected language is not supported.';
    default:
      return `Speech recognition error: ${error}`;
  }
}