import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const TaskDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const fetchTaskDetails = async () => {
    try {
      const res = await api.get(`/tasks/${id}`);
      setTask(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (attachmentId: string, filename: string) => {
    try {
      const res = await api.get(`/tasks/${id}/attachments/${attachmentId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Failed to download file.');
    }
  };

  const handleDownloadAll = async () => {
    try {
      const res = await api.get(`/tasks/${id}/download-all`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `task-${id}-attachments.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Failed to download files.');
    }
  };

  const submitTask = async () => {
    setLoadingAction('submit');
    try {
      await api.post(`/tasks/${id}/submit`);
      await fetchTaskDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit task');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApprovalAction = async (action: 'approve' | 'reject' | 'changes') => {
    const payload: any = {};
    if (action === 'reject') {
      const reason = prompt('Please enter rejection reason:');
      if (!reason) return;
      payload.reason = reason;
    } else if (action === 'changes') {
      const comment = prompt('Please enter requested changes:');
      if (!comment) return;
      payload.comment = comment;
    }

    setLoadingAction(action);
    try {
      await api.post(`/approvals/${id}/${action}`, payload);
      await fetchTaskDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action} task`);
    } finally {
      setLoadingAction(null);
    }
  };

  if (!task) return <div>Loading...</div>;

  const isAssignee = task.assignedTo?.userId === user?.id;
  const canSubmit = isAssignee && (task.status === 'ASSIGNED' || task.status === 'CHANGES_REQUESTED');
  const isApprover = task.currentApproverRole === user?.role;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button className="btn btn-secondary mb-4" onClick={() => navigate(-1)}>&larr; Back</button>
          <h1 className="text-2xl font-bold">{task.title}</h1>
        </div>
        <div>
          {canSubmit && (
            <button className="btn btn-primary" onClick={submitTask} disabled={!!loadingAction}>
              {loadingAction === 'submit' ? 'Submitting...' : 'Submit Task'}
            </button>
          )}
          {isApprover && (
            <div className="flex gap-2">
              <button className="btn btn-success" style={{background:'var(--success)', color:'white'}} onClick={() => handleApprovalAction('approve')} disabled={!!loadingAction}>
                {loadingAction === 'approve' ? 'Approving...' : 'Approve'}
              </button>
              <button className="btn btn-danger" onClick={() => handleApprovalAction('reject')} disabled={!!loadingAction}>
                {loadingAction === 'reject' ? 'Rejecting...' : 'Reject'}
              </button>
              <button className="btn btn-secondary" style={{borderColor:'var(--warning)', color:'var(--warning)'}} onClick={() => handleApprovalAction('changes')} disabled={!!loadingAction}>
                {loadingAction === 'changes' ? 'Requesting...' : 'Request Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">
        <div className="card" style={{flex:2}}>
          <h2 className="font-bold mb-4 border-b pb-2">Description</h2>
          <p className="whitespace-pre-wrap">{task.description}</p>
          
          <h2 className="font-bold mt-8 mb-4 border-b pb-2">Attachments</h2>
          {task.attachments && task.attachments.length > 0 ? (
            <div>
              {task.attachments.length > 1 && (
                <div className="mb-4 p-4 bg-gray-50 rounded border">
                  <p className="mb-2 font-bold">Multiple attachments found.</p>
                  <button className="btn btn-secondary text-sm" onClick={handleDownloadAll}>Download all as ZIP</button>
                </div>
              )}
              <ul className="flex flex-col gap-2">
                {task.attachments.map((file: any) => (
                  <li key={file.id} className="flex justify-between items-center p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📄</span>
                      <div>
                        <div className="font-bold">{file.originalName}</div>
                        <div className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                    <button className="btn btn-secondary text-sm" onClick={() => handleDownload(file.id, file.originalName)}>Download</button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted">No attachments.</p>
          )}

          <h2 className="font-bold mt-8 mb-4 border-b pb-2">Timeline</h2>
          <div className="flex flex-col gap-4">
            {task.timeline && task.timeline.map((event: any, index: number) => (
              <div key={index} className="flex gap-4 p-3 bg-gray-50 rounded border">
                <div className="font-bold">{event.action}</div>
                <div className="text-muted">
                  by {event.actorName} ({event.actorRole}) - {new Date(event.timestamp).toLocaleString()}
                </div>
                {event.reason && <div className="text-sm italic block w-full mt-2">"{event.reason}"</div>}
              </div>
            ))}
          </div>
        </div>
        
        <div className="card" style={{flex:1}}>
          <h2 className="font-bold mb-4 border-b pb-2">Details</h2>
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-muted text-sm">Created By</div>
              <div className="font-bold">{task.createdBy.name}</div>
            </div>
            <div>
              <div className="text-muted text-sm">Assigned To</div>
              <div className="font-bold">{task.assignedTo ? task.assignedTo.name : 'Unassigned'}</div>
            </div>
            <div>
              <div className="text-muted text-sm">Status</div>
              <div><span className="badge badge-info">{task.status}</span></div>
            </div>
            {task.currentApproverRole && (
              <div>
                <div className="text-muted text-sm">Pending Approval By</div>
                <div className="font-bold">{task.currentApproverRole}</div>
              </div>
            )}
            <div>
              <div className="text-muted text-sm">Priority</div>
              <div><span className="badge badge-warning">{task.priority}</span></div>
            </div>
            <div>
              <div className="text-muted text-sm">Due Date</div>
              <div className="font-bold">{new Date(task.dueDate).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;
