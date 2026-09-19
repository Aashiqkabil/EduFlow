import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { ClassRecord } from '../types';

// ── Current academic year helper ──────────────────────────────────────────────
const buildAcademicYears = () => {
  const y = new Date().getFullYear();
  return [`${y - 1}–${y}`, `${y}–${y + 1}`, `${y + 1}–${y + 2}`];
};
const ACADEMIC_YEARS = buildAcademicYears();

// ── Which fields Staff must complete for each task type ──────────────────────
// HOD sees these only in Self mode; in Assign mode HOD provides header-only info.
const TASK_CONFIG: Record<string, { classData: boolean; averageAttendance: boolean; file: boolean; tbd?: boolean }> = {
  'Attendance Report': { classData: true, averageAttendance: true, file: true },
  'Performance Report': { classData: true, averageAttendance: false, file: true },
  'Result Analysis': { classData: false, averageAttendance: false, file: false, tbd: true },
  'Assignment Submission': { classData: false, averageAttendance: false, file: false, tbd: true },
  'Internal Assessment': { classData: false, averageAttendance: false, file: false, tbd: true },
  'Student Feedback Collection': { classData: false, averageAttendance: false, file: false, tbd: true },
};

type Step = 'type' | 'assign_staff' | 'form' | 'review';

interface FormState {
  taskType: string;
  performerMode: 'SELF' | 'ASSIGN';  // ASSIGN = HOD assigns to Staff
  selectedStaffId: string;
  selectedStaffName: string;
  // task meta
  classId: string;
  className: string;
  semester: string;
  academicYear: string;
  averageAttendance: string;
  // common
  description: string;
  priority: string;
  dueDate: string;
  // file
  file: File | null;
}

const INIT_FORM: FormState = {
  taskType: '', performerMode: 'SELF', selectedStaffId: '', selectedStaffName: '',
  classId: '', className: '', semester: '', academicYear: '', averageAttendance: '',
  description: '', priority: 'Medium', dueDate: '', file: null,
};

