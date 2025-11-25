import { useEffect, useState } from 'react'
import type { AppSettings } from '../types'

interface Props {
  settings?: AppSettings
  onSave: (settings: AppSettings) => Promise<void>
  onExport: (format: 'csv' | 'json') => Promise<string>
  exporting: boolean
  lastExportPath?: string
}

export const SettingsPanel = ({
  settings,
  onSave,
  onExport,
  exporting,
  lastExportPath,
}: Props) => {
  const [draft, setDraft] = useState<AppSettings | undefined>(settings)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

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
            onChange={(e) =>
              setDraft({ ...draft, productivity_mode_enabled: e.target.checked })
            }
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

      <div className="actions-row">
        <button className="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {message && <span className="muted">{message}</span>}
      </div>

      <div className="export-row">
        <div>
          <h4>Data Export</h4>
          <p className="muted">Download your sessions as CSV or JSON.</p>
          {lastExportPath && <code className="truncate">{lastExportPath}</code>}
        </div>
        <div className="export-buttons">
          <button disabled={exporting} onClick={() => handleExport('csv')}>
            Export CSV
          </button>
          <button disabled={exporting} onClick={() => handleExport('json')}>
            Export JSON
          </button>
        </div>
      </div>
    </div>
  )
}
