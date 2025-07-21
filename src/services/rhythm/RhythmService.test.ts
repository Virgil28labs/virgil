import { RhythmService } from "./RhythmService";

// Mock AudioContext
const mockAudioContext = {
  currentTime: 0,
  destination: {},
  createOscillator: jest.fn(),
  createGain: jest.fn(),
  createDynamicsCompressor: jest.fn(),
  createBiquadFilter: jest.fn(),
  resume: jest.fn(),
  close: jest.fn(),
  state: "suspended",
};

const mockOscillator = {
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  frequency: { setValueAtTime: jest.fn() },
  type: "sine",
};

const mockGainNode = {
  connect: jest.fn(),
  gain: {
    setValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  },
};

const mockCompressor = {
  connect: jest.fn(),
  threshold: { setValueAtTime: jest.fn() },
  knee: { setValueAtTime: jest.fn() },
  ratio: { setValueAtTime: jest.fn() },
  attack: { setValueAtTime: jest.fn() },
  release: { setValueAtTime: jest.fn() },
};

const mockFilter = {
  connect: jest.fn(),
  frequency: { setValueAtTime: jest.fn() },
  Q: { setValueAtTime: jest.fn() },
  type: "lowpass",
};

// Mock window.AudioContext
(global as any).AudioContext = jest.fn(() => mockAudioContext);
mockAudioContext.createOscillator.mockReturnValue(mockOscillator);
mockAudioContext.createGain.mockReturnValue(mockGainNode);
mockAudioContext.createDynamicsCompressor.mockReturnValue(mockCompressor);
mockAudioContext.createBiquadFilter.mockReturnValue(mockFilter);