const CreateTask = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('type');
  const [form, setForm] = useState<FormState>(INIT_FORM);
  const [taskTypes, setTaskTypes] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffClasses, setStaffClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Derived
  const isHOD = user?.role === 'HOD';
  const isAssignMode = isHOD && form.performerMode === 'ASSIGN';

  // Semesters for the currently selected class
  const selectedClass = classes.find(c => c.id === form.classId)
    || staffClasses.find(c => c.id === form.classId);
  const availableSemesters: number[] = selectedClass?.semesters || [];

  // Load task types on mount
  useEffect(() => {
    api.get('/tasks/task-types').then(r => setTaskTypes(r.data)).catch(() => {});
  }, []);

  // Load own classes (for Self mode)
  useEffect(() => {
    if (user) {
      api.get('/classes').then(r => setClasses(r.data)).catch(() => {});
    }
  }, [user]);

  // Load staff list when HOD switches to ASSIGN mode
  useEffect(() => {
    if (isHOD && form.performerMode === 'ASSIGN') {
      api.get('/users').then(r => {
        setStaffList(r.data.filter((u: any) => u.role === 'Staff' && u.department === user?.department));
      }).catch(() => {});
    }
  }, [isHOD, form.performerMode, user?.department]);

  // Load classes for selected Staff (HOD assign mode)
  useEffect(() => {
    if (form.selectedStaffId) {
      api.get(`/classes/by-staff/${form.selectedStaffId}`)
        .then(r => { setStaffClasses(r.data); setForm(f => ({ ...f, classId: '', className: '', semester: '' })); })
        .catch(() => {});
    } else {
      setStaffClasses([]);
    }
  }, [form.selectedStaffId]);

  const upd = (field: keyof FormState) => (e: React.ChangeEvent<any>) => {
    const val = e.target.value;
    setForm(f => {
      const next = { ...f, [field]: val };
      // Reset class-dependent fields when class changes
      if (field === 'classId') {
        const cls = (isAssignMode ? staffClasses : classes).find(c => c.id === val);
        next.className = cls?.name || '';
        next.semester = '';
      }
      if (field === 'selectedStaffId') {
        const s = staffList.find(u => u.id === val);
        next.selectedStaffName = s?.name || '';
        next.classId = '';
        next.className = '';
        next.semester = '';
      }
      return next;
    });
  };

  // ── Step validators ──────────────────────────────────────────────────────
  const canProceedFromType = () => {
    if (!form.taskType) { setError('Please select a task type'); return false; }
    setError(''); return true;
  };

  const canProceedFromAssignStaff = () => {
    if (!form.selectedStaffId) { setError('Please select a staff member'); return false; }
    if (!form.classId) { setError('Please select a class'); return false; }
    setError(''); return true;
  };

  const canProceedFromForm = () => {
    const config = TASK_CONFIG[form.taskType] || { classData: false, averageAttendance: false, file: false, tbd: true };
    if (!isAssignMode && config.classData && !form.classId) { setError('Please select a class'); return false; }
    if (config.classData && !form.semester) { setError('Please select a semester'); return false; }
    if (config.classData && !form.academicYear) { setError('Please select an academic year'); return false; }
    if (!form.dueDate) { setError('Please set a due date'); return false; }
    if (!isAssignMode && config.averageAttendance && !form.averageAttendance) {
      setError('Please enter the average attendance percentage'); return false;
    }
    setError(''); return true;
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const nextStep = () => {
    if (step === 'type') {
      if (!canProceedFromType()) return;
      if (isAssignMode) { setStep('assign_staff'); return; }
      setStep('form');
    } else if (step === 'assign_staff') {
      if (!canProceedFromAssignStaff()) return;
      setStep('form');
    } else if (step === 'form') {
      if (!canProceedFromForm()) return;
      setStep('review');
    }
  };

  const prevStep = () => {
    if (step === 'form' && isAssignMode) { setStep('assign_staff'); return; }
    if (step === 'form' || step === 'assign_staff') { setStep('type'); return; }
    if (step === 'review') { setStep('form'); }
  };

  // ── Submission ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const taskMeta: any = {
        classId: form.classId,
        className: form.className,
        semester: form.semester ? parseInt(form.semester) : undefined,
        academicYear: form.academicYear,
      };
      const config = TASK_CONFIG[form.taskType] || { classData: false, averageAttendance: false, file: false, tbd: true };
      if (!isAssignMode && config.averageAttendance && form.averageAttendance) {
        taskMeta.averageAttendance = parseFloat(form.averageAttendance);
      }

      const fd = new FormData();
      fd.append('taskType', form.taskType);
      fd.append('description', form.description);
      fd.append('priority', form.priority);
      fd.append('dueDate', form.dueDate);
      fd.append('taskMeta', JSON.stringify(taskMeta));

      if (isAssignMode) {
        fd.append('assignmentType', 'ASSIGNED');
        fd.append('assignedToId', form.selectedStaffId);
      } else {
        fd.append('assignmentType', 'SELF');
      }

      if (!isAssignMode && form.file) {
        fd.append('files', form.file);
      }

      const res = await api.post('/tasks', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const createdTask = res.data;

      // For self-created tasks: immediately submit for approval
      if (!isAssignMode && !config.tbd) {
        await api.post(`/tasks/${createdTask.id}/submit`);
      }

      navigate('/tasks');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render Steps ──────────────────────────────────────────────────────────
  const classSource = isAssignMode ? staffClasses : classes;
  const config = TASK_CONFIG[form.taskType] || { classData: false, averageAttendance: false, file: false, tbd: true };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Back + Title */}
      <div className="flex items-center gap-4 mb-6">
        <button className="btn btn-secondary" onClick={() => navigate('/tasks')}>← Back</button>
        <h1 className="text-2xl font-bold">Create Task</h1>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-2 mb-6" style={{ fontSize: '0.8rem' }}>
        {['Type', isHOD && form.performerMode === 'ASSIGN' ? 'Staff' : null, 'Details', 'Review']
          .filter(Boolean)
          .map((label, i, arr) => (
            <React.Fragment key={label as string}>
              <span style={{
                padding: '0.2rem 0.7rem', borderRadius: 99,
                background: (
                  (label === 'Type' && (step === 'type')) ||
                  (label === 'Staff' && step === 'assign_staff') ||
                  (label === 'Details' && step === 'form') ||
                  (label === 'Review' && step === 'review')
                ) ? 'var(--primary)' : 'var(--border)',
                color: (
                  (label === 'Type' && step === 'type') ||
                  (label === 'Staff' && step === 'assign_staff') ||
                  (label === 'Details' && step === 'form') ||
                  (label === 'Review' && step === 'review')
                ) ? 'white' : 'var(--text-muted)',
                fontWeight: 600
              }}>{label}</span>
              {i < arr.length - 1 && <span style={{ color: 'var(--border)', lineHeight: '1.8' }}>→</span>}
            </React.Fragment>
          ))}
      </div>

      {error && (
        <div className="card mb-4" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {/* ── STEP 1: Task Type + Performer Mode ────────────────────────── */}
      {step === 'type' && (
        <div className="card">
          <h2 className="font-bold mb-4">Select Task Type</h2>

          <div className="form-group">
            <label className="form-label">Task Type *</label>
            <select className="input" value={form.taskType} onChange={upd('taskType')} required>
              <option value="">— Select a task type —</option>
              {taskTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {isHOD && (
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">Task Performer</label>
              <div className="flex gap-4 mt-2">
                {(['SELF', 'ASSIGN'] as const).map(mode => (
                  <label key={mode} className="flex items-center gap-2" style={{ cursor: 'pointer', padding: '0.75rem 1.25rem', border: `2px solid ${form.performerMode === mode ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8, flex: 1, justifyContent: 'center' }}>
                    <input type="radio" name="performer" value={mode} checked={form.performerMode === mode} onChange={() => setForm(f => ({ ...f, performerMode: mode, selectedStaffId: '', selectedStaffName: '', classId: '', className: '', semester: '' }))} style={{ display: 'none' }} />
                    <span style={{ fontWeight: 600, color: form.performerMode === mode ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {mode === 'SELF' ? '🧑‍💼 Self' : '👥 Assign to Staff'}
                    </span>
                  </label>
                ))}
              </div>
              {form.performerMode === 'ASSIGN' && (
                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  You will assign this task to a staff member. They will complete and submit it for approval.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button className="btn btn-primary" onClick={nextStep}>Next →</button>
          </div>
        </div>
      )}

      {/* ── STEP 2: HOD selects Staff + Class ─────────────────────────── */}
      {step === 'assign_staff' && (
        <div className="card">
          <h2 className="font-bold mb-4">Assign to Staff</h2>

          <div className="form-group">
            <label className="form-label">Staff Member *</label>
            <select className="input" value={form.selectedStaffId} onChange={upd('selectedStaffId')}>
              <option value="">— Select staff —</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.employeeId}</option>
              ))}
            </select>
          </div>

          {form.selectedStaffId && (
            <div className="form-group">
              <label className="form-label">Class Handled by {form.selectedStaffName || 'this Staff'} *</label>
              {staffClasses.length === 0 ? (
                <div className="text-muted" style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 6 }}>
                  No classes found for this staff member.
                </div>
              ) : (
                <select className="input" value={form.classId} onChange={upd('classId')}>
                  <option value="">— Select class —</option>
                  {staffClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button className="btn btn-secondary" onClick={prevStep}>← Back</button>
            <button className="btn btn-primary" onClick={nextStep}>Next →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Task-specific form ─────────────────────────────────── */}
      {step === 'form' && (
        <div className="card">
          <h2 className="font-bold mb-1">{form.taskType}</h2>
          {isAssignMode && (
            <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>
              Assigning to: <strong>{form.selectedStaffName}</strong>
            </p>
          )}

          {config.tbd && (
            <div className="card mb-4" style={{ background: '#fef9c3', border: '1px solid #fde047' }}>
              <strong style={{ color: '#713f12' }}>⚠️ Form Not Yet Configured</strong>
              <p style={{ color: '#78350f', marginTop: '0.4rem', fontSize: '0.85rem' }}>
                The detailed requirements for this task type are currently marked as TBD. You can add a description and save it as a draft, but submission for approval is not yet available.
              </p>
            </div>
          )}

          {/* Class (only visible in self mode; assign mode class chosen in prev step) */}
          {!isAssignMode && config.classData && (
            <div className="form-group">
              <label className="form-label">Class *</label>
              <select className="input" value={form.classId} onChange={upd('classId')}>
                <option value="">— Select class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {isAssignMode && form.className && config.classData && (
            <div className="form-group">
              <label className="form-label">Class</label>
              <div className="input" style={{ background: 'var(--bg-color)', color: 'var(--text-muted)' }}>
                {form.className}
              </div>
            </div>
          )}

          {config.classData && (
            <div className="flex gap-4">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Semester *</label>
                <select className="input" value={form.semester} onChange={upd('semester')} disabled={!form.classId}>
                  <option value="">— Select —</option>
                  {availableSemesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Academic Year *</label>
                <select className="input" value={form.academicYear} onChange={upd('academicYear')}>
                  <option value="">— Select —</option>
                  {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Staff completion fields — only in Self mode */}
          {!isAssignMode && config.averageAttendance && (
            <div className="form-group">
              <label className="form-label">Average Class Attendance (%) *</label>
              <input
                type="number" className="input" min={0} max={100} step={0.1}
                value={form.averageAttendance} onChange={upd('averageAttendance')}
                placeholder="e.g. 87.5"
              />
              <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Whole-class average. Decimal values allowed (0–100).
              </div>
            </div>
          )}

          {/* Instructions / description */}
          <div className="form-group">
            <label className="form-label">{isAssignMode ? 'Instructions for Staff' : 'Notes / Description'}</label>
            <textarea className="input" rows={3} value={form.description} onChange={upd('description')}
              placeholder={isAssignMode ? 'Any specific instructions for the assigned staff...' : 'Optional notes...'} />
          </div>

          <div className="flex gap-4">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Priority</label>
              <select className="input" value={form.priority} onChange={upd('priority')}>
                {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Due Date *</label>
              <input type="date" className="input" value={form.dueDate} onChange={upd('dueDate')} />
            </div>
          </div>

          {/* File upload — only in Self mode */}
          {!isAssignMode && config.file && (
            <div className="form-group">
              <label className="form-label">
                Upload Report *
              </label>
              <input
                type="file"
                className="input"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
              />
              {form.file && (
                <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
                  📎 {form.file.name} ({(form.file.size / 1024).toFixed(1)} KB)
                </div>
              )}
              <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                Accepted: PDF, DOC, DOCX, XLS, XLSX
              </div>
            </div>
          )}

          {isAssignMode && (
            <div className="card" style={{ background: 'rgba(79,70,229,0.04)', border: '1px dashed var(--primary)', marginTop: '0.5rem' }}>
              <p className="text-muted" style={{ fontSize: '0.82rem' }}>
                <strong>Note:</strong> The assigned staff member will complete the attendance data and upload the report. You are providing the task definition.
              </p>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button className="btn btn-secondary" onClick={prevStep}>← Back</button>
            <button className="btn btn-primary" onClick={nextStep}>Review →</button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Review ────────────────────────────────────────────── */}
      {step === 'review' && (
        <div className="card">
          <h2 className="font-bold mb-4">Review Before Submitting</h2>

          <div className="flex flex-col gap-4">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Task Type', form.taskType],
                  isAssignMode ? ['Assign To', form.selectedStaffName] : null,
                  config.classData ? ['Class', form.className || '—'] : null,
                  config.classData ? ['Semester', form.semester ? `Semester ${form.semester}` : '—'] : null,
                  config.classData ? ['Academic Year', form.academicYear || '—'] : null,
                  !isAssignMode && config.averageAttendance
                    ? ['Average Attendance', form.averageAttendance ? `${form.averageAttendance}%` : '—'] : null,
                  ['Priority', form.priority],
                  ['Due Date', form.dueDate || '—'],
                  form.description ? ['Notes / Instructions', form.description] : null,
                  !isAssignMode && form.file ? ['Attachment', `📎 ${form.file.name} (${(form.file.size / 1024).toFixed(1)} KB)`] : null,
                ].filter(Boolean).map((row, i) => {
                  const [label, value] = row as [string, string];
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap', width: '40%' }}>{label}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{value}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {config.tbd ? (
              <div className="card" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid var(--success)', padding: '0.9rem' }}>
                <p style={{ fontSize: '0.83rem', color: '#065f46' }}>
                  ✅ This task will be saved as a Draft. You can submit it once its requirements are fully configured.
                </p>
              </div>
            ) : isAssignMode ? (
              <div className="card" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid var(--success)', padding: '0.9rem' }}>
                <p style={{ fontSize: '0.83rem', color: '#065f46' }}>
                  ✅ This task will be assigned to {form.selectedStaffName}. They will receive a notification and complete the required fields.
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex justify-between mt-6">
            <button className="btn btn-secondary" onClick={prevStep} disabled={loading}>← Edit</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting…' : isAssignMode ? '📤 Assign Task' : '📤 Submit for Approval'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTask;
