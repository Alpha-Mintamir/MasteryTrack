import { Play, Pause, Trophy, Calendar, Flame } from 'lucide-react';
import { cn, formatDuration } from '../lib/utils';
import { TimerStatus, DashboardStats } from '../types';

interface DashboardProps {
  timerStatus: TimerStatus;
  stats: DashboardStats | null;
  onToggleTimer: () => void;
  currentDuration: number;
}

const ProgressRing = ({ radius, stroke, progress }: { radius: number, stroke: number, progress: number }) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="rotate-[-90deg] transition-all duration-500"
      >
        <circle
          stroke="var(--border)"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute text-center flex flex-col items-center">
         <span className="text-3xl font-bold text-[var(--foreground)]">{progress.toFixed(2)}%</span>
         <span className="text-xs text-[var(--secondary)] font-medium uppercase tracking-wider">Mastery</span>
      </div>
    </div>
  );
};

export default function Dashboard({ timerStatus, stats, onToggleTimer, currentDuration }: DashboardProps) {
  return (
    <div className="flex flex-col gap-8 items-center justify-center h-full p-6 animate-in fade-in duration-500">
      
      {/* Timer Section */}
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <div className="relative">
           <ProgressRing radius={120} stroke={8} progress={stats?.progress_percentage || 0} />
        </div>
        
        <div className="text-6xl font-mono font-bold tracking-tighter tabular-nums text-[var(--foreground)]">
          {formatDuration(currentDuration)}
        </div>
        
        <button
          onClick={onToggleTimer}
          className={cn(
            "rounded-full p-6 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95",
            timerStatus.is_running 
              ? "bg-red-500 hover:bg-red-600 text-white" 
              : "bg-[var(--primary)] hover:bg-blue-600 text-white"
          )}
        >
          {timerStatus.is_running ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-2xl mt-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm">
          <Calendar className="text-[var(--primary)] mb-1" size={20} />
          <span className="text-2xl font-bold">{stats?.today_hours.toFixed(1) || 0}h</span>
          <span className="text-xs text-[var(--secondary)] uppercase">Today</span>
        </div>
        
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm">
          <Flame className="text-orange-500 mb-1" size={20} />
          <span className="text-2xl font-bold">{stats?.streak_days || 0}</span>
          <span className="text-xs text-[var(--secondary)] uppercase">Day Streak</span>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm">
          <Trophy className="text-yellow-500 mb-1" size={20} />
          <span className="text-2xl font-bold">{Math.floor(stats?.total_hours || 0)}h</span>
          <span className="text-xs text-[var(--secondary)] uppercase">Total</span>
        </div>
      </div>
    </div>
  );
}
