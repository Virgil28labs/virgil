import { memo, useEffect, useCallback, useState, useRef, useMemo } from 'react';
import './RhythmMachineViewer.css';
import { rhythmService } from '../../services/rhythm';
import type { RhythmPattern } from '../../services/rhythm';
import { 
  DRUM_SOUNDS, 
  GENRE_TAGS, 
  DEFAULT_BPM, 
  BAR_LENGTHS,
  DrumType,
  type DrumSound,
  type SavedPattern,
} from './rhythm.types';

interface RhythmMachineViewerProps {
  isOpen: boolean
  onClose: () => void
}

// Helper to create empty pattern
const createEmptyPattern = (steps: number): boolean[][] => 
  Array(DRUM_SOUNDS.length).fill(null).map(() => Array(steps).fill(false));

export const RhythmMachineViewer = memo(function RhythmMachineViewer({ 
  isOpen, 
  onClose, 
}: RhythmMachineViewerProps) {
  const [selectedBarLength, setSelectedBarLength] = useState(1); // Default to 2 bars (8 steps)
  const currentBarLength = BAR_LENGTHS[selectedBarLength];
  const [pattern, setPattern] = useState<boolean[][]>(
    () => createEmptyPattern(currentBarLength.steps),
  );
  // Removed currentCategory state - category is managed by backend
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [volume] = useState(0.7); // Fixed volume, no UI control needed
  const [genreInput, setGenreInput] = useState('jazz fusion groove');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Get abbreviation for beat category
  const getCategoryAbbreviation = (category?: string, description?: string): string => {
    if (category) {
      switch (category) {
        case 'techno': return 'TCH';
        case 'house': return 'HSE';
        case 'trap': return 'TRP';
        case 'breakbeat': return 'BRK';
        case 'minimal': return 'MIN';
      }
    }
    
    // If no category, try to infer from description
    if (description) {
      const desc = description.toLowerCase();
      if (desc.includes('techno')) return 'TCH';
      if (desc.includes('house')) return 'HSE';
      if (desc.includes('trap')) return 'TRP';
      if (desc.includes('break')) return 'BRK';
      if (desc.includes('minimal')) return 'MIN';
      if (desc.includes('808')) return '808';
      if (desc.includes('jazz')) return 'JAZ';
      if (desc.includes('afro')) return 'AFR';
    }
    
    return 'MIX';
  };
  
  const [saveSlots, setSaveSlots] = useState<(SavedPattern | null)[]>(() => {
    const saved = localStorage.getItem('rhythmMachineSaveSlots');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Handle legacy format (just patterns)
      if (parsed.length > 0 && Array.isArray(parsed[0])) {
        return [null, null, null, null, null];
      }
      return parsed;
    }
    return [null, null, null, null, null];
  });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize audio context with user gesture
  const initializeAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      try {
        // Initialize audio context
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
        gainNodeRef.current.gain.value = volume;
        
        // Check audio context state
        
        // Resume audio context if suspended
        if (audioContextRef.current.state === 'suspended') {
          // Resume suspended audio context
          await audioContextRef.current.resume();
          // Audio context resumed successfully
        }
        
        setAudioInitialized(true);
        // Audio initialization successful
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
        setAudioInitialized(false);
      }
    }
  }, [volume]);

  // Initialize audio on first user interaction
  const handleUserInteraction = useCallback(async () => {
    if (!audioInitialized) {
      await initializeAudio();
    }
  }, [audioInitialized, initializeAudio]);

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  // Create drum sound with Web Audio API - Simple synthesis matching original
  const createDrumSound = useCallback(async (sound: DrumSound) => {
    await handleUserInteraction();
    
    const ctx = audioContextRef.current;
    if (!ctx || !gainNodeRef.current) return;
    
    const now = ctx.currentTime;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Configure sound based on drum type - matching original exactly
      switch (sound.type) {
        case DrumType.KICK:
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
          gain.gain.setValueAtTime(1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
          break;
          
        case DrumType.SNARE:
          // Noise for snare
          const noise = ctx.createBufferSource();
          const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
          const noiseData = noiseBuffer.getChannelData(0);
          for (let i = 0; i < noiseBuffer.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
          }
          noise.buffer = noiseBuffer;
          
          const noiseGain = ctx.createGain();
          noise.connect(noiseGain);
          noiseGain.connect(ctx.destination);
          noiseGain.gain.setValueAtTime(0.2, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          
          // Tone for snare
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          
          osc.start(now);
          osc.stop(now + 0.2);
          noise.start(now);
          noise.stop(now + 0.2);
          break;
          
        case DrumType.HIHAT:
          osc.type = 'square';
          osc.frequency.value = 800;
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
          
        case DrumType.OPENHAT:
          osc.type = 'square';
          osc.frequency.value = 800;
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
          
        case DrumType.CLAP:
          // Clap noise
          const clapNoise = ctx.createBufferSource();
          const clapBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
          const clapData = clapBuffer.getChannelData(0);
          for (let i = 0; i < clapBuffer.length; i++) {
            clapData[i] = Math.random() * 2 - 1;
          }
          clapNoise.buffer = clapBuffer;
          
          const clapGain = ctx.createGain();
          clapNoise.connect(clapGain);
          clapGain.connect(ctx.destination);
          clapGain.gain.setValueAtTime(0.3, now);
          clapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          
          clapNoise.start(now);
          clapNoise.stop(now + 0.1);
          break;
      }
      
    } catch (error) {
      console.error(`Failed to create ${sound.name} sound:`, error);
    }
  }, [handleUserInteraction]);

  // Play step
  const playStep = useCallback((step: number) => {
    pattern.forEach((drumPattern, drumIndex) => {
      if (drumPattern[step]) {
        createDrumSound(DRUM_SOUNDS[drumIndex]);
      }
    });
  }, [pattern, createDrumSound]);

  // Toggle playback
  const togglePlayback = useCallback(async () => {
    if (!audioInitialized) {
      await initializeAudio();
    }
    
    if (isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPlaying(false);
    } else {
      const interval = 60000 / (bpm * 4); // 16th notes
      intervalRef.current = window.setInterval(() => {
        setCurrentStep((prev) => {
          const nextStep = (prev + 1) % currentBarLength.steps;
          playStep(nextStep);
          return nextStep;
        });
      }, interval);
      setIsPlaying(true);
    }
  }, [isPlaying, bpm, playStep, audioInitialized, initializeAudio, currentBarLength.steps]);

  // Toggle pattern step
  const toggleStep = useCallback((drumIndex: number, stepIndex: number) => {
    setPattern(prev => {
      const newPattern = [...prev];
      newPattern[drumIndex] = [...newPattern[drumIndex]];
      newPattern[drumIndex][stepIndex] = !newPattern[drumIndex][stepIndex];
      return newPattern;
    });
  }, []);

  // Clear pattern
  const clearPattern = useCallback(() => {
    setPattern(createEmptyPattern(currentBarLength.steps));
  }, [currentBarLength.steps]);

  // Generate random pattern
  const generatePattern = useCallback(() => {
    const newPattern = DRUM_SOUNDS.map(() => 
      Array(currentBarLength.steps).fill(false).map(() => Math.random() > 0.7),
    );
    setPattern(newPattern);
  }, [currentBarLength.steps]);

  // Generate AI-powered pattern using LLM
  const generateAIPattern = useCallback(async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      // If input is empty, generate random beat
      let description = genreInput.trim();
      if (!description) {
        const randomDescriptions = [
          'techno groove',
          'house music beat',
          'trap hi-hats pattern',
          'breakbeat rhythm',
          'minimal techno',
        ];
        description = randomDescriptions[Math.floor(Math.random() * randomDescriptions.length)];
        setGenreInput(description);
      }
      
      const result: RhythmPattern = await rhythmService.generatePattern({
        description,
        barLength: currentBarLength.steps,
        style: '',
        temperature: 0.7,
      });
      
      // Process generated pattern
      
      if (result.pattern && Array.isArray(result.pattern) && result.pattern.length === 5) {
        setPattern(result.pattern);
        
        // Log the category if available
        if (result.category) {
          // Using category from result
        }
        
        // Show feedback if using fallback
        if (result.fallback) {
          // Using fallback pattern generation
        }
      } else {
        throw new Error('Invalid pattern structure received');
      }
      
    } catch (error) {
      console.error('Pattern generation failed:', error);
      
      // Fallback pattern generation is handled by the backend
    } finally {
      setIsGenerating(false);
    }
  }, [currentBarLength.steps, genreInput, isGenerating]);

  // Memoize genre tag click handlers
  const genreTagHandlers = useMemo(
    () => GENRE_TAGS.reduce((acc, tag) => {
      acc[tag] = async () => {
        await handleUserInteraction();
        setSelectedGenre(tag);
        setGenreInput(tag);
        // Automatically generate pattern when tag is clicked
        setTimeout(() => generateAIPattern(), 100);
      };
      return acc;
    }, {} as Record<string, () => Promise<void>>),
    [handleUserInteraction, generateAIPattern],
  );

  // Memoize bar length handlers
  const barLengthHandlers = useMemo(
    () => BAR_LENGTHS.map((barLength, index) => async () => {
      await handleUserInteraction();
      setSelectedBarLength(index);
      // Reset pattern when changing bar length
      setPattern(createEmptyPattern(barLength.steps));
      setCurrentStep(0);
    }),
    [handleUserInteraction],
  );

  // Save pattern to slot
  const savePattern = useCallback((slotIndex: number) => {
    const newSlots = [...saveSlots];
    const category = genreInput.toLowerCase().includes('techno') ? 'techno' :
      genreInput.toLowerCase().includes('house') ? 'house' :
        genreInput.toLowerCase().includes('trap') ? 'trap' :
          genreInput.toLowerCase().includes('break') ? 'breakbeat' :
            genreInput.toLowerCase().includes('minimal') ? 'minimal' : undefined;
    
    newSlots[slotIndex] = {
      pattern: JSON.parse(JSON.stringify(pattern)),
      description: genreInput,
      category,
      timestamp: Date.now(),
    };
    setSaveSlots(newSlots);
    localStorage.setItem('rhythmMachineSaveSlots', JSON.stringify(newSlots));
  }, [pattern, saveSlots, genreInput]);

  // Load pattern from slot
  const loadPattern = useCallback((slotIndex: number) => {
    const saved = saveSlots[slotIndex];
    if (saved) {
      setPattern(saved.pattern);
      setGenreInput(saved.description);
    }
  }, [saveSlots]);

  // Clear save slot
  const clearSaveSlot = useCallback((slotIndex: number) => {
    const newSlots = [...saveSlots];
    newSlots[slotIndex] = null;
    setSaveSlots(newSlots);
    localStorage.setItem('rhythmMachineSaveSlots', JSON.stringify(newSlots));
  }, [saveSlots]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' || 
                       activeElement?.tagName === 'TEXTAREA' || 
                       activeElement?.getAttribute('contenteditable') === 'true';
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' && !isTyping) {
        e.preventDefault();
        togglePlayback();
      } else if (e.key === 'c' && e.ctrlKey && !isTyping) {
        e.preventDefault();
        clearPattern();
      } else if (e.key === 'r' && e.ctrlKey && !isTyping) {
        e.preventDefault();
        generatePattern();
      } else if (e.key === 'a' && e.ctrlKey && !isTyping) {
        e.preventDefault();
        generateAIPattern();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, togglePlayback, clearPattern, generatePattern, generateAIPattern]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Stop playback when closing
  useEffect(() => {
    if (!isOpen && isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPlaying(false);
      setCurrentStep(0);
    }
  }, [isOpen, isPlaying]);

  if (!isOpen) return null;

  // Memoize step indices for performance
  const stepIndices = useMemo(
    () => Array.from({ length: currentBarLength.steps }, (_, i) => i),
    [currentBarLength.steps],
  );

  // Memoize save slot indices
  const saveSlotIndices = useMemo(() => [0, 1, 2, 3, 4], []);

  // Memoize drum sound preview callbacks
  const drumSoundCallbacks = useMemo(
    () => DRUM_SOUNDS.map((drum) => async () => {
      await handleUserInteraction();
      createDrumSound(drum);
    }),
    [handleUserInteraction, createDrumSound],
  );

  // Handler for generate button
  const handleGenerateClick = useCallback(async () => {
    await handleUserInteraction();
    generateAIPattern();
  }, [handleUserInteraction, generateAIPattern]);

  // Handler for play/stop button
  const handlePlaybackClick = useCallback(async () => {
    await handleUserInteraction();
    togglePlayback();
  }, [handleUserInteraction, togglePlayback]);

  return (
    <div 
      className="rhythm-machine-backdrop" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Rhythm Machine - AI-powered drum sequencer"
    >
      <div 
        className="rhythm-machine-panel" 
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Header */}
        <div className="rhythm-machine-header">
          <div>
            <h2 className="rhythm-machine-title">
              Rhythm Machine
            </h2>
          </div>
          <button 
            className="rhythm-machine-close" 
            onClick={onClose}
            aria-label="Close rhythm machine"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="rhythm-machine-content">
          {/* Genre Input */}
          <div className="rhythm-machine-genre-section">
            <input
              type="text"
              value={genreInput}
              onChange={(e) => {
                setGenreInput(e.target.value);
                // Clear selected genre if user types something different
                if (!GENRE_TAGS.includes(e.target.value)) {
                  setSelectedGenre(null);
                }
              }}
              onFocus={handleUserInteraction}
              className="rhythm-machine-genre-input"
              placeholder="Enter genre or style..."
            />
            <button 
              className={`rhythm-machine-generate ${audioInitialized ? 'ready' : 'pending'} ${isGenerating ? 'generating' : ''}`}
              onClick={handleGenerateClick}
              disabled={isGenerating}
            >
              <span className="rhythm-machine-generate-icon">
                {isGenerating ? '⏳' : '✨'}
              </span>
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {/* Genre Tags */}
          <div className="rhythm-machine-genre-tags">
            <span className="rhythm-machine-try-label">TRY THESE:</span>
            {GENRE_TAGS.map((tag) => (
              <button
                key={tag}
                className={`rhythm-machine-genre-tag ${selectedGenre === tag ? 'active' : ''}`}
                onClick={genreTagHandlers[tag]}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Transport Controls */}
          <div className="rhythm-machine-transport">
            <button 
              className={`rhythm-machine-play ${isPlaying ? 'playing' : ''}`}
              onClick={handlePlaybackClick}
              aria-label={isPlaying ? 'Stop playback' : 'Start playback'}
            >
              <span>{isPlaying ? '⏸️' : '▶️'}</span>
              {isPlaying ? 'Stop' : 'Play'}
            </button>
            <button 
              className="rhythm-machine-stop"
              onClick={async () => {
                await handleUserInteraction();
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                setIsPlaying(false);
                setCurrentStep(0);
              }}
            >
              <span>⏹️</span>
              Stop
            </button>
            <button 
              className="rhythm-machine-clear"
              onClick={async () => {
                await handleUserInteraction();
                clearPattern();
              }}
            >
              <span>🗑️</span>
              Clear
            </button>
          </div>

          {/* Tempo Control */}
          <div className="rhythm-machine-tempo">
            <label>TEMPO</label>
            <input
              type="range"
              min="60"
              max="200"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              onMouseDown={handleUserInteraction}
              className="rhythm-machine-tempo-slider"
            />
            <span className="rhythm-machine-bpm-display">{bpm} BPM</span>
          </div>

          {/* Bar Length Selector */}
          <div className="rhythm-machine-bar-length">
            <label>BAR LENGTH</label>
            <div className="rhythm-machine-bar-buttons">
              {BAR_LENGTHS.map((barLength, index) => (
                <button
                  key={index}
                  className={`rhythm-machine-bar-button ${selectedBarLength === index ? 'active' : ''}`}
                  onClick={barLengthHandlers[index]}
                >
                  {barLength.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sequencer Grid */}
          <div className="rhythm-machine-sequencer">
            {DRUM_SOUNDS.map((drum, drumIndex) => (
              <div key={drum.name} className="rhythm-machine-drum-row">
                <div className="rhythm-machine-drum-label">
                  <button
                    className="rhythm-machine-drum-name"
                    onClick={drumSoundCallbacks[drumIndex]}
                    title={`Play ${drum.name}`}
                  >
                    {drum.name}
                  </button>
                </div>
                <div className="rhythm-machine-steps" data-steps={currentBarLength.steps}>
                  {stepIndices.map((stepIndex) => (
                    <button
                      key={stepIndex}
                      className={`rhythm-machine-step ${pattern[drumIndex][stepIndex] ? 'active' : ''} ${currentStep === stepIndex ? 'current' : ''}`}
                      onClick={async () => {
                        await handleUserInteraction();
                        toggleStep(drumIndex, stepIndex);
                      }}
                      aria-label={`Toggle ${drum.name} at step ${stepIndex + 1}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Save Slots */}
          <div className="rhythm-machine-save-slots">
            <span className="rhythm-machine-save-label">SAVE SLOTS:</span>
            <div className="rhythm-machine-save-buttons">
              {saveSlotIndices.map((index) => {
                const slot = saveSlots[index];
                return (
                  <div key={index} className="rhythm-machine-save-slot-container">
                    <div className={`rhythm-machine-save-slot ${slot ? 'occupied' : 'empty'}`}>
                      <span className="slot-number">{index + 1}</span>
                      {slot && (
                        <span className="slot-abbreviation">
                          {getCategoryAbbreviation(slot.category, slot.description)}
                        </span>
                      )}
                    </div>
                    <div className="rhythm-machine-slot-actions">
                      <button
                        className="slot-action save"
                        onClick={async () => {
                          await handleUserInteraction();
                          savePattern(index);
                        }}
                        title="Save current pattern"
                      >
                        💾
                      </button>
                      <button
                        className="slot-action load"
                        onClick={async () => {
                          await handleUserInteraction();
                          if (slot) loadPattern(index);
                        }}
                        disabled={!slot}
                        title="Load pattern"
                      >
                        ▶️
                      </button>
                      <button
                        className="slot-action clear"
                        onClick={async () => {
                          await handleUserInteraction();
                          if (slot) clearSaveSlot(index);
                        }}
                        disabled={!slot}
                        title="Clear slot"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});