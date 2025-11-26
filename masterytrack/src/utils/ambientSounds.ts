/**
 * Ambient Sound Generator using Web Audio API
 * Generates focus-enhancing sounds procedurally - no external files needed!
 */

export type SoundType = 'rain' | 'whitenoise' | 'brownnoise' | 'pinknoise' | 'ocean' | 'fire' | 'wind'

export interface SoundInfo {
  id: SoundType
  name: string
  icon: string
  description: string
  color: string
}

export const AMBIENT_SOUNDS: SoundInfo[] = [
  {
    id: 'rain',
    name: 'Rain',
    icon: '🌧️',
    description: 'Gentle rainfall',
    color: '#4a90d9',
  },
  {
    id: 'whitenoise',
    name: 'White Noise',
    icon: '📻',
    description: 'Classic focus noise',
    color: '#888888',
  },
  {
    id: 'brownnoise',
    name: 'Brown Noise',
    icon: '🔊',
    description: 'Deep, warm noise',
    color: '#8B4513',
  },
  {
    id: 'pinknoise',
    name: 'Pink Noise',
    icon: '🎀',
    description: 'Balanced, natural',
    color: '#FF69B4',
  },
  {
    id: 'ocean',
    name: 'Ocean Waves',
    icon: '🌊',
    description: 'Rolling waves',
    color: '#006994',
  },
  {
    id: 'fire',
    name: 'Fireplace',
    icon: '🔥',
    description: 'Crackling fire',
    color: '#FF4500',
  },
  {
    id: 'wind',
    name: 'Wind',
    icon: '💨',
    description: 'Gentle breeze',
    color: '#87CEEB',
  },
]

export class AmbientSoundGenerator {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private activeNodes: AudioNode[] = []
  private currentSound: SoundType | null = null
  private isPlaying = false
  private volume = 0.5

  constructor() {
    // AudioContext will be created on first user interaction
  }

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.connect(this.audioContext.destination)
      this.masterGain.gain.value = this.volume
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  private cleanup() {
    this.activeNodes.forEach(node => {
      try {
        node.disconnect()
      } catch (e) {
        // Node might already be disconnected
      }
    })
    this.activeNodes = []
  }

  private createNoiseBuffer(type: 'white' | 'pink' | 'brown'): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized')
    
