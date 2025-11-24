import React, { useEffect, useState } from 'react';
import * as api from '../api';
import { Settings as SettingsType } from '../types';
import { downloadFile } from '../utils';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [skillName, setSkillName] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSkillName();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadSkillName = async () => {
    try {
      const name = await api.getSkillName();
      setSkillName(name);
    } catch (error) {
      console.error('Failed to load skill name:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      await api.updateSettings(settings);
      await api.updateSkillName(skillName);
      setIsDirty(false);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await api.exportCsv();
      downloadFile(csv, 'mastery-tracker-export.csv', 'text/csv');
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV');
    }
  };

  const handleExportJson = async () => {
    try {
      const json = await api.exportJson();
      downloadFile(json, 'mastery-tracker-export.json', 'application/json');
    } catch (error) {
      console.error('Failed to export JSON:', error);
      alert('Failed to export JSON');
    }
  };

  if (!settings) {
    return <div className="settings-section">Loading...</div>;
  }

  return (
    <div className="settings-section">
      <div className="section-header">
        <h2>Settings</h2>
        {isDirty && (
          <button className="btn btn-primary" onClick={handleSaveSettings}>
            Save Changes
          </button>
        )}
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <h3>General</h3>
          <div className="form-group">
            <label>Skill Name</label>
            <input
              type="text"
              value={skillName}
              onChange={(e) => {
                setSkillName(e.target.value);
                setIsDirty(true);
              }}
              placeholder="e.g., Piano, Coding, Drawing"
            />
          </div>
          <div className="form-group">
            <label>Theme</label>
            <select
              value={settings.theme}
              onChange={(e) => {
                setSettings({ ...settings, theme: e.target.value });
                setIsDirty(true);
              }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        <div className="settings-card">
          <h3>Practice Goals</h3>
          <div className="form-group">
            <label>Daily Goal (minutes)</label>
            <input
              type="number"
              value={settings.daily_goal_minutes}
              onChange={(e) => {
                setSettings({ ...settings, daily_goal_minutes: parseInt(e.target.value) || 0 });
                setIsDirty(true);
              }}
              min="1"
              max="1440"
            />
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
              Approximately {(settings.daily_goal_minutes / 60).toFixed(1)} hours per day
            </small>
          </div>
        </div>

        <div className="settings-card">
          <h3>Idle Detection</h3>
          <div className="form-group">
            <label>Idle Timeout (minutes)</label>
            <input
              type="number"
              value={settings.idle_timeout_minutes}
              onChange={(e) => {
                setSettings({ ...settings, idle_timeout_minutes: parseInt(e.target.value) || 0 });
                setIsDirty(true);
              }}
              min="1"
              max="60"
            />
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
              Timer will auto-pause after this period of inactivity
            </small>
          </div>
        </div>

        <div className="settings-card">
          <h3>Advanced</h3>
          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="productivity-mode"
                checked={settings.productivity_mode_enabled}
                onChange={(e) => {
                  setSettings({ ...settings, productivity_mode_enabled: e.target.checked });
                  setIsDirty(true);
                }}
              />
              <label htmlFor="productivity-mode" style={{ marginBottom: 0 }}>
                Enable Productivity Mode
              </label>
            </div>
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
              Track time only when specific apps are active (feature coming soon)
            </small>
          </div>
        </div>

        <div className="settings-card">
          <h3>Data Export</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Export your session history for backup or analysis
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={handleExportCsv}>
              Export as CSV
            </button>
            <button className="btn btn-secondary" onClick={handleExportJson}>
              Export as JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
