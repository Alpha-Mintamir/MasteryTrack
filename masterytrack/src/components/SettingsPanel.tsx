import { useEffect, useState } from 'react'
import type { AppSettings } from '../types'
import { PLAYLISTS, type PlaylistType } from '../utils/playlists'

interface Props {
  settings?: AppSettings
  onSave: (settings: AppSettings) => Promise<void>
  onExport: (format: 'csv' | 'json') => Promise<string>
  onImport?: (file: File) => Promise<void>
  exporting: boolean
  importing?: boolean
  lastExportPath?: string
}

export const SettingsPanel = ({
  settings,
  onSave,
  onExport,
  onImport,
  exporting,
  importing = false,
  lastExportPath,
}: Props) => {
  // Initialize draft from settings ONLY on first load
  const [draft, setDraft] = useState<AppSettings | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Only sync from props on initial load (when draft is not yet set)
  useEffect(() => {
    if (settings && !initialized) {
      setDraft(settings)
      setInitialized(true)
    }
  }, [settings, initialized])

  if (!draft) {
    return (
      <div className="card settings-card">
        <p>Loading settings…</p>
      </div>
    )
  }

  const parseList = (value: string) =>
    value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(draft)
      setMessage('Settings saved.')
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async (format: 'csv' | 'json') => {
    const path = await onExport(format)
    setMessage(`Exported to ${path}`)
    setTimeout(() => setMessage(null), 4000)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !onImport) return

    try {
      await onImport(file)
      setMessage('Data imported successfully!')
      setTimeout(() => setMessage(null), 4000)
      // Reset file input
      event.target.value = ''
    } catch (err) {
      console.error('Import failed:', err)
      setMessage(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setTimeout(() => setMessage(null), 5000)
      event.target.value = ''
    }
  }

  return (
    <div className="card settings-card">
      <header>
        <div>
          <h3>Practice Settings</h3>
          <p className="muted">Fine-tune goals, idle detection, and focus mode.</p>
        </div>
      </header>

      <div className="grid two">
        <label>
          Target Skill
          <input
            value={draft.skill_name}
            onChange={(e) => setDraft({ ...draft, skill_name: e.target.value })}
          />
        </label>
        <label>
          Daily Goal (minutes)
          <input
            type="number"
            min={15}
            value={draft.daily_goal_minutes}
            onChange={(e) =>
              setDraft({ ...draft, daily_goal_minutes: Number(e.target.value) })
            }
          />
        </label>
      </div>

      <div className="grid two">
        <label>
          Idle timeout (minutes)
          <input
            type="number"
            min={1}
            value={draft.idle_timeout_minutes}
            onChange={(e) =>
              setDraft({ ...draft, idle_timeout_minutes: Number(e.target.value) })
            }
          />
        </label>
        <label className="toggle-row">
          <span>Productivity mode</span>
          <input
            type="checkbox"
            checked={draft.productivity_mode_enabled}
            onChange={async (e) => {
              const newValue = e.target.checked
              const updated = { ...draft, productivity_mode_enabled: newValue }
              
              // Update UI immediately (optimistic update)
              setDraft(updated)
              
              try {
                await onSave(updated)
                setMessage('Settings saved.')
                setTimeout(() => setMessage(null), 2000)
              } catch (err) {
                console.error('Failed to save productivity mode:', err)
                setMessage('Failed to save. Please try again.')
                setTimeout(() => setMessage(null), 3000)
                // Revert on error
                setDraft({ ...draft, productivity_mode_enabled: !newValue })
              }
            }}
          />
        </label>
      </div>

      <label>
        Allow only when these apps are active
        <textarea
          rows={2}
          placeholder="e.g. code, figma"
          value={draft.allowed_apps.join('\n')}
          onChange={(e) => setDraft({ ...draft, allowed_apps: parseList(e.target.value) })}
        />
      </label>

      <label>
        Pause when these apps appear
        <textarea
          rows={2}
          placeholder="e.g. youtube, netflix"
          value={draft.blocked_apps.join('\n')}
          onChange={(e) => setDraft({ ...draft, blocked_apps: parseList(e.target.value) })}
        />
      </label>

      <label>
        Auto-backup folder
        <input
          placeholder="/path/to/backups"
          value={draft.auto_backup_path ?? ''}
          onChange={(e) => setDraft({ ...draft, auto_backup_path: e.target.value })}
        />
      </label>

      <div className="section-divider"></div>

      <div className="screenshot-section">
        <header>
          <div>
            <h4>Screenshot Capture</h4>
            <p className="muted">
              Automatically capture screenshots during practice sessions for progress tracking.
            </p>
          </div>
        </header>

        <div className="privacy-warning" style={{
          padding: '12px',
          backgroundColor: 'var(--warning-bg, rgba(255, 193, 7, 0.1))',
          border: '1px solid var(--warning-border, rgba(255, 193, 7, 0.3))',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <strong>⚠️ Privacy Notice:</strong> When enabled, this feature will automatically capture
          screenshots of your screen every 10-20 minutes while the timer is running. Screenshots are
          stored locally and can be reviewed or deleted at any time. Only enable this if you're
          comfortable with automatic screen capture.
        </div>

        <label className="toggle-row">
          <span>Enable screenshot capture</span>
          <input
            type="checkbox"
            checked={draft.screenshot_enabled}
            onChange={async (e) => {
              const newValue = e.target.checked
              const updated = { ...draft, screenshot_enabled: newValue }
              
              // Update UI immediately (optimistic update)
              setDraft(updated)
              
              try {
                await onSave(updated)
                setMessage('Settings saved.')
                setTimeout(() => setMessage(null), 2000)
              } catch (err) {
                console.error('Failed to save screenshot setting:', err)
                setMessage('Failed to save. Please try again.')
                setTimeout(() => setMessage(null), 3000)
                // Revert on error
                setDraft({ ...draft, screenshot_enabled: !newValue })
              }
            }}
          />
        </label>

        {draft.screenshot_enabled && (
          <>
            <label>
              Storage folder (leave empty for default)
              <input
                placeholder="Default: app data folder/screenshots"
                value={draft.screenshot_storage_path ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    screenshot_storage_path: e.target.value || undefined,
                  })
                }
              />
              <small className="muted">
                Screenshots are compressed JPEG files (~100-500 KB each)
              </small>
            </label>

            <label>
              Retention period (days)
              <input
                type="number"
                min={1}
                max={365}
                value={draft.screenshot_retention_days}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    screenshot_retention_days: Number(e.target.value),
                  })
                }
              />
              <small className="muted">
                Screenshots older than this will be automatically deleted
              </small>
            </label>

            <div className="info-box" style={{
              padding: '10px',
              backgroundColor: 'var(--info-bg, rgba(33, 150, 243, 0.1))',
              borderRadius: '4px',
              fontSize: '0.9em',
              marginTop: '8px'
            }}>
              <strong>How it works:</strong> Screenshots are captured randomly every 10-20 minutes
              (average ~15 minutes) only when the practice timer is running and not paused. Old
              screenshots are cleaned up automatically based on your retention setting.
            </div>
          </>
        )}
      </div>

      <div className="section-divider"></div>

      <div className="music-section">
        <header>
          <div>
            <h4>Focus Music</h4>
            <p className="muted">
              Play curated YouTube playlists to enhance focus and concentration during practice.
            </p>
          </div>
        </header>

        <label className="toggle-row">
          <span>Enable focus music</span>
          <input
            type="checkbox"
            checked={draft.music_enabled ?? false}
            onChange={async (e) => {
              const newValue = e.target.checked
              const updated = { ...draft, music_enabled: newValue }
              
              // Update UI immediately (optimistic update)
              setDraft(updated)
              
              try {
                await onSave(updated)
                setMessage('Settings saved.')
                setTimeout(() => setMessage(null), 2000)
              } catch (err) {
                console.error('Failed to save music setting:', err)
                setMessage('Failed to save. Please try again.')
                setTimeout(() => setMessage(null), 3000)
                // Revert on error
                setDraft({ ...draft, music_enabled: !newValue })
              }
            }}
          />
        </label>

        {draft.music_enabled && (
          <>
            <label>
              Playlist Type
              <select
                value={draft.music_playlist_type ?? 'focus'}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    music_playlist_type: e.target.value,
                    music_custom_playlist_url: e.target.value !== 'custom' ? undefined : draft.music_custom_playlist_url,
                  })
                }
              >
                {Object.values(PLAYLISTS)
                  .filter((p) => p.type !== 'custom')
                  .map((playlist) => (
                    <option key={playlist.type} value={playlist.type}>
                      {playlist.name}
                    </option>
                  ))}
                <option value="custom">Custom Playlist</option>
              </select>
              <small className="muted">
                {draft.music_playlist_type && PLAYLISTS[draft.music_playlist_type as PlaylistType]?.description}
              </small>
            </label>

            {draft.music_playlist_type === 'custom' && (
              <label>
                Custom YouTube Playlist URL
                <input
                  type="text"
                  placeholder="https://www.youtube.com/playlist?list=..."
                  value={draft.music_custom_playlist_url ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      music_custom_playlist_url: e.target.value || undefined,
                    })
                  }
                />
                <small className="muted">
                  Paste a YouTube playlist URL or video URL
                </small>
              </label>
            )}

            <label>
              Volume
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={draft.music_volume ?? 0.5}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      music_volume: parseFloat(e.target.value),
                    })
                  }
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '12px', color: 'var(--muted-color, #666)', width: '50px', textAlign: 'right' }}>
                  {Math.round((draft.music_volume ?? 0.5) * 100)}%
                </span>
              </div>
            </label>

            <label className="toggle-row">
              <span>Auto-play when timer starts</span>
              <input
                type="checkbox"
                checked={draft.music_auto_play ?? false}
                onChange={(e) =>
                  setDraft({ ...draft, music_auto_play: e.target.checked })
                }
              />
            </label>

            <div className="info-box" style={{
              padding: '10px',
              backgroundColor: 'var(--info-bg, rgba(33, 150, 243, 0.1))',
              borderRadius: '4px',
              fontSize: '0.9em',
              marginTop: '8px'
            }}>
              <strong>How it works:</strong> Music plays from YouTube playlists embedded in the app.
              The music player appears in the bottom-right corner when enabled. You can control
              playback and volume directly from the player.
            </div>
          </>
        )}
      </div>

      <div className="actions-row">
        <button className="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {message && <span className="muted">{message}</span>}
      </div>

      <div className="export-row">
        <div>
          <h4>Data Export & Import</h4>
          <p className="muted">
            Export your sessions and settings for backup or transfer to another PC.
            Import previously exported data to restore your progress.
          </p>
          {lastExportPath && <code className="truncate">{lastExportPath}</code>}
        </div>
        <div className="export-buttons">
          <button disabled={exporting} onClick={() => handleExport('csv')}>
            Export CSV
          </button>
          <button disabled={exporting} onClick={() => handleExport('json')}>
            Export JSON
          </button>
          {onImport && (
            <label className="import-button">
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleImport}
                disabled={importing}
                style={{ display: 'none' }}
              />
              <span style={{ cursor: importing ? 'not-allowed' : 'pointer' }}>
                {importing ? 'Importing...' : 'Import Data'}
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  )
}
