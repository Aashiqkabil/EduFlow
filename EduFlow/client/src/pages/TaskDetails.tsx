import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TASK_CONFIG: Record<string, { classData: boolean; averageAttendance: boolean; file: boolean; tbd?: boolean }> = {
  'Attendance Report': { classData: true, averageAttendance: true, file: true },
  'Performance Report': { classData: true, averageAttendance: false, file: true },
  'Result Analysis': { classData: false, averageAttendance: false, file: false, tbd: true },
  'Assignment Submission': { classData: false, averageAttendance: false, file: false, tbd: true },
  'Internal Assessment': { classData: false, averageAttendance: false, file: false, tbd: true },
  'Student Feedback Collection': { classData: false, averageAttendance: false, file: false, tbd: true },
};

const statusColor = (s: string) => {
  if (s === 'APPROVED') return { background: '#d1fae5', color: '#065f46' };
  if (s === 'PENDING_APPROVAL') return { background: '#fef3c7', color: '#92400e' };
  if (s === 'REJECTED') return { background: '#fee2e2', color: '#991b1b' };
  if (s === 'CHANGES_REQUESTED') return { background: '#fef9c3', color: '#713f12' };
  if (s === 'IN_PROGRESS') return { background: '#dbeafe', color: '#1e40af' };
  if (s === 'ASSIGNED') return { background: '#e0e7ff', color: '#3730a3' };
  return { background: '#f3f4f6', color: '#374151' };
};