    const bufferSize = 2 * this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const output = buffer.getChannelData(0)

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
        b6 = white * 0.115926
      }
    } else if (type === 'brown') {
      let lastOut = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        output[i] = (lastOut + 0.02 * white) / 1.02
        lastOut = output[i]
        output[i] *= 3.5
      }
    }

    return buffer
  }

  private createWhiteNoise() {
    if (!this.audioContext || !this.masterGain) return

    const buffer = this.createNoiseBuffer('white')
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 8000

    source.connect(filter)
    filter.connect(this.masterGain)
    source.start()

    this.activeNodes.push(source, filter)
  }

  private createBrownNoise() {
    if (!this.audioContext || !this.masterGain) return

    const buffer = this.createNoiseBuffer('brown')
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true

    source.connect(this.masterGain)
    source.start()

    this.activeNodes.push(source)
  }

  private createPinkNoise() {
    if (!this.audioContext || !this.masterGain) return

    const buffer = this.createNoiseBuffer('pink')
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true

    source.connect(this.masterGain)
    source.start()

    this.activeNodes.push(source)
  }

  private createRain() {
    if (!this.audioContext || !this.masterGain) return

    // Base rain noise (filtered white noise)
    const bufferSize = 2 * this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const output = buffer.getChannelData(0)
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1
    }

    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true

    // Rain filter chain
    const highpass = this.audioContext.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 400

    const lowpass = this.audioContext.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 4000

    const gain = this.audioContext.createGain()
    gain.gain.value = 0.8

    source.connect(highpass)
    highpass.connect(lowpass)
    lowpass.connect(gain)
    gain.connect(this.masterGain)
    source.start()

    this.activeNodes.push(source, highpass, lowpass, gain)

    // Add occasional thunder rumble (very subtle)
    this.addThunderRumble()
  }

  private addThunderRumble() {
    if (!this.audioContext || !this.masterGain) return

    const scheduleRumble = () => {
      if (!this.isPlaying || this.currentSound !== 'rain') return

      const rumbleGain = this.audioContext!.createGain()
      const oscillator = this.audioContext!.createOscillator()
      
      oscillator.type = 'sine'
      oscillator.frequency.value = 40 + Math.random() * 30

      const filter = this.audioContext!.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 100

      rumbleGain.gain.value = 0
      rumbleGain.gain.setValueAtTime(0, this.audioContext!.currentTime)
      rumbleGain.gain.linearRampToValueAtTime(0.15, this.audioContext!.currentTime + 0.5)
      rumbleGain.gain.linearRampToValueAtTime(0, this.audioContext!.currentTime + 3)

      oscillator.connect(filter)
      filter.connect(rumbleGain)
      rumbleGain.connect(this.masterGain!)
      
      oscillator.start()
      oscillator.stop(this.audioContext!.currentTime + 3.5)

      // Schedule next rumble randomly between 15-45 seconds
      setTimeout(scheduleRumble, 15000 + Math.random() * 30000)
    }

    // Start first rumble after 10-20 seconds
    setTimeout(scheduleRumble, 10000 + Math.random() * 10000)
  }

  private createOcean() {
    if (!this.audioContext || !this.masterGain) return

    // Create wave-like sound using modulated noise
    const buffer = this.createNoiseBuffer('brown')
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true

    // Low-frequency oscillator for wave motion
    const lfo = this.audioContext.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.1 // Very slow oscillation

    const lfoGain = this.audioContext.createGain()
    lfoGain.gain.value = 0.3

    const waveGain = this.audioContext.createGain()
    waveGain.gain.value = 0.5

    // Filter for ocean sound
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 800

    lfo.connect(lfoGain)
    lfoGain.connect(waveGain.gain)

    source.connect(filter)
    filter.connect(waveGain)
    waveGain.connect(this.masterGain)
    
    lfo.start()
    source.start()

    this.activeNodes.push(source, lfo, lfoGain, waveGain, filter)
  }

  private createFire() {
    if (!this.audioContext || !this.masterGain) return

    // Crackling fire = filtered noise with random pops
    const bufferSize = 2 * this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const output = buffer.getChannelData(0)
    
    // Create crackling pattern
    for (let i = 0; i < bufferSize; i++) {
      const noise = Math.random() * 2 - 1
      // Add occasional pops
      const pop = Math.random() > 0.9997 ? (Math.random() * 0.5) : 0
      output[i] = noise * 0.3 + pop
    }

    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true

    // Fire filter chain
    const highpass = this.audioContext.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 200

    const lowpass = this.audioContext.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 3000

    const gain = this.audioContext.createGain()
    gain.gain.value = 0.7

    source.connect(highpass)
    highpass.connect(lowpass)
    lowpass.connect(gain)
    gain.connect(this.masterGain)
    source.start()

    this.activeNodes.push(source, highpass, lowpass, gain)
  }

  private createWind() {
    if (!this.audioContext || !this.masterGain) return

    const buffer = this.createNoiseBuffer('pink')
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true

    // LFO for wind gusts
    const lfo = this.audioContext.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.15

    const lfoGain = this.audioContext.createGain()
    lfoGain.gain.value = 0.4

    const windGain = this.audioContext.createGain()
    windGain.gain.value = 0.3

    // Wind filter
    const filter = this.audioContext.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 500
    filter.Q.value = 0.5

    lfo.connect(lfoGain)
    lfoGain.connect(windGain.gain)

    source.connect(filter)
    filter.connect(windGain)
    windGain.connect(this.masterGain)
    
    lfo.start()
    source.start()

    this.activeNodes.push(source, lfo, lfoGain, windGain, filter)
  }

  play(soundType: SoundType) {
    this.initAudioContext()
    this.stop()
    
    this.currentSound = soundType
    this.isPlaying = true

    switch (soundType) {
      case 'whitenoise':
        this.createWhiteNoise()
        break
      case 'brownnoise':
        this.createBrownNoise()
        break
      case 'pinknoise':
        this.createPinkNoise()
        break
      case 'rain':
        this.createRain()
        break
      case 'ocean':
        this.createOcean()
        break
      case 'fire':
        this.createFire()
        break
      case 'wind':
        this.createWind()
        break
    }
  }

  stop() {
    this.isPlaying = false
    this.currentSound = null
    this.cleanup()
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value))
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume
    }
  }

  getVolume(): number {
    return this.volume
  }

  getCurrentSound(): SoundType | null {
    return this.currentSound
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  toggle(soundType: SoundType) {
    if (this.isPlaying && this.currentSound === soundType) {
      this.stop()
    } else {
      this.play(soundType)
    }
  }
}

// Singleton instance
let instance: AmbientSoundGenerator | null = null

export function getAmbientSoundGenerator(): AmbientSoundGenerator {
  if (!instance) {
    instance = new AmbientSoundGenerator()
  }
  return instance
}


