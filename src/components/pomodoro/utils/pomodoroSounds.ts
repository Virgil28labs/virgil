import { PomodoroSounds } from '../../../types/pomodoro.types'

class PomodoroAudioManager {
  private audioContext: AudioContext | null = null
  private sounds: PomodoroSounds = {
    sessionComplete: null,
    tick: null
  }
  private gainNode: GainNode | null = null
  private isInitialized = false

  // Initialize audio context (must be called after user interaction)
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.gainNode = this.audioContext.createGain()
      this.gainNode.connect(this.audioContext.destination)
      
      // Create sounds
      this.sounds.sessionComplete = await this.createChimeSound()
      this.sounds.tick = await this.createTickSound()
      
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize audio:', error)
    }
  }

  // Create a pleasant chime sound for session completion
  private async createChimeSound(): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('Audio context not initialized')

    const duration = 1.5
    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate)

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel)
      
      // Create a pleasant chime with multiple harmonics
      const frequencies = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
      const amplitudes = [0.5, 0.3, 0.15, 0.05]
      
      for (let i = 0; i < channelData.length; i++) {
        const t = i / sampleRate
        let sample = 0
        
        // Add each harmonic
        for (let f = 0; f < frequencies.length; f++) {
          const envelope = Math.exp(-3 * t) * Math.sin(Math.PI * t / duration)
          sample += Math.sin(2 * Math.PI * frequencies[f] * t) * amplitudes[f] * envelope
        }
        
        // Add some reverb effect
        if (i > sampleRate * 0.1) {
          const delayIndex = i - Math.floor(sampleRate * 0.1)
          sample += channelData[delayIndex] * 0.3
        }
        
        channelData[i] = sample * 0.3
      }
    }

    return buffer
  }

  // Create a soft tick sound
  private async createTickSound(): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('Audio context not initialized')

    const duration = 0.05
    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate)
    const channelData = buffer.getChannelData(0)

    // Create a soft click/tick sound
    for (let i = 0; i < channelData.length; i++) {
      const t = i / sampleRate
      const envelope = Math.exp(-50 * t)
      const noise = (Math.random() - 0.5) * 2
      const tone = Math.sin(2 * Math.PI * 1000 * t)
      channelData[i] = (noise * 0.3 + tone * 0.7) * envelope * 0.2
    }

    return buffer
  }

  // Play session complete sound
  async playSessionComplete(volume: number = 50): Promise<void> {
    if (!this.isInitialized) await this.initialize()
    if (!this.audioContext || !this.sounds.sessionComplete || !this.gainNode) return

    try {
      const source = this.audioContext.createBufferSource()
      source.buffer = this.sounds.sessionComplete
      source.connect(this.gainNode)
      this.gainNode.gain.value = volume / 100
      source.start(0)
    } catch (error) {
      console.error('Failed to play session complete sound:', error)
    }
  }

  // Play tick sound
  async playTick(volume: number = 30): Promise<void> {
    if (!this.isInitialized) await this.initialize()
    if (!this.audioContext || !this.sounds.tick || !this.gainNode) return

    try {
      const source = this.audioContext.createBufferSource()
      source.buffer = this.sounds.tick
      source.connect(this.gainNode)
      this.gainNode.gain.value = volume / 100
      source.start(0)
    } catch (error) {
      console.error('Failed to play tick sound:', error)
    }
  }

  // Show browser notification
  async showNotification(title: string, body: string, icon?: string): Promise<void> {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'pomodoro-timer',
        requireInteraction: false,
        silent: false
      })

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000)
    } catch (error) {
      console.error('Failed to show notification:', error)
    }
  }

  // Cleanup
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.sounds = { sessionComplete: null, tick: null }
    this.gainNode = null
    this.isInitialized = false
  }
}

// Singleton instance
export const pomodoroAudio = new PomodoroAudioManager()

// Helper functions for notifications
export const notifySessionComplete = async (
  sessionType: 'work' | 'shortBreak' | 'longBreak',
  settings: { soundEnabled: boolean; soundVolume: number; notificationsEnabled: boolean }
) => {
  // Play sound
  if (settings.soundEnabled) {
    await pomodoroAudio.playSessionComplete(settings.soundVolume)
  }

  // Show notification
  if (settings.notificationsEnabled) {
    const titles = {
      work: '🍅 Pomodoro Complete!',
      shortBreak: '☕ Break Time Over',
      longBreak: '🌟 Long Break Complete'
    }

    const bodies = {
      work: 'Great work! Time for a short break.',
      shortBreak: 'Ready to get back to work?',
      longBreak: 'Feeling refreshed? Let\'s continue!'
    }

    await pomodoroAudio.showNotification(
      titles[sessionType],
      bodies[sessionType]
    )
  }
}

export const playTickSound = async (volume: number) => {
  await pomodoroAudio.playTick(volume)
}