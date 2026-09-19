import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CreateTask = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [assignmentType, setAssignmentType] = useState('SELF'); // SELF or ASSIGNED
  const [assignedToId, setAssignedToId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [taskTypes, setTaskTypes] = useState<string[]>([]);

  // Load configured task types from backend
  useEffect(() => {
    api.get('/tasks/task-types').then(res => setTaskTypes(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (assignmentType === 'ASSIGNED') {
      api.get('/users').then(res => {
        let validUsers = res.data;
        if (user?.role === 'HOD') {
           validUsers = validUsers.filter((u: any) => u.department === user.department && u.role === 'Staff');
        } else if (user?.role === 'Dean') {
           validUsers = validUsers.filter((u: any) => u.role === 'HOD');
        } else if (user?.role === 'Principal') {
           validUsers = validUsers.filter((u: any) => u.role === 'Dean');
        }
        setUsers(validUsers);
      }).catch(err => console.error(err));
    }
  }, [assignmentType, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (assignmentType === 'ASSIGNED' && !assignedToId) {
      setError('Please select a user to assign to.');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('taskType', taskType);
      formData.append('priority', priority);
      formData.append('dueDate', dueDate);
      formData.append('assignmentType', assignmentType);
      
      if (assignmentType === 'ASSIGNED') {
        formData.append('assignedToId', assignedToId);
      }
      
      if (file) {
        formData.append('files', file);
      }
      
      await api.post('/tasks', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      navigate('/tasks');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button className="btn btn-secondary mb-4" onClick={() => navigate('/tasks')}>&larr; Back to Tasks</button>
          <h1 className="text-2xl font-bold">Create New Task</h1>
        </div>
      </div>
      
      {error && <div className="card text-danger font-bold mb-4">{error}</div>}

      <div className="card">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Task Type — drives automatic approval routing */}
          <div className="form-group">
            <label>Task Type</label>
            <select className="input" value={taskType} onChange={e => setTaskType(e.target.value)} required>
              <option value="">[ Select task type ]</option>
              {taskTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Task Title</label>
            <input type="text" className="input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Enter task title" />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea className="input" rows={4} value={description} onChange={e => setDescription(e.target.value)} required placeholder="Enter detailed description" />
          </div>
          
          <div className="flex gap-4">
            <div className="form-group" style={{flex: 1}}>
              <label>Priority</label>
              <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label>Due Date</label>
              <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            </div>
          </div>
          
          {user?.role !== 'Staff' && (
            <div className="form-group border-t pt-4 mt-2">
              <label className="font-bold block mb-2">Task Assignment</label>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="assignment" value="SELF" checked={assignmentType === 'SELF'} onChange={() => setAssignmentType('SELF')} />
                  For Myself
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="assignment" value="ASSIGNED" checked={assignmentType === 'ASSIGNED'} onChange={() => setAssignmentType('ASSIGNED')} />
                  Assign to someone
                </label>
              </div>
              
              {assignmentType === 'SELF' ? (
                <div className="p-3 bg-gray-100 rounded text-sm text-gray-700 font-bold border" style={{background: '#f8f9fa', color: 'black'}}>
                  Assigned to: You
                </div>
              ) : (
                <div className="form-group">
                  <label>Select Staff Member</label>
                  <select className="input" value={assignedToId} onChange={e => setAssignedToId(e.target.value)} required>
                    <option value="">[ Select staff member ]</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          
          <div className="form-group border-t pt-4 mt-2">
            <label className="font-bold block mb-2">Attachment</label>
            <input type="file" className="input" onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
            {file && <div className="text-sm text-muted mt-2">Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</div>}
          </div>

          <div className="flex justify-end mt-4 gap-4">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/tasks')} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTask;
