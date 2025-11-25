import React, { useEffect, useState } from 'react';
import * as api from '../api';
import { Session } from '../types';
import { formatDate, formatTimeShort, formatHours } from '../utils';

interface EditModalProps {
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: Session) => void;
}

const EditModal: React.FC<EditModalProps> = ({ session, isOpen, onClose, onSave }) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reflection, setReflection] = useState('');

  useEffect(() => {
    if (session) {
      setStartTime(session.start_time);
      setEndTime(session.end_time || '');
      setReflection(session.reflection_text || '');
    }
  }, [session]);

  const handleSave = () => {
    if (session) {
      onSave({
        ...session,
        start_time: startTime,
        end_time: endTime,
        reflection_text: reflection,
      });
    }
  };

  if (!isOpen || !session) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Edit Session</h3>
        <div className="form-group">
          <label>Start Time</label>
          <input
            type="datetime-local"
            value={startTime.slice(0, 16)}
            onChange={(e) => setStartTime(new Date(e.target.value).toISOString())}
          />
        </div>
        <div className="form-group">
          <label>End Time</label>
          <input
            type="datetime-local"
            value={endTime.slice(0, 16)}
            onChange={(e) => setEndTime(new Date(e.target.value).toISOString())}
          />
        </div>
        <div className="form-group">
          <label>Reflection</label>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={4}
            placeholder="Optional notes about this session..."
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export const History: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await api.getSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const handleEdit = (session: Session) => {
    setEditingSession(session);
    setShowEditModal(true);
  };

  const handleSave = async (session: Session) => {
    try {
      await api.updateSession(
        session.id,
        session.start_time,
        session.end_time!,
        session.reflection_text || undefined
      );
      setShowEditModal(false);
      setEditingSession(null);
      await loadSessions();
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      await api.deleteSession(id);
      await loadSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const totalHours = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60;

  return (
    <div className="history-section">
      <div className="section-header">
        <h2>Session History</h2>
        <div className="stat-item">
          <div className="value">{sessions.length}</div>
          <div className="label">Total Sessions · {formatHours(totalHours)} hours</div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <h3>No sessions yet</h3>
          <p>Start tracking your practice time to see your history here.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Start</th>
                <th>End</th>
                <th>Duration</th>
                <th>Reflection</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td>{formatDate(session.start_time)}</td>
                  <td>{formatTimeShort(session.start_time)}</td>
                  <td>{session.end_time ? formatTimeShort(session.end_time) : '-'}</td>
                  <td>
                    {session.duration_minutes
                      ? `${Math.floor(session.duration_minutes / 60)}h ${session.duration_minutes % 60}m`
                      : '-'}
                  </td>
                  <td>
                    {session.reflection_text ? (
                      <span title={session.reflection_text}>
                        {session.reflection_text.slice(0, 50)}
                        {session.reflection_text.length > 50 ? '...' : ''}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={() => handleEdit(session)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDelete(session.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditModal
        session={editingSession}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingSession(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
};