// ─── Modal for rejection/changes reason input ─────────────────────────────────
const ReasonModal = ({ title, label, onConfirm, onCancel }: {
  title: string; label: string;
  onConfirm: (r: string) => void; onCancel: () => void;
}) => {
  const [val, setVal] = useState('');
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold mb-4">{title}</h2>
        <textarea className="input" rows={4} value={val} onChange={e => setVal(e.target.value)}
          placeholder={label} autoFocus />
        <div className="flex gap-3 mt-4 justify-end">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" disabled={!val.trim()} onClick={() => val.trim() && onConfirm(val.trim())}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Staff completion form for ASSIGNED/IN_PROGRESS/REJECTED/CHANGES_REQUESTED/DRAFT ─
const StaffCompletionForm = ({ task, onSaved }: { task: any; onSaved: (t: any) => void }) => {
  const [averageAttendance, setAverageAttendance] = useState(
    task.taskMeta?.averageAttendance != null ? String(task.taskMeta.averageAttendance) : ''
  );
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  
  const config = TASK_CONFIG[task.taskType as string] || { classData: false, averageAttendance: false, file: false, tbd: true };

  const handleSubmit = async () => {
    setErr('');
    if (config.averageAttendance && !averageAttendance) {
      setErr('Average attendance is required'); return;
    }
    if (config.file && !file && (!task.attachments || task.attachments.length === 0)) {
      setErr('A report file is required'); return;
    }
    setSubmitting(true);
    try {
      // PATCH to save completion data
      const fd = new FormData();
      const meta: any = {};
      if (config.averageAttendance) meta.averageAttendance = parseFloat(averageAttendance);
      fd.append('taskMeta', JSON.stringify(meta));
      if (file) fd.append('files', file);
      await api.patch(`/tasks/${task.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      // Then submit for approval
      const submitRes = await api.post(`/tasks/${task.id}/submit`);
      onSaved(submitRes.data);
    } catch (e: any) {
      setErr(e.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (config.tbd) {
    return (
      <div className="card" style={{ border: '2px solid var(--warning)', marginTop: '1.5rem', background: '#fef9c3' }}>
        <h3 className="font-bold mb-2" style={{ color: '#713f12' }}>Submission Not Available</h3>
        <p style={{ color: '#78350f', fontSize: '0.85rem' }}>This task type is currently in development (TBD). You cannot submit it for approval yet.</p>
      </div>
    );
  }

  const hasExistingFile = task.attachments && task.attachments.length > 0;

  return (
    <div className="card" style={{ border: '2px solid var(--primary)', marginTop: '1.5rem' }}>
      <h3 className="font-bold mb-4" style={{ color: 'var(--primary)' }}>📝 Submit for Approval</h3>
      {err && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }}>{err}</div>}

      {config.averageAttendance && (
        <div className="form-group">
          <label className="form-label">Average Class Attendance (%) *</label>
          <input type="number" className="input" min={0} max={100} step={0.1}
            value={averageAttendance} onChange={e => setAverageAttendance(e.target.value)}
            placeholder="e.g. 87.5" />
        </div>
      )}

      {config.file && (
        <div className="form-group">
          <label className="form-label">{hasExistingFile ? 'Upload New Report (Optional)' : 'Upload Report *'}</label>
          <input type="file" className="input" accept=".pdf,.doc,.docx,.xls,.xlsx"
            onChange={e => setFile(e.target.files?.[0] || null)} />
          {file && <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>📎 {file.name}</div>}
          <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>PDF, DOC, DOCX, XLS, XLSX</div>
        </div>
      )}

      <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ width: '100%', marginTop: '0.5rem' }}>
        {submitting ? 'Submitting…' : '📤 Submit for Approval'}
      </button>
    </div>
  );
};

// ─── Delete confirmation dialog ────────────────────────────────────────────────
const DeleteConfirm = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <h2 className="font-bold mb-2">Delete Task</h2>
      <p className="text-muted mb-6">Are you sure you want to delete this task? This action cannot be undone.</p>
      <div className="flex gap-3 justify-end">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
const TaskDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [modal, setModal] = useState<'reject' | 'changes' | 'delete' | null>(null);
  const [startingTask, setStartingTask] = useState(false);

  useEffect(() => { fetchTask(); }, [id]);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tasks/${id}`);
      setTask(res.data);
    } catch { navigate('/tasks'); }
    finally { setLoading(false); }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }} className="text-muted">Loading…</div>;
  if (!task) return null;

  const meta = task.taskMeta || {};

  // ── Authorization flags ──────────────────────────────────────────────────
  // SECURITY FIX: use exact userId, not role
  const isExactApprover = task.currentApproverId && task.currentApproverId === user?.id;
  const isAssignee = task.assignedTo?.userId === user?.id;
  const isCreator = task.createdBy?.userId === user?.id;

  const canSubmit = isAssignee && ['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'CHANGES_REQUESTED', 'REJECTED'].includes(task.status);
  const canStart = isAssignee && task.status === 'ASSIGNED';
  const canDelete = isCreator && ['DRAFT', 'REJECTED'].includes(task.status);
  const isPending = task.status === 'PENDING_APPROVAL';
  const isHODAssigned = task.assignmentType === 'ASSIGNED';

  const staffNeedsToComplete = isAssignee &&
    ['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'CHANGES_REQUESTED', 'REJECTED'].includes(task.status);

  // Latest rejection reason
  const latestRejection = [...(task.timeline || [])].reverse()
    .find((e: any) => e.action === 'REJECTED' && e.reason);
  const latestChangesReq = [...(task.timeline || [])].reverse()
    .find((e: any) => e.action === 'CHANGES_REQUESTED' && e.reason);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleDownload = async (attachmentId: string, filename: string) => {
    const res = await api.get(`/tasks/${id}/attachments/${attachmentId}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  };

  const handleApproval = async (action: 'approve', payload?: any) => {
    setLoadingAction(action);
    try {
      await api.post(`/approvals/${id}/${action}`, payload || {});
      await fetchTask();
    } catch (e: any) { alert(e.response?.data?.message || `Failed to ${action}`); }
    finally { setLoadingAction(null); }
  };

  const handleReasonAction = async (action: 'reject' | 'changes', reason: string) => {
    setModal(null);
    setLoadingAction(action);
    const key = action === 'reject' ? 'reason' : 'comment';
    try {
      await api.post(`/approvals/${id}/${action}`, { [key]: reason });
      await fetchTask();
    } catch (e: any) { alert(e.response?.data?.message || `Failed to ${action}`); }
    finally { setLoadingAction(null); }
  };

  const handleStart = async () => {
    setStartingTask(true);
    try { await api.post(`/tasks/${id}/start`); await fetchTask(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed to start task'); }
    finally { setStartingTask(false); }
  };

  const handleDelete = async () => {
    setModal(null);
    try { await api.delete(`/tasks/${id}`); navigate('/tasks'); }
    catch (e: any) { alert(e.response?.data?.message || 'Delete failed'); }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Modals */}
      {modal === 'reject' && <ReasonModal title="Reject Task" label="Rejection reason (required)…" onConfirm={r => handleReasonAction('reject', r)} onCancel={() => setModal(null)} />}
      {modal === 'changes' && <ReasonModal title="Request Changes" label="Describe the required changes…" onConfirm={r => handleReasonAction('changes', r)} onCancel={() => setModal(null)} />}
      {modal === 'delete' && <DeleteConfirm onConfirm={handleDelete} onCancel={() => setModal(null)} />}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button className="btn btn-secondary mb-3" onClick={() => navigate(-1)}>← Back</button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{task.taskType || task.title}</h1>
            <span className="badge" style={statusColor(task.status)}>{task.status}</span>
          </div>
          {task.taskType && task.title !== task.taskType &&
            <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>{task.title}</div>}
        </div>
        <div className="flex gap-2">
          {canDelete && (
            <button className="btn btn-danger" onClick={() => setModal('delete')}>🗑️ Delete</button>
          )}
          {isExactApprover && isPending && (
            <>
              <button className="btn btn-secondary" style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}
                onClick={() => setModal('changes')} disabled={!!loadingAction}>
                {loadingAction === 'changes' ? '…' : 'Request Changes'}
              </button>
              <button className="btn btn-danger" onClick={() => setModal('reject')} disabled={!!loadingAction}>
                {loadingAction === 'reject' ? 'Rejecting…' : 'Reject'}
              </button>
              <button className="btn btn-primary" style={{ background: 'var(--success)' }}
                onClick={() => handleApproval('approve')} disabled={!!loadingAction}>
                {loadingAction === 'approve' ? 'Approving…' : '✅ Approve'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Rejection / Changes banner */}
      {task.status === 'REJECTED' && latestRejection && (
        <div className="card mb-4" style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
          <strong style={{ color: '#991b1b' }}>❌ Rejected</strong>
          <p style={{ color: '#7f1d1d', marginTop: '0.4rem' }}>{latestRejection.reason}</p>
          <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.35rem' }}>
            by {latestRejection.actorName} on {new Date(latestRejection.timestamp).toLocaleString()}
          </div>
        </div>
      )}
      {task.status === 'CHANGES_REQUESTED' && latestChangesReq && (
        <div className="card mb-4" style={{ background: '#fef9c3', border: '1px solid #fde047' }}>
          <strong style={{ color: '#713f12' }}>⚠️ Changes Requested</strong>
          <p style={{ color: '#78350f', marginTop: '0.4rem' }}>{latestChangesReq.reason}</p>
          <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '0.35rem' }}>
            by {latestChangesReq.actorName} on {new Date(latestChangesReq.timestamp).toLocaleString()}
          </div>
        </div>
      )}

      <div className="flex gap-6" style={{ alignItems: 'flex-start' }}>
        {/* Left column */}
        <div style={{ flex: 2 }}>

          {/* Task Info Card */}
          <div className="card mb-4">
            <h2 className="font-bold mb-4 border-b pb-2">Task Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                ['Task Type', task.taskType || '—'],
                isHODAssigned ? ['Assigned By', `${task.createdBy?.name} (${task.createdBy?.role})`] : ['Created By', task.createdBy?.name],
                ['Assigned To', task.assignedTo?.name || '—'],
                ['Class', meta.className || '—'],
                ['Semester', meta.semester ? `Semester ${meta.semester}` : '—'],
                ['Academic Year', meta.academicYear || '—'],
                meta.averageAttendance != null ? ['Average Attendance', `${meta.averageAttendance}%`] : null,
                ['Priority', task.priority || '—'],
                ['Due Date', task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'],
                ['Created', new Date(task.createdAt).toLocaleString()],
              ].filter(Boolean).map(([label, value], i) => (
                <div key={i}>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>{label}</div>
                  <div className="font-bold" style={{ marginTop: '0.2rem' }}>{value as string}</div>
                </div>
              ))}
            </div>
            {task.description && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                  {isHODAssigned ? 'Instructions' : 'Description'}
                </div>
                <p style={{ whiteSpace: 'pre-wrap' }}>{task.description}</p>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="card mb-4">
            <h2 className="font-bold mb-4 border-b pb-2">Attachments</h2>
            {task.attachments?.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {task.attachments.map((f: any) => (
                  <li key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 6 }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '1.3rem' }}>📄</span>
                      <div>
                        <div className="font-bold" style={{ fontSize: '0.9rem' }}>{f.originalName}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{(f.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                      onClick={() => handleDownload(f.id, f.originalName)}>Download</button>
                  </li>
                ))}
              </ul>
            ) : <div className="text-muted">No attachments yet.</div>}
          </div>

          {/* Timeline */}
          <div className="card">
            <h2 className="font-bold mb-4 border-b pb-2">Timeline</h2>
            <div className="flex flex-col gap-3">
              {(task.timeline || []).map((ev: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.6rem 0.9rem', background: 'var(--bg-color)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', minWidth: 130 }}>{ev.action}</div>
                  <div style={{ flex: 1 }}>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                      {ev.actorName} ({ev.actorRole}) — {new Date(ev.timestamp).toLocaleString()}
                    </div>
                    {ev.reason && <div style={{ fontSize: '0.82rem', marginTop: '0.3rem', color: '#92400e', fontStyle: 'italic' }}>"{ev.reason}"</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: actions + completion */}
        <div style={{ flex: 1 }}>
          {/* Status card */}
          <div className="card mb-4">
            <h3 className="font-bold mb-3">Status</h3>
            <span className="badge" style={{ ...statusColor(task.status), fontSize: '0.9rem', padding: '0.4rem 0.9rem' }}>
              {task.status}
            </span>
            {task.currentApproverRole && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Pending approval by: <strong>{task.currentApproverRole}</strong>
              </div>
            )}
          </div>

          {/* Start Task button (ASSIGNED → IN_PROGRESS) */}
          {canStart && !staffNeedsToComplete && (
            <div className="card mb-4">
              <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                This task has been assigned to you by {task.createdBy?.name}.
              </p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleStart} disabled={startingTask}>
                {startingTask ? 'Starting…' : '▶️ Start Task'}
              </button>
            </div>
          )}

          {/* Approval security notice (non-approver sees task in pending state) */}
          {isPending && !isExactApprover && (
            <div className="card mb-4" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '0.85rem', color: '#92400e' }}>
                ⏳ Pending approval by <strong>{task.currentApproverRole}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Staff completion form (shows for ASSIGNED/IN_PROGRESS/REJECTED/CHANGES_REQUESTED) */}
      {staffNeedsToComplete && (
        <StaffCompletionForm task={task} onSaved={updated => setTask(updated)} />
      )}
    </div>
  );
};

export default TaskDetails;
