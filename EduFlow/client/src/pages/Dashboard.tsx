import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, assigned: 0, pendingApprovals: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchers = [api.get('/tasks')];
    const isApprover = ['HOD', 'Dean', 'Principal', 'Admin'].includes(user.role);
    if (isApprover) fetchers.push(api.get('/approvals'));

    Promise.all(fetchers).then(([tasksRes, approvalsRes]) => {
      const tasks: any[] = tasksRes.data;
      setStats({
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'PENDING_APPROVAL').length,
        approved: tasks.filter(t => t.status === 'APPROVED').length,
        assigned: tasks.filter(t => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS').length,
        pendingApprovals: approvalsRes ? approvalsRes.data.length : 0,
      });
    }).catch(console.error);
  }, [user]);

  const isApprover = ['HOD', 'Dean', 'Principal', 'Admin'].includes(user?.role || '');

  return (
    <div>
      <h1 className="text-2xl font-bold">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋</h1>
      <p className="text-muted mt-2">Here's what's happening today.</p>

      <div className="flex gap-4 mt-6" style={{ flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 1 150px' }}>
          <div className="text-muted font-bold" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>My Tasks</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.5rem' }}>{stats.total}</div>
        </div>
        {stats.assigned > 0 && (
          <div className="card" style={{ flex: '1 1 150px' }}>
            <div className="text-muted font-bold" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>In Progress</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--info)', marginTop: '0.5rem' }}>{stats.assigned}</div>
          </div>
        )}
        <div className="card" style={{ flex: '1 1 150px' }}>
          <div className="text-muted font-bold" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Pending Approval</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.5rem' }}>{stats.pending}</div>
        </div>
        <div className="card" style={{ flex: '1 1 150px' }}>
          <div className="text-muted font-bold" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Approved</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.5rem' }}>{stats.approved}</div>
        </div>
        {isApprover && (
          <div className="card" style={{ flex: '1 1 150px' }}>
            <div className="text-muted font-bold" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Awaiting My Approval</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.5rem' }}>{stats.pendingApprovals}</div>
          </div>
        )}
      </div>

      <div className="flex gap-6 mt-6">
        <div className="card" style={{ flex: 2 }}>
          <h2 className="font-bold mb-4">Quick Actions</h2>
          <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/tasks/create')}>+ Create Task</button>
            <button className="btn btn-secondary" onClick={() => navigate('/tasks')}>View My Tasks</button>
            {isApprover && (
              <button className="btn btn-secondary" onClick={() => navigate('/approvals')}
                style={stats.pendingApprovals > 0 ? { borderColor: 'var(--warning)', color: 'var(--warning)' } : {}}>
                {stats.pendingApprovals > 0 ? `🔔 ${stats.pendingApprovals} Pending Approvals` : 'Pending Approvals'}
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => navigate('/notifications')}>Notifications</button>
          </div>
        </div>
        <div className="card" style={{ flex: 1 }}>
          <h2 className="font-bold mb-3">Your Role</h2>
          <div>
            <div className="text-muted" style={{ fontSize: '0.82rem' }}>Logged in as</div>
            <div className="font-bold" style={{ fontSize: '1.05rem', marginTop: '0.2rem' }}>{user?.name}</div>
            <div style={{ marginTop: '0.4rem' }}>
              <span className="badge badge-info">{user?.role}</span>
            </div>
            <div className="text-muted" style={{ fontSize: '0.82rem', marginTop: '0.5rem' }}>{user?.department}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
