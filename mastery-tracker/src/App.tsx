import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { History } from './components/History';
import { Settings } from './components/Settings';
import './App.css';
import * as api from './api';

type View = 'dashboard' | 'history' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const settings = await api.getSettings();
      setTheme(settings.theme as 'light' | 'dark');
      document.documentElement.setAttribute('data-theme', settings.theme);
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    
    try {
      const settings = await api.getSettings();
      await api.updateSettings({ ...settings, theme: newTheme });
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  return (
    <div className="app">
      <div className="header">
        <h1>⏱️ 10,000 Hour Mastery Tracker</h1>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
      
      <div className="nav">
        <button
          className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`nav-button ${currentView === 'history' ? 'active' : ''}`}
          onClick={() => setCurrentView('history')}
        >
          History
        </button>
        <button
          className={`nav-button ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentView('settings')}
        >
          Settings
        </button>
      </div>

      <div className="content">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'history' && <History />}
        {currentView === 'settings' && <Settings />}
      </div>
    </div>
  );
}

export default App;
