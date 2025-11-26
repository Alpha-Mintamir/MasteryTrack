import { useEffect, useState } from 'react'

export const SplashScreen = () => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Hide splash after app loads (2 seconds)
    const timer = setTimeout(() => {
      setVisible(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--bg, #05070f)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      animation: 'fadeOut 0.5s ease-out 1.5s forwards',
    }}>
      <style>{`
        @keyframes fadeOut {
          to {
            opacity: 0;
            visibility: hidden;
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      
      {/* Logo/Icon */}
      <div style={{
        width: '120px',
        height: '120px',
        marginBottom: '30px',
        position: 'relative',
        animation: 'pulse 2s ease-in-out infinite',
      }}>
        {/* Progress ring icon */}
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: 'absolute' }}>
          <circle
            cx="60"
            cy="60"
            r="55"
            fill="none"
            stroke="var(--accent, #5ad1ff)"
            strokeWidth="4"
            opacity="0.2"
          />
          <circle
            cx="60"
            cy="60"
            r="55"
            fill="none"
            stroke="var(--accent, #5ad1ff)"
            strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 55}`}
            strokeDashoffset={`${2 * Math.PI * 55 * 0.85}`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            style={{
              animation: 'spin 3s linear infinite',
            }}
          />
          <circle
            cx="60"
            cy="60"
            r="35"
            fill="var(--surface, #0f1424)"
          />
          {/* Hourglass icon */}
          <path
            d="M 40 30 L 80 30 L 70 45 L 50 45 L 50 55 L 70 55 L 80 70 L 40 70 Z"
            fill="var(--accent, #5ad1ff)"
          />
        </svg>
      </div>

      {/* App Name */}
      <h1 style={{
        fontSize: '36px',
        fontWeight: '700',
        color: 'var(--text, #f5f7ff)',
        margin: '0 0 10px 0',
        letterSpacing: '-0.5px',
      }}>
        MasteryTrack
      </h1>

      {/* Tagline */}
      <p style={{
        fontSize: '16px',
        color: 'var(--text-muted, #9aa4c3)',
        margin: '0 0 40px 0',
      }}>
        10,000 Hours to Mastery
      </p>

      {/* Loading indicator */}
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent, #5ad1ff)',
          animation: 'pulse 1.4s ease-in-out infinite',
        }}></div>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent, #5ad1ff)',
          animation: 'pulse 1.4s ease-in-out infinite 0.2s',
        }}></div>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent, #5ad1ff)',
          animation: 'pulse 1.4s ease-in-out infinite 0.4s',
        }}></div>
      </div>
    </div>
  )
}




