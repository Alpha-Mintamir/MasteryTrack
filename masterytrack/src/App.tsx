import { useEffect, useMemo, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { TimerCard } from './components/TimerCard'
import { ProgressRing } from './components/ProgressRing'
import { HistoryTable } from './components/HistoryTable'
import { SettingsPanel } from './components/SettingsPanel'
import { ReflectionModal } from './components/ReflectionModal'
import { Banner } from './components/Banner'
import { useTrackerStore } from './store'
import type { SessionHistoryRow, TimerStatus } from './types'
import './App.css'

type Tab = 'dashboard' | 'history' | 'settings'

function App() {
  const timer = useTrackerStore((s) => s.timer)
  const stats = useTrackerStore((s) => s.stats)
  const sessions = useTrackerStore((s) => s.sessions)
  const settings = useTrackerStore((s) => s.settings)
  const reflectionDraft = useTrackerStore((s) => s.reflectionDraft)
  const reflectionOpen = useTrackerStore((s) => s.reflectionOpen)
  const exporting = useTrackerStore((s) => s.exporting)
  const lastExportPath = useTrackerStore((s) => s.lastExportPath)

  const startTimer = useTrackerStore((s) => s.startTimer)
  const stopTimer = useTrackerStore((s) => s.stopTimer)
  const loadInitial = useTrackerStore((s) => s.loadInitial)
  const refreshSessions = useTrackerStore((s) => s.refreshSessions)
  const refreshStats = useTrackerStore((s) => s.refreshStats)
  const saveSettings = useTrackerStore((s) => s.saveSettings)
  const exportData = useTrackerStore((s) => s.exportData)
  const setReflectionOpen = useTrackerStore((s) => s.setReflectionOpen)
  const updateReflectionDraft = useTrackerStore((s) => s.updateReflectionDraft)
  const setTimerState = useTrackerStore((s) => s.setTimer)

  const [tab, setTab] = useState<Tab>('dashboard')
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<{ message: string; tone?: 'info' | 'success' | 'warning' } | null>(null)
  const [reflectionSaving, setReflectionSaving] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    loadInitial().catch((err) => {
      console.error(err)
      setBanner({ message: 'Failed to load data.', tone: 'warning' })
    })
  }, [loadInitial])

  useEffect(() => {
    const disposers: Array<() => void> = []
    const run = async () => {
      disposers.push(
        await listen('timer:tick', (event) => {
          setTimerState(event.payload as TimerStatus)
        }),
      )
      disposers.push(
        await listen('timer:auto-paused', (event) => {
          const reason = (event.payload as { reason?: string })?.reason ?? 'Idle'
          setBanner({ message: `Timer auto-paused (${reason})`, tone: 'warning' })
          refreshStats()
        }),
      )
      disposers.push(
        await listen('goal:reached', () => {
          setBanner({ message: 'Daily practice goal met 🎯', tone: 'success' })
        }),
      )
    }
    run().catch((err) => console.error(err))
    return () => {
      disposers.forEach((off) => off())
    }
  }, [refreshStats, setTimerState])

  const handleStart = async () => {
    setBusy(true)
    try {
      await startTimer()
      setBanner({ message: 'Practice session started.', tone: 'info' })
    } catch (err) {
      console.error(err)
      setBanner({ message: 'Unable to start timer.', tone: 'warning' })
    } finally {
      setBusy(false)
    }
  }

  const handleStop = () => {
    setReflectionOpen(true)
  }

  const handleReflectionSubmit = async () => {
    setReflectionSaving(true)
    try {
      await stopTimer(reflectionDraft)
      setBanner({ message: 'Session saved with reflection.', tone: 'success' })
    } catch (err) {
      console.error(err)
      setBanner({ message: 'Unable to save session.', tone: 'warning' })
    } finally {
      setReflectionSaving(false)
    }
  }

  const handleUpdateSession = async (draft: {
    id: number
    start: string
    end?: string | null
    duration_minutes: number
    notes?: string | null
    what_practiced?: string | null
    what_learned?: string | null
    next_focus?: string | null
  }) => {
    await invoke('update_session', {
      payload: {
        id: draft.id,
        start_time: new Date(draft.start).toISOString(),
        end_time: draft.end ? new Date(draft.end).toISOString() : null,
        duration_minutes: draft.duration_minutes,
        notes: draft.notes,
        what_practiced: draft.what_practiced,
        what_learned: draft.what_learned,
        next_focus: draft.next_focus,
      },
    })
    await refreshSessions()
    setBanner({ message: 'Session updated.', tone: 'success' })
  }

  const handleDeleteSession = async (id: number) => {
    await invoke('delete_session', { session_id: id })
    await refreshSessions()
    setBanner({ message: 'Session removed.', tone: 'info' })
  }

  const dashboardContent = useMemo(() => {
    if (!stats) {
      return <div className="card">Loading insights…</div>
    }
    return (
      <div className="dashboard-grid">
        <TimerCard
          timer={timer}
          stats={stats}
          onStart={handleStart}
          onStop={handleStop}
          disabled={busy}
        />
        <div className="card progress-card">
          <div className="progress-flex">
            <ProgressRing progress={stats.goal_progress} label="toward 10,000h" />
            <div className="progress-meta">
              <div>
                <span className="muted tiny">Total hours</span>
                <strong>{stats.total_hours.toFixed(1)}h</strong>
              </div>
              <div>
                <span className="muted tiny">Remaining</span>
                <strong>{Math.max(10000 - stats.total_hours, 0).toFixed(1)}h</strong>
              </div>
              <div>
                <span className="muted tiny">Daily goal</span>
                <strong>{stats.daily_goal_hours.toFixed(2)}h</strong>
              </div>
            </div>
          </div>
        </div>
        <div className="card stats-tiles">
          <article>
            <p className="muted tiny">Today</p>
            <h2>{stats.today_hours.toFixed(2)}h</h2>
          </article>
          <article>
            <p className="muted tiny">This week</p>
            <h2>{stats.week_hours.toFixed(2)}h</h2>
          </article>
          <article>
            <p className="muted tiny">This month</p>
            <h2>{stats.month_hours.toFixed(2)}h</h2>
          </article>
        </div>
      </div>
    )
  }, [stats, timer, handleStart, handleStop, busy])

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <h1>10,000-Hour Mastery Tracker</h1>
          <p className="muted">{settings?.skill_name ?? 'Loading skill…'}</p>
        </div>
        <div className="top-bar-actions">
          <button className="ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </header>

      <nav className="tabs">
        {(['dashboard', 'history', 'settings'] as Tab[]).map((key) => (
          <button
            key={key}
            className={tab === key ? 'active' : ''}
            onClick={() => setTab(key)}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </nav>

      {banner && (
        <Banner message={banner.message} tone={banner.tone} onClose={() => setBanner(null)} />
      )}

      <main>
        {tab === 'dashboard' && dashboardContent}
        {tab === 'history' && (
          <HistoryTable
            sessions={sessions as SessionHistoryRow[]}
            onSave={handleUpdateSession}
            onDelete={handleDeleteSession}
          />
        )}
        {tab === 'settings' && (
          <SettingsPanel
            settings={settings}
            onSave={saveSettings}
            onExport={exportData}
            exporting={exporting}
            lastExportPath={lastExportPath}
          />
        )}
      </main>

      <ReflectionModal
        open={reflectionOpen}
        draft={reflectionDraft}
        onChange={updateReflectionDraft}
        onSubmit={handleReflectionSubmit}
        onClose={() => setReflectionOpen(false)}
        saving={reflectionSaving}
      />
    </div>
  )
}

export default App
