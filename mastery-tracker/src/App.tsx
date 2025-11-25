import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LayoutDashboard, History, Settings, X } from "lucide-react";
import Dashboard from "./components/Dashboard";
import SessionHistory from "./components/SessionHistory";
import SettingsPage from "./components/SettingsPage";
import { cn } from "./lib/utils";
import { TimerStatus, DashboardStats, Session } from "./types";
import { listen } from "@tauri-apps/api/event";

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');
  const [timerStatus, setTimerStatus] = useState<TimerStatus>({
    is_running: false,
    accumulated_seconds: 0,
    start_time: null
  });
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  
  // Reflection Modal
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [lastSessionId, setLastSessionId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const status = await invoke<TimerStatus>('get_timer_status');
      setTimerStatus(status);
      
      const stats = await invoke<DashboardStats>('get_dashboard_stats');
      setDashboardStats(stats);
      
      // Calculate initial duration
      if (status.is_running && status.start_time) {
        const start = new Date(status.start_time).getTime();
        const now = new Date().getTime();
        setCurrentDuration(status.accumulated_seconds + Math.floor((now - start) / 1000));
      } else {
        setCurrentDuration(status.accumulated_seconds);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Listen for idle pause events
    const unlisten = listen('timer-paused', (event) => {
        console.log('Timer paused due to idle', event);
        fetchData();
    });

    return () => {
        unlisten.then(f => f());
    };
  }, []);

  useEffect(() => {
    let interval: number;
    if (timerStatus.is_running && timerStatus.start_time) {
      interval = setInterval(() => {
        const start = new Date(timerStatus.start_time!).getTime();
        const now = new Date().getTime();
        setCurrentDuration(timerStatus.accumulated_seconds + Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerStatus]);

  const toggleTimer = async () => {
    if (timerStatus.is_running) {
      try {
        const session = await invoke<Session>('stop_timer');
        setTimerStatus({ ...timerStatus, is_running: false, start_time: null, accumulated_seconds: 0 });
        setCurrentDuration(0);
        setLastSessionId(session.id);
        setShowReflection(true);
        fetchData();
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        await invoke('start_timer');
        fetchData(); // This will update status
      } catch (e) {
        console.error(e);
      }
    }
  };
  
  const submitReflection = async () => {
    if (lastSessionId) {
        try {
            await invoke('update_session_reflection', { id: lastSessionId, reflection: reflectionText });
        } catch(e) { console.error(e); }
    }
    setShowReflection(false);
    setReflectionText("");
    fetchData(); // Refresh history if needed (though history component fetches on mount)
  };

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Sidebar */}
      <nav className="w-16 md:w-20 flex flex-col items-center py-6 border-r border-[var(--border)] bg-[var(--card)] z-10">
        <div className="mb-8 p-2 rounded-xl bg-[var(--primary)] text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
            </svg>
        </div>
        
        <div className="flex flex-col gap-4 w-full px-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "p-3 rounded-xl transition-all flex justify-center",
              activeTab === 'dashboard' ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "text-[var(--secondary)] hover:bg-[var(--secondary)]/10"
            )}
            title="Dashboard"
          >
            <LayoutDashboard size={24} />
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "p-3 rounded-xl transition-all flex justify-center",
              activeTab === 'history' ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "text-[var(--secondary)] hover:bg-[var(--secondary)]/10"
            )}
            title="History"
          >
            <History size={24} />
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "p-3 rounded-xl transition-all flex justify-center",
              activeTab === 'settings' ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "text-[var(--secondary)] hover:bg-[var(--secondary)]/10"
            )}
            title="Settings"
          >
            <Settings size={24} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'dashboard' && (
          <Dashboard 
            timerStatus={timerStatus} 
            stats={dashboardStats} 
            onToggleTimer={toggleTimer} 
            currentDuration={currentDuration}
          />
        )}
        {activeTab === 'history' && <SessionHistory />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
      
      {/* Reflection Modal */}
      {showReflection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-[var(--card)] border border-[var(--border)] p-6 rounded-2xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Good Session!</h3>
                    <button onClick={() => setShowReflection(false)}><X size={20} className="text-[var(--secondary)]" /></button>
                </div>
                <p className="mb-4 text-[var(--secondary)]">Take a moment to reflect on what you practiced.</p>
                <textarea 
                    className="w-full h-32 p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] mb-4 focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none"
                    placeholder="What did you learn today? What went well?"
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    autoFocus
                />
                <div className="flex justify-end gap-2">
                    <button 
                        onClick={() => setShowReflection(false)}
                        className="px-4 py-2 rounded-lg text-[var(--secondary)] hover:bg-[var(--secondary)]/10 transition-colors"
                    >
                        Skip
                    </button>
                    <button 
                        onClick={submitReflection}
                        className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white hover:bg-blue-600 transition-colors"
                    >
                        Save Reflection
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default App;
