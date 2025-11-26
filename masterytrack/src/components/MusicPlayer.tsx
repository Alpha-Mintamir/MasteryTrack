import { useEffect, useState, useCallback } from 'react'
import { getAmbientSoundGenerator, AMBIENT_SOUNDS, type SoundType } from '../utils/ambientSounds'
import type { AppSettings } from '../types'

interface Props {
  settings?: AppSettings
  timerRunning: boolean
  onVolumeChange?: (volume: number) => void
}

export const MusicPlayer = ({ settings, timerRunning, onVolumeChange }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentSound, setCurrentSound] = useState<SoundType | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [initialized, setInitialized] = useState(false)

  const generator = getAmbientSoundGenerator()

  // Define handlers first
  const handlePlay = useCallback((soundType: SoundType) => {
    generator.play(soundType)
    setCurrentSound(soundType)
    setIsPlaying(true)
  }, [generator])

  const handleStop = useCallback(() => {
    generator.stop()
    setCurrentSound(null)
    setIsPlaying(false)
  }, [generator])

  const handleToggle = useCallback((soundType: SoundType) => {
    if (currentSound === soundType && isPlaying) {
      handleStop()
    } else {
      handlePlay(soundType)
    }
  }, [currentSound, isPlaying, handlePlay, handleStop])

  // Initialize volume from settings
  useEffect(() => {
    if (!initialized && settings) {
      const vol = settings.music_volume ?? 0.5
      setVolume(vol)
      generator.setVolume(vol)
      setInitialized(true)
    }
  }, [settings, initialized, generator])

  // Auto-play when timer starts, auto-stop when timer stops
  useEffect(() => {
    if (!settings?.music_enabled) return
    
    if (settings.music_auto_play && timerRunning && !isPlaying) {
      // Auto-start with rain by default
      handlePlay('rain')
    }
    
    // Auto-stop when timer stops
    if (!timerRunning && isPlaying) {
      handleStop()
    }
  }, [timerRunning, settings?.music_enabled, settings?.music_auto_play, isPlaying, handlePlay, handleStop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      generator.stop()
    }
  }, [generator])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    generator.setVolume(newVolume)
    
    // Save to backend (debounced in parent)
    if (onVolumeChange) {
      onVolumeChange(newVolume)
    }
  }, [generator, onVolumeChange])

  if (!settings?.music_enabled) {
    return null
  }

  const currentSoundInfo = AMBIENT_SOUNDS.find(s => s.id === currentSound)

  return (
    <>
      {/* Floating button when collapsed */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isPlaying 
              ? (currentSoundInfo?.color || '#00d4ff')
              : 'var(--card-bg, #1a1a2e)',
            boxShadow: isPlaying
              ? `0 4px 20px ${currentSoundInfo?.color || '#00d4ff'}66`
              : '0 4px 20px rgba(0, 0, 0, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            transition: 'all 0.3s ease',
            zIndex: 1000,
            animation: isPlaying ? 'pulse-glow 2s ease-in-out infinite' : 'none',
          }}
          title={isPlaying ? `Playing: ${currentSoundInfo?.name}` : 'Open Ambient Sounds'}
        >
          {isPlaying ? currentSoundInfo?.icon : '🎵'}
        </button>
      )}

      {/* Expanded panel */}
      {isExpanded && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '320px',
            backgroundColor: 'var(--card-bg, #1a1a2e)',
            borderRadius: '20px',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
            overflow: 'hidden',
            border: '1px solid var(--border-color, #2d2d44)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: isPlaying 
                ? `linear-gradient(135deg, ${currentSoundInfo?.color}33 0%, transparent 100%)`
                : 'transparent',
              borderBottom: '1px solid var(--border-color, #2d2d44)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>
                {isPlaying ? currentSoundInfo?.icon : '🎧'}
              </span>
              <div>
                <div style={{ 
                  fontWeight: '700', 
                  fontSize: '16px',
                  color: 'var(--text-color, #fff)',
                }}>
                  {isPlaying ? currentSoundInfo?.name : 'Ambient Sounds'}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: 'var(--muted-color, #888)',
                }}>
                  {isPlaying ? currentSoundInfo?.description : 'Focus-enhancing audio'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                width: '32px',
                height: '32px',
                border: 'none',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                color: 'var(--text-color, #fff)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            >
              ✕
            </button>
          </div>

          {/* Sound Grid */}
          <div
            style={{
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
            }}
          >
            {AMBIENT_SOUNDS.map((sound) => {
              const isActive = currentSound === sound.id && isPlaying
              return (
                <button
                  key={sound.id}
                  onClick={() => handleToggle(sound.id)}
                  style={{
                    padding: '14px 8px',
                    border: isActive ? `2px solid ${sound.color}` : '2px solid transparent',
                    borderRadius: '12px',
                    backgroundColor: isActive 
                      ? `${sound.color}22`
                      : 'rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                      e.currentTarget.style.transform = 'scale(1.02)'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                      e.currentTarget.style.transform = 'scale(1)'
                    }
                  }}
                >
                  <span style={{ 
                    fontSize: '24px',
                    filter: isActive ? 'none' : 'grayscale(30%)',
                  }}>
                    {sound.icon}
                  </span>
                  <span style={{ 
                    fontSize: '11px',
                    fontWeight: isActive ? '600' : '400',
                    color: isActive ? sound.color : 'var(--text-color, #fff)',
                  }}>
                    {sound.name}
                  </span>
                </button>
              )
            })}
            
            {/* Stop button */}
            {isPlaying && (
              <button
                onClick={handleStop}
                style={{
                  padding: '14px 8px',
                  border: '2px solid #ff4757',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 71, 87, 0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 71, 87, 0.2)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 71, 87, 0.1)'
                }}
              >
                <span style={{ fontSize: '24px' }}>⏹️</span>
                <span style={{ 
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#ff4757',
                }}>
                  Stop
                </span>
              </button>
            )}
          </div>

          {/* Volume Control */}
          <div
            style={{
              padding: '12px 20px 20px',
              borderTop: '1px solid var(--border-color, #2d2d44)',
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
            }}>
              <span style={{ fontSize: '18px' }}>
                {volume === 0 ? '🔇' : volume < 0.3 ? '🔈' : volume < 0.7 ? '🔉' : '🔊'}
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                style={{ 
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  accentColor: currentSoundInfo?.color || 'var(--primary-color, #00d4ff)',
                }}
              />
              <span style={{ 
                fontSize: '13px', 
                color: 'var(--muted-color, #888)', 
                width: '40px', 
                textAlign: 'right',
                fontFamily: 'monospace',
              }}>
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          {/* Footer tip */}
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(0, 212, 255, 0.05)',
              fontSize: '11px',
              color: 'var(--muted-color, #666)',
              textAlign: 'center',
            }}
          >
            💡 All sounds generated in-app • No internet needed
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 4px 20px ${currentSoundInfo?.color || '#00d4ff'}44;
          }
          50% { 
            box-shadow: 0 4px 30px ${currentSoundInfo?.color || '#00d4ff'}88;
          }
        }
      `}</style>
    </>
  )
}
