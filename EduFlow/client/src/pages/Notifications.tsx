import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Notification } from '../types';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();

  useEffect(() => { if (user) fetchNotifications(); }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get<Notification[]>(`/notifications?userId=${user!.id}`);
      setNotifications(res.data);
    } catch { /* silently fail */ }
  };

  const markAsRead = async (id: string, taskId?: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* ignore */ }
    if (taskId) navigate(`/tasks/${taskId}`);
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    await Promise.all(unread.map(n => api.put(`/notifications/${n.id}/read`).catch(() => {})));
    setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
  };

  const notifIcon = (type: string) => {
    if (type === 'NEW_TASK_ASSIGNED') return '📋';
    if (type === 'Task Approved') return '✅';
    if (type === 'Task Rejected') return '❌';
    if (type === 'Changes Requested') return '⚠️';
    return '🔔';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {notifications.some(n => !n.isRead) && (
          <button className="btn btn-secondary" onClick={markAllRead}>Mark all as read</button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔔</div>
            <div>No notifications yet.</div>
          </div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((n, idx) => (
              <div
                key={n.id}
                style={{
                  padding: '1.25rem',
                  borderBottom: idx < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                  background: n.isRead ? 'transparent' : 'rgba(79,70,229,0.04)',
                  cursor: n.taskId ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
                onClick={() => { if (n.taskId) markAsRead(n.id, n.taskId); }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 4 }} />}
                    <span style={{ fontSize: '1.3rem' }}>{notifIcon(n.type)}</span>
                    <div>
                      <div className="font-bold" style={{ fontSize: '0.95rem' }}>{n.title}</div>
                      <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{n.message}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}>
                        {new Date(n.createdAt).toLocaleString()}
                        {n.taskId && !n.isRead && <span style={{ marginLeft: '0.5rem', color: 'var(--primary)', fontWeight: 600 }}>→ View Task</span>}
                      </div>
                    </div>
                  </div>
                  {!n.isRead && !n.taskId && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={e => { e.stopPropagation(); markAsRead(n.id); }}
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
