import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Trash2, Calendar, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Session } from '../types';

export default function SessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const data = await invoke<Session[]>('get_sessions');
      setSessions(data);
    } catch (error) {
      console.error("Failed to fetch sessions", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this session?")) {
      try {
        await invoke('delete_session', { id });
        setSessions(sessions.filter(s => s.id !== id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[var(--secondary)]">Loading history...</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-6">Session History</h2>
      
      {sessions.length === 0 ? (
        <div className="text-center p-12 text-[var(--secondary)] border border-dashed border-[var(--border)] rounded-xl">
          <Clock className="mx-auto mb-4 opacity-50" size={48} />
          <p>No sessions recorded yet. Start practicing!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 flex items-center justify-between shadow-sm transition-all hover:shadow-md">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm text-[var(--secondary)]">
                   <Calendar size={14} />
                   {format(parseISO(session.start_time), 'MMM d, yyyy')}
                   <span className="mx-1">•</span>
                   {format(parseISO(session.start_time), 'h:mm a')}
                </div>
                <div className="font-medium text-lg">
                  {Math.floor(session.duration_minutes)}m {Math.round((session.duration_minutes % 1) * 60)}s
                </div>
                {session.reflection_text && (
                  <p className="text-sm text-[var(--secondary)] mt-1 italic">"{session.reflection_text}"</p>
                )}
              </div>
              
              <button 
                onClick={() => handleDelete(session.id)}
                className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                title="Delete Session"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
