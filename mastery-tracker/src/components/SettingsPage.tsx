import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppSettings } from '../types';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    daily_goal_minutes: 120,
    idle_timeout_minutes: 5,
    productivity_mode_enabled: false,
    target_skill_name: 'Coding'
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    invoke<AppSettings>('get_settings').then(s => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    try {
      await invoke('save_settings', { settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="h-full overflow-y-auto p-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <div className="space-y-6 max-w-xl">
        <div className="flex flex-col gap-2">
          <label className="font-medium">Target Skill Name</label>
          <input 
            type="text" 
            value={settings.target_skill_name} 
            onChange={e => setSettings({...settings, target_skill_name: e.target.value})}
            className="p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium">Daily Goal (minutes)</label>
          <input 
            type="number" 
            value={settings.daily_goal_minutes} 
            onChange={e => setSettings({...settings, daily_goal_minutes: parseInt(e.target.value) || 0})}
            className="p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium">Idle Timeout (minutes)</label>
          <input 
            type="number" 
            value={settings.idle_timeout_minutes} 
            onChange={e => setSettings({...settings, idle_timeout_minutes: parseInt(e.target.value) || 0})}
            className="p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          <p className="text-sm text-[var(--secondary)]">The timer will auto-pause if you are inactive for this long.</p>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            id="prod_mode"
            checked={settings.productivity_mode_enabled} 
            onChange={e => setSettings({...settings, productivity_mode_enabled: e.target.checked})}
            className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)]"
          />
          <label htmlFor="prod_mode" className="font-medium cursor-pointer">Enable Productivity Mode</label>
        </div>
        
        <button 
          onClick={handleSave}
          className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--primary)] text-white rounded-lg hover:bg-blue-600 transition-colors font-medium mt-4"
        >
          <Save size={18} />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
