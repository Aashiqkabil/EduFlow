import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    tasks: 0,
    pendingApprovals: 0,
    completed: 0
  });

  useEffect(() => {
    if (user) {
      Promise.all([
        api.get('/tasks'),
        api.get(`/approvals?role=${user.role}&department=${user.department}`)
      ]).then(([tasksRes, approvalsRes]) => {
        const userTasks = tasksRes.data.filter((t: any) => 
          t.createdBy.userId === user.id || 
          (t.assignedTo && t.assignedTo.userId === user.id)
        );
        
        setStats({
          tasks: userTasks.length,
          pendingApprovals: approvalsRes.data.length,
          completed: userTasks.filter((t: any) => t.status === 'APPROVED' || t.status === 'COMPLETED').length
        });
      }).catch(err => console.error(err));
    }
  }, [user]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Good Morning, {user?.name.split(' ')[0]}</h1>
      <p className="text-muted mt-2">Here's what's happening today.</p>

      <div className="flex gap-6 mt-6">
        <div className="card" style={{flex:1}}>
          <div className="text-muted font-bold">My Tasks</div>
          <div style={{fontSize:'2.5rem', fontWeight:800, color:'var(--primary)'}}>{stats.tasks}</div>
        </div>
        {(user?.role !== 'Staff') && (
          <div className="card" style={{flex:1}}>
            <div className="text-muted font-bold">Pending Approvals</div>
            <div style={{fontSize:'2.5rem', fontWeight:800, color:'var(--warning)'}}>{stats.pendingApprovals}</div>
          </div>
        )}
        <div className="card" style={{flex:1}}>
          <div className="text-muted font-bold">Completed Tasks</div>
          <div style={{fontSize:'2.5rem', fontWeight:800, color:'var(--success)'}}>{stats.completed}</div>
        </div>
      </div>

      <div className="flex gap-6 mt-6">
        <div className="card" style={{flex:2}}>
          <h2 className="font-bold mb-4">Quick Actions</h2>
          <div className="flex gap-4">
            <button className="btn btn-primary" onClick={() => navigate('/tasks/create')}>+ Create Task</button>
            <button className="btn btn-secondary" onClick={() => navigate('/tasks')}>View My Tasks</button>
            {(user?.role !== 'Staff') && (
               <button className="btn btn-secondary" onClick={() => navigate('/approvals')}>View Pending Approvals</button>
            )}
          </div>
        </div>
        <div className="card" style={{flex:1}}>
          <h2 className="font-bold mb-4">Recent Activity</h2>
          <div className="text-muted text-center" style={{padding:'2rem 0'}}>
            No recent activity to show.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
