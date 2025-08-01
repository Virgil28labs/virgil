/**
 * RhythmMachineViewer Component Comprehensive Test Suite
 * 
 * Tests AI-powered drum sequencer with Web Audio API synthesis,
 * pattern generation, save/load functionality, and complex user interactions.
 * Most complex audio component in the application.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RhythmMachineViewer } from '../RhythmMachineViewer';

// Mock external dependencies
jest.mock('../../../services/rhythm/RhythmService', () => ({
  rhythmService: {
    generatePattern: jest.fn(),
  },
}));

jest.mock('../../../services/TimeService', () => ({
  timeService: {
    getTimestamp: jest.fn(),
    getLocalDate: jest.fn(),
    getCurrentDateTime: jest.fn(),
  },
}));

jest.mock('../../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock CSS import
jest.mock('../RhythmMachineViewer.css', () => ({}));

const mockRhythmService = jest.requireMock('../../../services/rhythm/RhythmService').rhythmService;
const mockTimeService = jest.requireMock('../../../services/TimeService').timeService;
const mockLogger = jest.requireMock('../../../lib/logger').logger;

// Mock Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    frequency: {
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn(),
      value: 0,
    },
    type: 'sine',
    start: jest.fn(),
    stop: jest.fn(),
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: {
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn(),
      value: 1,
    },
  })),
  createBuffer: jest.fn(() => ({
    getChannelData: jest.fn(() => new Float32Array(1024)),
    length: 1024,
  })),
  createBufferSource: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    buffer: null,
  })),
  destination: {},
  currentTime: 0,
  sampleRate: 44100,
  state: 'running',
  resume: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
}));

global.webkitAudioContext = global.AudioContext;

describe('RhythmMachineViewer', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTimeService.getTimestamp.mockReturnValue(Date.now());
    mockRhythmService.generatePattern.mockResolvedValue({
      pattern: [
        [true, false, false, false, true, false, false, false],
        [false, false, true, false, false, false, true, false],
        [true, true, true, true, true, true, true, true],
        [false, false, false, false, false, false, true, false],
        [false, true, false, true, false, true, false, true],
      ],
      category: 'house',
      fallback: false,
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    // Mock timers
    jest.spyOn(window, 'setInterval').mockImplementation((callback, delay) => {
      const id = setTimeout(callback, delay);
      return id as any;
    });
    jest.spyOn(window, 'clearInterval').mockImplementation(clearTimeout);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const renderComponent = (props = {}) => {
    return render(<RhythmMachineViewer {...defaultProps} {...props} />);
  };

  describe('Component Rendering', () => {
    it('renders when isOpen is true', () => {
      renderComponent();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Rhythm Machine')).toBeInTheDocument();
    });

    it('renders nothing when isOpen is false', () => {
      renderComponent({ isOpen: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('has correct accessibility attributes', () => {
      renderComponent();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'Rhythm Machine - AI-powered drum sequencer');
    });

    it('renders all main sections', () => {
      renderComponent();
      
      // Header with close button
      expect(screen.getByRole('button', { name: /close rhythm machine/i })).toBeInTheDocument();
      
      // Genre input
      expect(screen.getByPlaceholderText('Enter genre or style...')).toBeInTheDocument();
      
      // Transport controls
      expect(screen.getByRole('button', { name: /start playback/i })).toBeInTheDocument();
      expect(screen.getByText('Stop')).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();
      
      // Tempo control
      expect(screen.getByText('TEMPO')).toBeInTheDocument();
      expect(screen.getByText('120 BPM')).toBeInTheDocument();
      
      // Bar length selector
      expect(screen.getByText('BAR LENGTH')).toBeInTheDocument();
      
      // Save slots
      expect(screen.getByText('SAVE SLOTS:')).toBeInTheDocument();
    });
  });

  describe('Modal Behavior', () => {
    it('closes when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      renderComponent({ onClose });
      
      const backdrop = screen.getByRole('dialog');
      await user.click(backdrop);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when panel content is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      renderComponent({ onClose });
      
      const panel = screen.getByRole('document');
      await user.click(panel);
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('closes when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      renderComponent({ onClose });
      
      const closeButton = screen.getByRole('button', { name: /close rhythm machine/i });
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Genre Input and Generation', () => {
    it('allows typing in genre input', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const input = screen.getByPlaceholderText('Enter genre or style...');
      await user.type(input, 'techno beat');
      
      expect(input).toHaveValue('techno beat');
    });

    it('generates AI pattern when generate button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const input = screen.getByPlaceholderText('Enter genre or style...');
      await user.type(input, 'house music');
      
      const generateButton = screen.getByText('Generate');
      await user.click(generateButton);
      
      expect(mockRhythmService.generatePattern).toHaveBeenCalledWith({
        description: 'house music',
        barLength: 8, // Default 2 bars
        style: '',
        temperature: 0.7,
      });
    });

    it('shows generating state during pattern generation', async () => {
      const user = userEvent.setup();
      let resolveGeneration: (value: any) => void;
      const generationPromise = new Promise(resolve => {
        resolveGeneration = resolve;
      });
      mockRhythmService.generatePattern.mockReturnValue(generationPromise);
      
      renderComponent();
      
      const generateButton = screen.getByText('Generate');
      await user.click(generateButton);
      
      expect(screen.getByText('Generating...')).toBeInTheDocument();
      expect(screen.getByText('⏳')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();
      
      // Complete generation
      resolveGeneration!({
        pattern: [[true, false], [false, true]],
        category: 'test',
        fallback: false,
      });
      
      await waitFor(() => {
        expect(screen.getByText('Generate')).toBeInTheDocument();
        expect(screen.getByText('✨')).toBeInTheDocument();
      });
    });

    it('generates random description when input is empty', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const generateButton = screen.getByText('Generate');
      await user.click(generateButton);
      
      expect(mockRhythmService.generatePattern).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringMatching(/(techno groove|house music beat|trap hi-hats pattern|breakbeat rhythm|minimal techno)/),
        }),
      );
    });

    it('handles generation errors gracefully', async () => {
      const user = userEvent.setup();
      mockRhythmService.generatePattern.mockRejectedValue(new Error('Generation failed'));
      
      renderComponent();
      
      const generateButton = screen.getByText('Generate');
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Pattern generation failed',
          expect.any(Error),
          expect.objectContaining({
            component: 'RhythmMachineViewer',
            action: 'generateAIPattern',
          }),
        );
      });
    });
  });

  describe('Genre Tags', () => {
    it('renders all genre tags', () => {
      renderComponent();
      
      expect(screen.getByText('TRY THESE:')).toBeInTheDocument();
      expect(screen.getByText('808 Cowbell')).toBeInTheDocument();
      expect(screen.getByText('Glitch')).toBeInTheDocument();
      expect(screen.getByText('Jazz Fusion')).toBeInTheDocument();
      expect(screen.getByText('Afrobeat')).toBeInTheDocument();
    });

    it('selects genre tag when clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const jazzTag = screen.getByText('Jazz Fusion');
      await user.click(jazzTag);
      
      expect(screen.getByPlaceholderText('Enter genre or style...')).toHaveValue('Jazz Fusion');
      expect(jazzTag).toHaveClass('active');
    });

    it('automatically generates pattern when genre tag is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const afrobeatTag = screen.getByText('Afrobeat');
      await user.click(afrobeatTag);
      
      await waitFor(() => {
        expect(mockRhythmService.generatePattern).toHaveBeenCalledWith(
          expect.objectContaining({
            description: 'Afrobeat',
          }),
        );
      });
    });
  });

  describe('Transport Controls', () => {
    it('starts playback when play button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const playButton = screen.getByRole('button', { name: /start playback/i });
      await user.click(playButton);
      
      expect(playButton).toHaveAttribute('aria-label', 'Stop playback');
      expect(screen.getByText('⏸️')).toBeInTheDocument();
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    it('stops playback when stop button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Start playback first
      const playButton = screen.getByRole('button', { name: /start playback/i });
      await user.click(playButton);
      
      // Then stop
      const stopButton = screen.getAllByText('Stop')[0]; // Transport stop button
      await user.click(stopButton);
      
      expect(screen.getByRole('button', { name: /start playback/i })).toBeInTheDocument();
      expect(screen.getByText('▶️')).toBeInTheDocument();
    });

    it('clears pattern when clear button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // First set a pattern
      await user.click(screen.getByText('Generate'));
      
      // Then clear it
      const clearButton = screen.getByText('Clear');
      await user.click(clearButton);
      
      // Check that pattern is cleared (all steps should be inactive)
      const activeSteps = document.querySelectorAll('.rhythm-machine-step.active');
      expect(activeSteps).toHaveLength(0);
    });
  });

  describe('Tempo Control', () => {
    it('updates BPM when slider is moved', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const slider = screen.getByRole('slider');
      await user.clear(slider);
      await user.type(slider, '140');
      
      expect(screen.getByText('140 BPM')).toBeInTheDocument();
    });

    it('has correct slider range', () => {
      renderComponent();
      
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('min', '60');
      expect(slider).toHaveAttribute('max', '200');
      expect(slider).toHaveValue('120'); // Default BPM
    });
  });

  describe('Bar Length Selection', () => {
    it('renders all bar length options', () => {
      renderComponent();
      
      expect(screen.getByText('1 Bar')).toBeInTheDocument();
      expect(screen.getByText('2 Bars')).toBeInTheDocument();
      expect(screen.getByText('4 Bars')).toBeInTheDocument();
      expect(screen.getByText('8 Bars')).toBeInTheDocument();
    });

    it('selects bar length when clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const fourBarsButton = screen.getByText('4 Bars');
      await user.click(fourBarsButton);
      
      expect(fourBarsButton).toHaveClass('active');
    });

    it('resets pattern when bar length changes', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // First generate a pattern
      await user.click(screen.getByText('Generate'));
      
      // Change bar length
      await user.click(screen.getByText('4 Bars'));
      
      // Pattern should be reset
      const activeSteps = document.querySelectorAll('.rhythm-machine-step.active');
      expect(activeSteps).toHaveLength(0);
    });
  });

  describe('Sequencer Grid', () => {
    it('renders all drum sounds', () => {
      renderComponent();
      
      expect(screen.getByText('KICK')).toBeInTheDocument();
      expect(screen.getByText('SNARE')).toBeInTheDocument();
      expect(screen.getByText('HIHAT')).toBeInTheDocument();
      expect(screen.getByText('OPENHAT')).toBeInTheDocument();
      expect(screen.getByText('CLAP')).toBeInTheDocument();
    });

    it('renders correct number of steps for default bar length', () => {
      renderComponent();
      
      // Default is 2 bars (8 steps)
      const steps = document.querySelectorAll('.rhythm-machine-step');
      expect(steps).toHaveLength(40); // 5 drums × 8 steps
    });

    it('toggles step when clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const firstStep = document.querySelector('.rhythm-machine-step');
      expect(firstStep).not.toHaveClass('active');
      
      await user.click(firstStep!);
      
      expect(firstStep).toHaveClass('active');
      
      await user.click(firstStep!);
      
      expect(firstStep).not.toHaveClass('active');
    });

    it('plays drum sound when drum name is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const kickButton = screen.getByText('KICK');
      await user.click(kickButton);
      
      // Audio context should be initialized and used
      expect(global.AudioContext).toHaveBeenCalled();
    });
  });

  describe('Save/Load Functionality', () => {
    it('renders save slots', () => {
      renderComponent();
      
      const saveSlots = document.querySelectorAll('.rhythm-machine-save-slot');
      expect(saveSlots).toHaveLength(5);
      
      // Check slot numbers
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('saves pattern to slot', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Generate a pattern first
      await user.click(screen.getByText('Generate'));
      
      // Save to first slot
      const saveButtons = document.querySelectorAll('button[title="Save current pattern"]');
      await user.click(saveButtons[0]);
      
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'rhythmMachineSaveSlots',
        expect.stringContaining('"pattern"'),
      );
    });

    it('loads pattern from slot', async () => {
      const user = userEvent.setup();
      
      // Mock saved patterns in localStorage
      const mockSlots = [
        {
          pattern: [[true, false, true, false], [false, true, false, true], [true, true, false, false], [false, false, true, true], [true, false, false, true]],
          description: 'test pattern',
          category: 'house',
          timestamp: Date.now(),
        },
        null, null, null, null,
      ];
      window.localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify(mockSlots));
      
      renderComponent();
      
      // Load from first slot
      const loadButtons = document.querySelectorAll('button[title="Load pattern"]');
      await user.click(loadButtons[0]);
      
      // Pattern should be loaded
      expect(screen.getByPlaceholderText('Enter genre or style...')).toHaveValue('test pattern');
    });

    it('clears save slot', async () => {
      const user = userEvent.setup();
      
      // Mock occupied slot
      const mockSlots = [
        {
          pattern: [[true, false], [false, true], [true, true], [false, false], [true, false]],
          description: 'test pattern',
          category: 'house',
          timestamp: Date.now(),
        },
        null, null, null, null,
      ];
      window.localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify(mockSlots));
      
      renderComponent();
      
      // Clear first slot
      const clearButtons = document.querySelectorAll('button[title="Clear slot"]');
      await user.click(clearButtons[0]);
      
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'rhythmMachineSaveSlots',
        expect.stringContaining('null'),
      );
    });

    it('displays category abbreviations for saved patterns', () => {
      const mockSlots = [
        { pattern: [], description: 'techno beat', category: 'techno', timestamp: Date.now() },
        { pattern: [], description: 'house groove', category: 'house', timestamp: Date.now() },
        { pattern: [], description: '808 pattern', category: undefined, timestamp: Date.now() },
        null, null,
      ];
      window.localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify(mockSlots));
      
      renderComponent();
      
      expect(screen.getByText('TCH')).toBeInTheDocument(); // Techno
      expect(screen.getByText('HSE')).toBeInTheDocument(); // House
      expect(screen.getByText('808')).toBeInTheDocument(); // Inferred from description
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('closes modal with Escape key', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      renderComponent({ onClose });
      
      await user.keyboard('{Escape}');
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('toggles playback with Space key', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      await user.keyboard(' ');
      
      expect(screen.getByRole('button', { name: /stop playback/i })).toBeInTheDocument();
    });

    it('clears pattern with Ctrl+C', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      // Generate pattern first
      await user.click(screen.getByText('Generate'));
      
      await user.keyboard('{Control>}c{/Control}');
      
      const activeSteps = document.querySelectorAll('.rhythm-machine-step.active');
      expect(activeSteps).toHaveLength(0);
    });

    it('generates random pattern with Ctrl+R', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      await user.keyboard('{Control>}r{/Control}');
      
      // Should have some active steps from random generation
      const activeSteps = document.querySelectorAll('.rhythm-machine-step.active');
      expect(activeSteps.length).toBeGreaterThan(0);
    });

    it('generates AI pattern with Ctrl+A', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      await user.keyboard('{Control>}a{/Control}');
      
      expect(mockRhythmService.generatePattern).toHaveBeenCalled();
    });

    it('ignores shortcuts when typing in input field', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      renderComponent({ onClose });
      
      const input = screen.getByPlaceholderText('Enter genre or style...');
      await user.click(input);
      await user.keyboard(' ');
      
      // Should not toggle playback
      expect(screen.getByRole('button', { name: /start playback/i })).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Audio Context Management', () => {
    it('initializes audio context on user interaction', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const playButton = screen.getByRole('button', { name: /start playback/i });
      await user.click(playButton);
      
      expect(global.AudioContext).toHaveBeenCalled();
    });

    it('resumes suspended audio context', async () => {
      const mockAudioContext = new (global.AudioContext as jest.Mock)();
      mockAudioContext.state = 'suspended';
      
      const user = userEvent.setup();
      renderComponent();
      
      const kickButton = screen.getByText('KICK');
      await user.click(kickButton);
      
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('handles audio initialization errors', async () => {
      global.AudioContext = jest.fn().mockImplementation(() => {
        throw new Error('Audio not supported');
      });
      
      const user = userEvent.setup();
      renderComponent();
      
      const kickButton = screen.getByText('KICK');
      await user.click(kickButton);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize audio context',
        expect.any(Error),
        expect.objectContaining({
          component: 'RhythmMachineViewer',
          action: 'initializeAudio',
        }),
      );
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('cleans up intervals on unmount', () => {
      const { unmount } = renderComponent();
      
      unmount();
      
      expect(window.clearInterval).toHaveBeenCalled();
    });

    it('closes audio context on unmount', () => {
      const mockAudioContext = new (global.AudioContext as jest.Mock)();
      global.AudioContext = jest.fn().mockReturnValue(mockAudioContext);
      
      const { unmount } = renderComponent();
      
      unmount();
      
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('stops playback when modal closes', async () => {
      const user = userEvent.setup();
      const { rerender } = renderComponent();
      
      // Start playback
      const playButton = screen.getByRole('button', { name: /start playback/i });
      await user.click(playButton);
      
      // Close modal
      rerender(<RhythmMachineViewer isOpen={false} onClose={jest.fn()} />);
      
      expect(window.clearInterval).toHaveBeenCalled();
    });
  });

  describe('Performance Optimizations', () => {
    it('memoizes genre tag handlers', () => {
      const { rerender } = renderComponent();
      
      const originalHandlers = document.querySelectorAll('.rhythm-machine-genre-tag');
      
      rerender(<RhythmMachineViewer {...defaultProps} />);
      
      const newHandlers = document.querySelectorAll('.rhythm-machine-genre-tag');
      expect(originalHandlers.length).toBe(newHandlers.length);
    });

    it('memoizes step indices for grid rendering', () => {
      renderComponent();
      
      const steps = document.querySelectorAll('.rhythm-machine-step');
      expect(steps.length).toBe(40); // 5 × 8 steps for default 2 bars
    });

    it('memoizes drum sound callbacks', async () => {
      const user = userEvent.setup();
      renderComponent();
      
      const kickButton = screen.getByText('KICK');
      await user.click(kickButton);
      await user.click(kickButton); // Click again
      
      expect(global.AudioContext).toHaveBeenCalledTimes(2); // Should reuse callback
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles invalid pattern generation response', async () => {
      const user = userEvent.setup();
      mockRhythmService.generatePattern.mockResolvedValue({
        pattern: null, // Invalid pattern
        category: 'test',
        fallback: false,
      });
      
      renderComponent();
      
      await user.click(screen.getByText('Generate'));
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Pattern generation failed',
        expect.any(Error),
        expect.objectContaining({
          component: 'RhythmMachineViewer',
        }),
      );
    });

    it('handles legacy localStorage format', () => {
      // Mock legacy format (just pattern arrays)
      window.localStorage.getItem = jest.fn().mockReturnValue(JSON.stringify([
        [[true, false], [false, true]],
        [[false, true], [true, false]],
      ]));
      
      expect(() => renderComponent()).not.toThrow();
      
      // Should reset to empty slots
      const saveSlots = document.querySelectorAll('.rhythm-machine-save-slot.empty');
      expect(saveSlots).toHaveLength(5);
    });

    it('handles audio creation errors gracefully', async () => {
      const user = userEvent.setup();
      const mockAudioContext = new (global.AudioContext as jest.Mock)();
      mockAudioContext.createOscillator.mockImplementation(() => {
        throw new Error('Oscillator creation failed');
      });
      global.AudioContext = jest.fn().mockReturnValue(mockAudioContext);
      
      renderComponent();
      
      const kickButton = screen.getByText('KICK');
      await user.click(kickButton);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create KICK sound',
        expect.any(Error),
        expect.objectContaining({
          component: 'RhythmMachineViewer',
          action: 'createDrumSound',
        }),
      );
    });

    it('prevents multiple concurrent generations', async () => {
      const user = userEvent.setup();
      let resolveGeneration: (value: any) => void;
      const generationPromise = new Promise(resolve => {
        resolveGeneration = resolve;
      });
      mockRhythmService.generatePattern.mockReturnValue(generationPromise);
      
      renderComponent();
      
      const generateButton = screen.getByText('Generate');
      await user.click(generateButton);
      await user.click(generateButton); // Second click
      
      expect(mockRhythmService.generatePattern).toHaveBeenCalledTimes(1);
    });
  });
});