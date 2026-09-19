import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusClass = (status: string) => {
    if (status === 'COMPLETED' || status === 'APPROVED') return 'badge-success';
    if (status === 'IN_PROGRESS' || status === 'SUBMITTED' || status === 'CHANGES_REQUESTED') return 'badge-info';
    if (status === 'REJECTED' || status === 'OVERDUE') return 'badge-danger';
    return 'badge-neutral';
  };

  const getPriorityClass = (priority: string) => {
    if (priority === 'Critical') return 'badge-danger';
    if (priority === 'High') return 'badge-warning';
    if (priority === 'Medium') return 'badge-info';
    return 'badge-neutral';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <button className="btn btn-primary" onClick={() => navigate('/tasks/create')}>+ Create Task</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">No tasks found.</td>
                </tr>
              ) : (
                tasks.map(task => (
                  <tr key={task.id}>
                    <td className="font-bold">{task.title}</td>
                    <td><span className={`badge ${getPriorityClass(task.priority)}`}>{task.priority}</span></td>
                    <td>{new Date(task.dueDate).toLocaleDateString()}</td>
                    <td><span className={`badge ${getStatusClass(task.status)}`}>{task.status}</span></td>
                    <td>{task.assignedTo ? task.assignedTo.name : 'Unknown'}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => navigate(`/tasks/${task.id}`)}>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Tasks;
