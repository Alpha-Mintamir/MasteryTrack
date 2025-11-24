import React, { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import * as api from '../api';
import { DashboardStats, TimerInfo } from '../types';
import { formatTime, formatHours } from '../utils';

interface ReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reflection: string) => void;
}

const ReflectionModal: React.FC<ReflectionModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [whatPracticed, setWhatPracticed] = useState('');
  const [whatLearned, setWhatLearned] = useState('');
  const [nextTime, setNextTime] = useState('');

  const handleSubmit = () => {
    const fullReflection = `What I practiced: ${whatPracticed}\nWhat I learned: ${whatLearned}\nNext time: ${nextTime}`;
    onSubmit(fullReflection.trim() ? fullReflection : '');
    setWhatPracticed('');
    setWhatLearned('');
    setNextTime('');
  };

  const handleSkip = () => {
    onSubmit('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Session Reflection</h3>
        <div className="form-group">
          <label>What did you practice?</label>
          <input
            type="text"
            value={whatPracticed}
            onChange={(e) => setWhatPracticed(e.target.value)}
            placeholder="e.g., JavaScript algorithms"
          />
        </div>
        <div className="form-group">
          <label>What did you learn?</label>
          <textarea
            value={whatLearned}
            onChange={(e) => setWhatLearned(e.target.value)}
            placeholder="Key insights or discoveries..."
            rows={3}
          />
        </div>
        <div className="form-group">
          <label>What will you do next time?</label>
          <textarea
            value={nextTime}
            onChange={(e) => setNextTime(e.target.value)}
            placeholder="Plans for the next session..."
            rows={3}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={handleSkip}>
            Skip
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Save Reflection
          </button>
        </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timerInfo, setTimerInfo] = useState<TimerInfo>({
    is_running: false,
    elapsed_seconds: 0,
    is_paused: false,
    start_time: null,
  });
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [skillName, setSkillName] = useState('My Skill');

  useEffect(() => {
    loadData();
    setupListeners();
  }, []);

  useEffect(() => {
    // Setup tray event listeners
    const setupTrayListeners = async () => {
      await listen('tray-start-timer', () => {
        handleStartTimer();
      });

      await listen('tray-stop-timer', () => {
        handleStopTimer();
      });
    };
    setupTrayListeners();
  }, []);

  const setupListeners = async () => {
    await listen('timer-tick', (event: any) => {
      setTimerInfo(event.payload);
    });

    await listen('timer-paused-idle', () => {
      alert('Timer paused due to inactivity');
      loadTimerInfo();
    });
  };

  const loadData = async () => {
    try {
      const [statsData, timer, name] = await Promise.all([
        api.getDashboardStats(),
        api.getTimerInfo(),
        api.getSkillName(),
      ]);
      setStats(statsData);
      setTimerInfo(timer);
      setSkillName(name);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const loadTimerInfo = async () => {
    try {
      const timer = await api.getTimerInfo();
      setTimerInfo(timer);
    } catch (error) {
      console.error('Failed to load timer info:', error);
    }
  };

  const handleStartTimer = async () => {
    try {
      await api.startTimer();
      await loadTimerInfo();
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const handleStopTimer = () => {
    setShowReflectionModal(true);
  };

  const handleSubmitReflection = async (reflection: string) => {
    try {
      await api.stopTimer(reflection || undefined);
      setShowReflectionModal(false);
      await loadData();
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  const handlePauseTimer = async () => {
    try {
      await api.pauseTimer();
      await loadTimerInfo();
    } catch (error) {
      console.error('Failed to pause timer:', error);
    }
  };

  const handleResumeTimer = async () => {
    try {
      await api.resumeTimer();
      await loadTimerInfo();
    } catch (error) {
      console.error('Failed to resume timer:', error);
    }
  };

  const renderProgressCircle = (percentage: number, size: number = 200) => {
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <svg width={size} height={size}>
        <circle
          className="bg-circle"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className="progress-circle-bar"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
    );
  };

  if (!stats) {
    return <div className="dashboard">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <div className="timer-section">
        <h2>{skillName}</h2>
        <div className="timer-display">{formatTime(timerInfo.elapsed_seconds)}</div>
        {timerInfo.is_paused && (
          <div className="paused-indicator">⏸ Paused</div>
        )}
        <div className="timer-controls">
          {!timerInfo.is_running ? (
            <button className="btn btn-success" onClick={handleStartTimer}>
              ▶ Start
            </button>
          ) : (
            <>
              {timerInfo.is_paused ? (
                <button className="btn btn-success" onClick={handleResumeTimer}>
                  ▶ Resume
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={handlePauseTimer}>
                  ⏸ Pause
                </button>
              )}
              <button className="btn btn-danger" onClick={handleStopTimer}>
                ⏹ Stop
              </button>
            </>
          )}
        </div>
        {stats.streak_days > 0 && (
          <div className="streak-badge">
            🔥 {stats.streak_days} day{stats.streak_days !== 1 ? 's' : ''} streak!
          </div>
        )}
      </div>

      <div className="progress-section">
        <div className="progress-card">
          <h3>10,000 Hour Progress</h3>
          <div className="progress-circle-container">
            <div className="progress-circle">
              {renderProgressCircle(stats.progress_percentage)}
              <div className="progress-text">
                <div className="percentage">{stats.progress_percentage.toFixed(1)}%</div>
                <div className="label">{formatHours(stats.total_hours)} / 10,000</div>
              </div>
            </div>
          </div>
        </div>

        <div className="progress-card">
          <h3>Daily Goal</h3>
          <div className="progress-circle-container">
            <div className="progress-circle">
              {renderProgressCircle(stats.daily_progress_percentage)}
              <div className="progress-text">
                <div className="percentage">{stats.daily_progress_percentage.toFixed(0)}%</div>
                <div className="label">{formatHours(stats.today_hours)} / {formatHours(stats.daily_goal_hours)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="progress-card">
        <h3>Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="value">{formatHours(stats.today_hours)}</div>
            <div className="label">Today</div>
          </div>
          <div className="stat-item">
            <div className="value">{formatHours(stats.week_hours)}</div>
            <div className="label">This Week</div>
          </div>
          <div className="stat-item">
            <div className="value">{formatHours(stats.month_hours)}</div>
            <div className="label">This Month</div>
          </div>
          <div className="stat-item">
            <div className="value">{formatHours(stats.total_hours)}</div>
            <div className="label">Total</div>
          </div>
        </div>
      </div>

      <ReflectionModal
        isOpen={showReflectionModal}
        onClose={() => setShowReflectionModal(false)}
        onSubmit={handleSubmitReflection}
      />
    </div>
  );
};
