import { useEffect, useState, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface ScreenshotInfo {
  filename: string
  path: string
  timestamp: string
  size_kb: number
  imageData?: string // base64 data URL
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export const ScreenshotGallery = ({ isOpen, onClose }: Props) => {
  const [screenshots, setScreenshots] = useState<ScreenshotInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<ScreenshotInfo | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const loadScreenshots = useCallback(async () => {
    setLoading(true)
    try {
      const result = await invoke<ScreenshotInfo[]>('list_screenshots')
      
      // Load image data for each screenshot
      const screenshotsWithImages = await Promise.all(
        result.map(async (screenshot) => {
          try {
            const imageData = await invoke<string>('read_screenshot_base64', { path: screenshot.path })
            return { ...screenshot, imageData }
          } catch (error) {
            console.error('Failed to load image:', screenshot.path, error)
            return screenshot
          }
        })
      )
      
      setScreenshots(screenshotsWithImages)
    } catch (error) {
      console.error('Failed to load screenshots:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadScreenshots()
    }
  }, [isOpen, loadScreenshots])

  const handleDelete = async (screenshot: ScreenshotInfo, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete screenshot from ${screenshot.timestamp}?`)) return
    
    setDeleting(screenshot.path)
    try {
      await invoke('delete_screenshot', { path: screenshot.path })
      setScreenshots(prev => prev.filter(s => s.path !== screenshot.path))
      if (selectedImage?.path === screenshot.path) {
        setSelectedImage(null)
      }
    } catch (error) {
      console.error('Failed to delete screenshot:', error)
    } finally {
      setDeleting(null)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const [date, time] = timestamp.split(' ')
    return { date, time }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 2000,
          animation: 'fadeIn 0.2s ease',
        }}
        onClick={onClose}
      />

      {/* Gallery Panel */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '1200px',
          height: '85vh',
          backgroundColor: 'var(--card-bg, #0d0d1a)',
          borderRadius: '24px',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)',
          zIndex: 2001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border-color, #1a1a2e)',
          animation: 'slideUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color, #1a1a2e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(0, 212, 255, 0.05) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '32px' }}>📸</span>
            <div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '24px', 
                fontWeight: '700',
                color: 'var(--text-color, #fff)',
              }}>
                Screenshot Gallery
              </h2>
              <p style={{ 
                margin: '4px 0 0', 
                fontSize: '14px', 
                color: 'var(--muted-color, #888)',
              }}>
                {screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''} captured during practice
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* View Mode Toggle */}
            <div style={{
              display: 'flex',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              padding: '4px',
            }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: viewMode === 'grid' ? 'var(--primary-color, #00d4ff)' : 'transparent',
                  color: viewMode === 'grid' ? '#000' : 'var(--text-color, #fff)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
              >
                ▦ Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: viewMode === 'list' ? 'var(--primary-color, #00d4ff)' : 'transparent',
                  color: viewMode === 'list' ? '#000' : 'var(--text-color, #fff)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
              >
                ☰ List
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={loadScreenshots}
              style={{
                padding: '10px',
                border: 'none',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-color, #fff)',
                cursor: 'pointer',
                fontSize: '18px',
                transition: 'background-color 0.2s',
              }}
              title="Refresh"
            >
              🔄
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              style={{
                padding: '10px 14px',
                border: 'none',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 71, 87, 0.1)',
                color: '#ff4757',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'background-color 0.2s',
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
          }}
        >
          {loading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '16px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid var(--border-color, #1a1a2e)',
                borderTopColor: 'var(--primary-color, #00d4ff)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <p style={{ color: 'var(--muted-color, #888)' }}>Loading screenshots...</p>
            </div>
          ) : screenshots.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '16px',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '64px', opacity: 0.5 }}>📷</span>
              <h3 style={{ 
                margin: 0, 
                color: 'var(--text-color, #fff)',
                fontSize: '20px',
              }}>
                No screenshots yet
              </h3>
              <p style={{ 
                margin: 0, 
                color: 'var(--muted-color, #888)',
                maxWidth: '300px',
              }}>
                Screenshots are automatically captured during practice sessions when enabled in settings.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px',
              }}
            >
              {screenshots.map((screenshot) => {
                const { date, time } = formatTimestamp(screenshot.timestamp)
                return (
                  <div
                    key={screenshot.path}
                    onClick={() => setSelectedImage(screenshot)}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      border: '1px solid var(--border-color, #1a1a2e)',
                      position: 'relative',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 212, 255, 0.15)'
                      e.currentTarget.style.borderColor = 'var(--primary-color, #00d4ff)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.borderColor = 'var(--border-color, #1a1a2e)'
                    }}
                  >
                    {/* Image */}
                    <div style={{
                      aspectRatio: '16/9',
                      backgroundColor: '#000',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {screenshot.imageData ? (
                        <img
                          src={screenshot.imageData}
                          alt={screenshot.filename}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <span style={{ color: '#666', fontSize: '12px' }}>Loading...</span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <div>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--text-color, #fff)',
                          }}>
                            📅 {date}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--muted-color, #888)',
                            marginTop: '2px',
                          }}>
                            🕐 {time} • {screenshot.size_kb} KB
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDelete(screenshot, e)}
                          disabled={deleting === screenshot.path}
                          style={{
                            padding: '8px',
                            border: 'none',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255, 71, 87, 0.1)',
                            color: '#ff4757',
                            cursor: deleting === screenshot.path ? 'wait' : 'pointer',
                            fontSize: '14px',
                            opacity: deleting === screenshot.path ? 0.5 : 1,
                            transition: 'background-color 0.2s',
                          }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* List View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {screenshots.map((screenshot) => {
                const { date, time } = formatTimestamp(screenshot.timestamp)
                return (
                  <div
                    key={screenshot.path}
                    onClick={() => setSelectedImage(screenshot)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '12px 16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: '1px solid var(--border-color, #1a1a2e)',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'
                      e.currentTarget.style.borderColor = 'var(--primary-color, #00d4ff)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'
                      e.currentTarget.style.borderColor = 'var(--border-color, #1a1a2e)'
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      width: '120px',
                      height: '68px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#000',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {screenshot.imageData ? (
                        <img
                          src={screenshot.imageData}
                          alt={screenshot.filename}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <span style={{ color: '#666', fontSize: '10px' }}>...</span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-color, #fff)',
                      }}>
                        {date} at {time}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--muted-color, #888)',
                        marginTop: '4px',
                      }}>
                        {screenshot.size_kb} KB • {screenshot.filename}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={(e) => handleDelete(screenshot, e)}
                      disabled={deleting === screenshot.path}
                      style={{
                        padding: '10px',
                        border: 'none',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 71, 87, 0.1)',
                        color: '#ff4757',
                        cursor: deleting === screenshot.path ? 'wait' : 'pointer',
                        fontSize: '16px',
                        opacity: deleting === screenshot.path ? 0.5 : 1,
                      }}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for selected image */}
      {selectedImage && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              zIndex: 3000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={() => setSelectedImage(null)}
          >
            {selectedImage.imageData ? (
              <img
                src={selectedImage.imageData}
                alt={selectedImage.filename}
                style={{
                  maxWidth: '95%',
                  maxHeight: '90vh',
                  borderRadius: '12px',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div style={{ color: '#fff', fontSize: '18px' }}>Loading image...</div>
            )}

            {/* Close button */}
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '12px 20px',
                border: 'none',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                backdropFilter: 'blur(10px)',
              }}
            >
              ✕ Close
            </button>

            {/* Info bar */}
            <div
              style={{
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '12px 24px',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <span>📅 {selectedImage.timestamp}</span>
              <span>•</span>
              <span>📦 {selectedImage.size_kb} KB</span>
              <button
                onClick={(e) => {
                  handleDelete(selectedImage, e)
                }}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 71, 87, 0.2)',
                  color: '#ff4757',
                  cursor: 'pointer',
                  fontSize: '13px',
                  marginLeft: '8px',
                }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to { 
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}

