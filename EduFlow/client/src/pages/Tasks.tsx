import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const statusColor = (s: string) => {
  if (s === 'APPROVED') return 'badge-success';
  if (s === 'PENDING_APPROVAL') return 'badge-warning';
  if (s === 'REJECTED') return 'badge-danger';
  if (s === 'CHANGES_REQUESTED') return 'badge-warning';
  if (s === 'IN_PROGRESS') return 'badge-info';
  if (s === 'ASSIGNED') return 'badge-info';
  return 'badge-neutral';
};

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  };

  const handleDelete = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(ts => ts.filter(t => t.id !== taskId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <button className="btn btn-primary" onClick={() => navigate('/tasks/create')}>+ Create Task</button>
      </div>

      {loading ? (
        <div className="card text-center py-8 text-muted">Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <div className="card text-center py-12">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <div className="font-bold mb-2">No tasks yet</div>
          <div className="text-muted mb-4">Create your first task to get started.</div>
          <button className="btn btn-primary" onClick={() => navigate('/tasks/create')}>+ Create Task</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Task Type</th>
                  <th>Class</th>
                  <th>Semester</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => {
                  const meta = task.taskMeta || {};
                  const canDelete = task.createdBy?.userId === user?.id && ['DRAFT', 'REJECTED'].includes(task.status);
                  return (
                    <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/tasks/${task.id}`)}>
                      <td>
                        <div className="font-bold" style={{ fontSize: '0.9rem' }}>{task.taskType || task.title}</div>
                        {task.taskType && task.title && task.title !== task.taskType &&
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{task.title}</div>}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{meta.className || '—'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{meta.semester ? `Sem ${meta.semester}` : '—'}</td>
                      <td>
                        <span className={`badge ${statusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {task.assignedTo ? (
                          <span>
                            {task.assignedTo.name}
                            {task.assignmentType === 'ASSIGNED' &&
                              <span className="text-muted" style={{ fontSize: '0.7rem', marginLeft: '0.3rem' }}>(assigned)</span>}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                            onClick={() => navigate(`/tasks/${task.id}`)}>View</button>
                          {canDelete && (
                            <button className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                              onClick={e => handleDelete(task.id, e)}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
