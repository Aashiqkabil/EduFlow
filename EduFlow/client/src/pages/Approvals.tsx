import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const Approvals = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApprovals();
  }, [user]);

  const fetchApprovals = async () => {
    if (user) {
      try {
        const res = await api.get('/approvals');
        setTasks(res.data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAction = async (taskId: string, action: 'approve' | 'reject' | 'changes', reason?: string) => {
    setLoadingAction(`${taskId}-${action}`);
    try {
      const payload: any = {};
      if (action !== 'approve') payload[action === 'reject' ? 'reason' : 'comment'] = reason;
      
      await api.post(`/approvals/${taskId}/${action}`, payload);
      await fetchApprovals();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Action failed.');
    } finally {
      setLoadingAction(null);
    }
  };

  const promptAction = (taskId: string, action: 'reject' | 'changes') => {
    const reason = prompt(`Please enter ${action === 'reject' ? 'rejection reason' : 'changes required'}:`);
    if (reason) {
      handleAction(taskId, action, reason);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pending Approvals</h1>

      {tasks.length === 0 ? (
        <div className="card text-center py-12 text-muted">
          No pending approvals at the moment.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {tasks.map(task => (
            <div key={task.id} className="card flex justify-between items-center" style={{padding: '1.5rem'}}>
              <div>
                <h3 className="font-bold text-lg">{task.title}</h3>
                <div className="text-muted text-sm mt-1">
                  Created by: {task.createdBy?.name} ({task.createdBy?.role})
                </div>
                <div className="mt-2">
                  <span className="badge badge-warning">{task.status}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={() => navigate(`/tasks/${task.id}`)}>Review Details</button>
                <button 
                  className="btn btn-success" 
                  style={{background:'var(--success)', color:'white'}} 
                  onClick={() => handleAction(task.id, 'approve')}
                  disabled={!!loadingAction}
                >
                  {loadingAction === `${task.id}-approve` ? 'Approving...' : 'Approve'}
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => promptAction(task.id, 'reject')}
                  disabled={!!loadingAction}
                >
                  {loadingAction === `${task.id}-reject` ? 'Rejecting...' : 'Reject'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{borderColor:'var(--warning)', color:'var(--warning)'}} 
                  onClick={() => promptAction(task.id, 'changes')}
                  disabled={!!loadingAction}
                >
                  {loadingAction === `${task.id}-changes` ? 'Requesting...' : 'Request Changes'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Approvals;
