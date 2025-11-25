import { useEffect, useState } from 'react'
import type { AppSettings, SettingsUpdate } from '../types'

type Props = {
  settings?: AppSettings
  onSave: (payload: SettingsUpdate) => Promise<void>
  isSaving: boolean
}

export const SettingsPanel = ({ settings, onSave, isSaving }: Props) => {
  const [form, setForm] = useState({
    target_skill_name: '',
    daily_goal_minutes: 120,
    idle_timeout_minutes: 5,
    productivity_mode_enabled: false,
    productivity_allowlist: '',
    productivity_blocklist: '',
    auto_backup_path: '',
  })

  useEffect(() => {
    if (settings) {
      setForm({
        target_skill_name: settings.target_skill_name,
        daily_goal_minutes: settings.daily_goal_minutes,
        idle_timeout_minutes: settings.idle_timeout_minutes,
        productivity_mode_enabled: settings.productivity_mode_enabled,
        productivity_allowlist: settings.productivity_allowlist.join('\n'),
        productivity_blocklist: settings.productivity_blocklist.join('\n'),
        auto_backup_path: settings.auto_backup_path ?? '',
      })
    }
  }, [settings])

  const handleChange = (field: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const payload: SettingsUpdate = {
      target_skill_name: form.target_skill_name,
      daily_goal_minutes: Number(form.daily_goal_minutes),
      idle_timeout_minutes: Number(form.idle_timeout_minutes),
      productivity_mode_enabled: form.productivity_mode_enabled,
      productivity_allowlist: form.productivity_allowlist
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      productivity_blocklist: form.productivity_blocklist
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      auto_backup_path: form.auto_backup_path || null,
    }

    await onSave(payload)
  }

  return (
    <form className="card settings-card" onSubmit={handleSubmit}>
      <header>
        <h3>Settings</h3>
        <p className="muted">Tailor idle detection, goals, and productivity mode.</p>
      </header>
      <label>
        Skill name
        <input
          type="text"
          value={form.target_skill_name}
          onChange={(e) => handleChange('target_skill_name', e.target.value)}
          required
        />
      </label>
      <div className="grid two">
        <label>
          Daily goal (minutes)
          <input
            type="number"
            min={30}
            step={15}
            value={form.daily_goal_minutes}
            onChange={(e) => handleChange('daily_goal_minutes', Number(e.target.value))}
          />
        </label>
        <label>
          Idle timeout (minutes)
          <input
            type="number"
            min={1}
            value={form.idle_timeout_minutes}
            onChange={(e) => handleChange('idle_timeout_minutes', Number(e.target.value))}
          />
        </label>
      </div>
      <label className="switch">
        <input
          type="checkbox"
          checked={form.productivity_mode_enabled}
          onChange={(e) => handleChange('productivity_mode_enabled', e.target.checked)}
        />
        <span>Productivity mode (only track on allowed apps)</span>
      </label>
      {form.productivity_mode_enabled && (
        <div className="grid two">
          <label>
            Allowlist apps (one per line)
            <textarea
              value={form.productivity_allowlist}
              onChange={(e) => handleChange('productivity_allowlist', e.target.value)}
              placeholder="code\nobsidian"
              rows={4}
            />
          </label>
          <label>
            Blocklist apps (one per line)
            <textarea
              value={form.productivity_blocklist}
              onChange={(e) => handleChange('productivity_blocklist', e.target.value)}
              placeholder="tiktok\ninstagram"
              rows={4}
            />
          </label>
        </div>
      )}
      <label>
        Auto-backup folder (optional)
        <input
          type="text"
          placeholder="/path/to/backups"
          value={form.auto_backup_path}
          onChange={(e) => handleChange('auto_backup_path', e.target.value)}
        />
      </label>
      <button type="submit" className="primary" disabled={isSaving}>
        {isSaving ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  )
}