describe("RhythmService", () => {
  let rhythmService: RhythmService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset singleton
    (RhythmService as any).instance = null;
    rhythmService = RhythmService.getInstance();
  });

  afterEach(() => {
    jest.useRealTimers();
    rhythmService.destroy();
  });

  describe("getInstance", () => {
    it("returns singleton instance", () => {
      const instance1 = RhythmService.getInstance();
      const instance2 = RhythmService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("initialize", () => {
    it("creates audio context and nodes", async () => {
      await rhythmService.initialize();

      expect(global.AudioContext).toHaveBeenCalled();
      expect(mockAudioContext.createDynamicsCompressor).toHaveBeenCalled();
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
      expect(mockCompressor.connect).toHaveBeenCalledWith(mockFilter);
      expect(mockFilter.connect).toHaveBeenCalledWith(
        mockAudioContext.destination,
      );
    });

    it("resumes audio context", async () => {
      await rhythmService.initialize();

      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it("sets up default instruments", async () => {
      await rhythmService.initialize();

      expect(rhythmService.instruments).toHaveLength(4);
      expect(rhythmService.instruments[0].name).toBe("Kick");
      expect(rhythmService.instruments[1].name).toBe("Snare");
      expect(rhythmService.instruments[2].name).toBe("Hi-hat");
      expect(rhythmService.instruments[3].name).toBe("Clap");
    });

    it("handles initialization error", async () => {
      (global as any).AudioContext = jest.fn(() => {
        throw new Error("Audio not supported");
      });

      await expect(rhythmService.initialize()).rejects.toThrow(
        "Audio not supported",
      );
    });
  });

  describe("togglePlayback", () => {
    beforeEach(async () => {
      await rhythmService.initialize();
    });

    it("starts playback when not playing", () => {
      rhythmService.togglePlayback();

      expect(rhythmService.isPlaying).toBe(true);
      expect(setTimeout).toHaveBeenCalled();
    });

    it("stops playback when playing", () => {
      rhythmService.isPlaying = true;
      rhythmService.togglePlayback();

      expect(rhythmService.isPlaying).toBe(false);
    });
  });

  describe("setBPM", () => {
    beforeEach(async () => {
      await rhythmService.initialize();
    });

    it("updates BPM within valid range", () => {
      rhythmService.setBPM(140);
      expect(rhythmService.bpm).toBe(140);
    });

    it("clamps BPM to minimum", () => {
      rhythmService.setBPM(50);
      expect(rhythmService.bpm).toBe(60);
    });

    it("clamps BPM to maximum", () => {
      rhythmService.setBPM(250);
      expect(rhythmService.bpm).toBe(200);
    });

    it("recalculates step time", () => {
      rhythmService.setBPM(120);
      // 60000 / (120 * 4) = 125ms per step
      expect((rhythmService as any).stepTime).toBe(125);
    });
  });

  describe("toggleInstrument", () => {
    beforeEach(async () => {
      await rhythmService.initialize();
    });

    it("toggles instrument active state when no step provided", () => {
      const initialState = rhythmService.instruments[0].active;
      rhythmService.toggleInstrument(0);
      expect(rhythmService.instruments[0].active).toBe(!initialState);
    });

    it("toggles pattern step when step provided", () => {
      const initialPattern = rhythmService.instruments[0].pattern[0];
      rhythmService.toggleInstrument(0, 0);
      expect(rhythmService.instruments[0].pattern[0]).toBe(!initialPattern);
    });

    it("ignores invalid instrument index", () => {
      const instrumentsBefore = JSON.stringify(rhythmService.instruments);
      rhythmService.toggleInstrument(10);
      expect(JSON.stringify(rhythmService.instruments)).toBe(instrumentsBefore);
    });

    it("ignores invalid step index", () => {
      const patternBefore = [...rhythmService.instruments[0].pattern];
      rhythmService.toggleInstrument(0, 20);
      expect(rhythmService.instruments[0].pattern).toEqual(patternBefore);
    });
  });

  describe("clearPattern", () => {
    beforeEach(async () => {
      await rhythmService.initialize();
    });

    it("clears all instrument patterns", () => {
      // Set some pattern data
      rhythmService.instruments.forEach((inst) => {
        inst.pattern[0] = true;
        inst.pattern[1] = true;
      });

      rhythmService.clearPattern();

      rhythmService.instruments.forEach((inst) => {
        expect(inst.pattern.every((step) => step === false)).toBe(true);
      });
    });
  });

  describe("randomizePattern", () => {
    beforeEach(async () => {
      await rhythmService.initialize();
    });

    it("creates random patterns for all instruments", () => {
      const patternsBefore = rhythmService.instruments.map((inst) => [
        ...inst.pattern,
      ]);

      rhythmService.randomizePattern();

      // At least one pattern should be different
      const patternsChanged = rhythmService.instruments.some((inst, idx) =>
        inst.pattern.some(
          (step, stepIdx) => step !== patternsBefore[idx][stepIdx],
        ),
      );

      expect(patternsChanged).toBe(true);
    });
  });

  describe("playStep", () => {
    beforeEach(async () => {
      await rhythmService.initialize();
      // Reset audio context time
      mockAudioContext.currentTime = 0;
    });

    it("plays active instruments with active pattern steps", () => {
      // Set up a pattern
      rhythmService.instruments[0].active = true;
      rhythmService.instruments[0].pattern[0] = true;

      (rhythmService as any).playStep();

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockOscillator.start).toHaveBeenCalled();
      expect(mockOscillator.stop).toHaveBeenCalled();
    });

    it("advances to next step", () => {
      rhythmService.currentStep = 0;
      (rhythmService as any).playStep();
      expect(rhythmService.currentStep).toBe(1);
    });

    it("wraps around at end of pattern", () => {
      rhythmService.currentStep = 7;
      (rhythmService as any).playStep();
      expect(rhythmService.currentStep).toBe(0);
    });

    it("schedules next step when playing", () => {
      rhythmService.isPlaying = true;
      (rhythmService as any).playStep();

      expect(setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        (rhythmService as any).stepTime,
      );
    });

    it("does not schedule next step when not playing", () => {
      rhythmService.isPlaying = false;
      (rhythmService as any).playStep();

      expect(setTimeout).not.toHaveBeenCalled();
    });
  });

  describe("playSound", () => {
    beforeEach(async () => {
      await rhythmService.initialize();
      mockAudioContext.currentTime = 0;
    });

    it("plays kick sound", () => {
      (rhythmService as any).playSound("Kick", 0);

      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(
        60,
        0,
      );
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(1, 0);
      expect(mockGainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
    });

    it("plays snare sound", () => {
      (rhythmService as any).playSound("Snare", 0);

      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(
        200,
        0,
      );
      expect(mockFilter.frequency.setValueAtTime).toHaveBeenCalledWith(2000, 0);
    });

    it("plays hi-hat sound", () => {
      (rhythmService as any).playSound("Hi-hat", 0);

      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(
        800,
        0,
      );
      expect(mockFilter.frequency.setValueAtTime).toHaveBeenCalledWith(8000, 0);
      expect(mockFilter.type).toBe("highpass");
    });

    it("plays clap sound", () => {
      (rhythmService as any).playSound("Clap", 0);

      expect(mockFilter.frequency.setValueAtTime).toHaveBeenCalledWith(1500, 0);
      expect(mockFilter.Q.setValueAtTime).toHaveBeenCalledWith(15, 0);
      expect(mockFilter.type).toBe("bandpass");
    });
  });

  describe("destroy", () => {
    beforeEach(async () => {
      await rhythmService.initialize();
    });

    it("stops playback", () => {
      rhythmService.isPlaying = true;
      rhythmService.destroy();
      expect(rhythmService.isPlaying).toBe(false);
    });

    it("closes audio context", () => {
      rhythmService.destroy();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it("clears timeout", () => {
      jest.spyOn(global, "clearTimeout");
      rhythmService.isPlaying = true;
      (rhythmService as any).playStep();

      rhythmService.destroy();

      expect(clearTimeout).toHaveBeenCalled();
    });
  });

  describe("playback flow", () => {
    beforeEach(async () => {
      await rhythmService.initialize();
    });

    it("plays pattern continuously when started", () => {
      rhythmService.instruments[0].active = true;
      rhythmService.instruments[0].pattern = [
        true,
        false,
        true,
        false,
        true,
        false,
        true,
        false,
      ];

      rhythmService.togglePlayback();
      expect(rhythmService.isPlaying).toBe(true);

      // First step
      jest.advanceTimersByTime(125);
      expect(rhythmService.currentStep).toBe(1);

      // Second step
      jest.advanceTimersByTime(125);
      expect(rhythmService.currentStep).toBe(2);

      // Continue for full pattern
      jest.advanceTimersByTime(125 * 6);
      expect(rhythmService.currentStep).toBe(0); // Should wrap around
    });
  });
});
