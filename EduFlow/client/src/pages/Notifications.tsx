import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { Notification } from '../types';

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (user) {
      try {
        const res = await api.get(`/notifications?userId=${user.id}`);
        setNotifications(res.data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    for (let n of unread) {
      await api.put(`/notifications/${n.id}/read`);
    }
    fetchNotifications();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {notifications.some(n => !n.isRead) && (
          <button className="btn btn-secondary" onClick={markAllRead}>Mark all as read</button>
        )}
      </div>

      <div className="card" style={{padding: 0, overflow: 'hidden'}}>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted">No notifications</div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((notif, idx) => (
              <div key={notif.id} style={{
                padding: '1.25rem', 
                borderBottom: idx < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                background: notif.isRead ? 'transparent' : 'rgba(79, 70, 229, 0.05)'
              }} className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {!notif.isRead && <div style={{width:8, height:8, borderRadius:'50%', background:'var(--primary)'}}></div>}
                    <h3 className="font-bold">{notif.title}</h3>
                  </div>
                  <p className="text-muted text-sm">{notif.message}</p>
                  <div className="text-muted mt-2" style={{fontSize: '0.75rem'}}>{new Date(notif.createdAt).toLocaleString()}</div>
                </div>
                {!notif.isRead && (
                  <button className="btn btn-secondary" style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem'}} onClick={() => markAsRead(notif.id)}>
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
