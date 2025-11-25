import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  exportData,
  fetchDashboard,
  fetchSessions,
  fetchSettings,
  removeSession,
  saveReflection,
  saveSettings,
  updateSession,
} from './api/tauri'
import { HistoryTable } from './components/HistoryTable'
import { DashboardGrid } from './components/DashboardGrid'
import { SettingsPanel } from './components/SettingsPanel'
import { TimerCard } from './components/TimerCard'
import { ReflectionDialog } from './components/ReflectionDialog'
import { SessionEditor } from './components/SessionEditor'
import { useTimer } from './hooks/useTimer'
import type { ReflectionInput, SessionEditPayload, SessionRecord, SettingsUpdate } from './types'
import './App.css'

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
] as const

type Tab = (typeof tabs)[number]['id']

function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [showReflection, setShowReflection] = useState(false)
  const [editorSession, setEditorSession] = useState<SessionRecord | null>(null)
  const [pendingReflectionSession, setPendingReflectionSession] = useState<SessionRecord | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const timer = useTimer()

  const statsQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 60_000,
  })

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: () => fetchSessions(25, 0),
  })

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const start = async () => {
    await timer.start(settingsQuery.data?.target_skill_name)
    statsQuery.refetch()
    sessionsQuery.refetch()
  }

  const stop = async () => {
    const session = await timer.stop()
    setPendingReflectionSession(session)
    setShowReflection(true)
    statsQuery.refetch()
    sessionsQuery.refetch()
  }

  const submitReflection = async (reflection: ReflectionInput) => {
    if (!pendingReflectionSession) {
      setShowReflection(false)
      return
    }
    await saveReflection(pendingReflectionSession.id, reflection)
    setPendingReflectionSession(null)
    setShowReflection(false)
    statsQuery.refetch()
    sessionsQuery.refetch()
    setToast('Reflection saved')
  }

  const handleDelete = async (session: SessionRecord) => {
    if (!window.confirm('Delete this entry?')) return
    await removeSession(session.id)
    sessionsQuery.refetch()
    statsQuery.refetch()
  }

  const handleEdit = async (payload: SessionEditPayload) => {
    await updateSession(payload)
    setEditorSession(null)
    sessionsQuery.refetch()
    statsQuery.refetch()
  }

  const handleSettingsSave = async (payload: SettingsUpdate) => {
    await saveSettings(payload)
    settingsQuery.refetch()
    statsQuery.refetch()
    setToast('Settings updated')
  }

  const handleExport = async (format: 'csv' | 'json') => {
    const file = await exportData(format)
    setToast(`Exported ${format.toUpperCase()} → ${file.path}`)
  }

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(id)
  }, [toast])

  const sessions = sessionsQuery.data?.data ?? []

  const totalHours = ((statsQuery.data?.total_minutes ?? 0) / 60).toFixed(1)
  const headerSubtitle = settingsQuery.data
    ? `Target: ${settingsQuery.data.target_skill_name} — ${totalHours} hours logged`
    : 'Loading settings…'

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="muted">10,000-Hour Mastery Tracker</p>
          <h1>{headerSubtitle}</h1>
        </div>
        <div className="header-actions">
          <button className="ghost" onClick={() => handleExport('csv')}>
            Export CSV
          </button>
          <button className="ghost" onClick={() => handleExport('json')}>
            Export JSON
          </button>
          <button className="ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Light' : 'Dark'} mode
          </button>
        </div>
      </header>

      <nav className="tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? 'active' : ''}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'dashboard' && (
        <>
          <TimerCard
            running={timer.running}
            formatted={timer.formatted}
            skillName={settingsQuery.data?.target_skill_name ?? 'Loading'}
            goal={statsQuery.data?.daily_goal ?? { goal_minutes: 120, completed_minutes: 0, percentage: 0 }}
            streakDays={statsQuery.data?.streak_days ?? 0}
            onStart={start}
            onStop={stop}
          />
          <DashboardGrid stats={statsQuery.data} />
        </>
      )}

      {tab === 'history' && (
        <HistoryTable sessions={sessions} onEdit={setEditorSession} onDelete={handleDelete} />
      )}

      {tab === 'settings' && (
        <SettingsPanel
          settings={settingsQuery.data}
          onSave={handleSettingsSave}
          isSaving={settingsQuery.isFetching}
        />
      )}

      <ReflectionDialog
        open={showReflection}
        sessionId={pendingReflectionSession?.id}
        onSkip={() => {
          setShowReflection(false)
          setPendingReflectionSession(null)
        }}
        onSubmit={submitReflection}
      />
      <SessionEditor session={editorSession} onClose={() => setEditorSession(null)} onSave={handleEdit} />

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App
