import { writeData } from '../utils/fileData';
import { v4 as uuidv4 } from 'uuid';

export const demoUsers = [
  { id: '1', name: 'Admin User', email: 'admin@eduflow.demo', role: 'Admin', department: 'Administration', employeeId: 'E001', designation: 'System Administrator', status: 'Active' },
  { id: '2', name: 'Principal Dr. Smith', email: 'principal@eduflow.demo', role: 'Principal', department: 'Administration', employeeId: 'E002', designation: 'Principal', status: 'Active' },
  { id: '3', name: 'Dean Dr. Johnson', email: 'dean@eduflow.demo', role: 'Dean', department: 'Administration', employeeId: 'E003', designation: 'Dean of Academics', status: 'Active' },
  { id: '4', name: 'HOD Prof. Williams', email: 'hod@eduflow.demo', role: 'HOD', department: 'Computer Science & Engineering', employeeId: 'E004', designation: 'Head of Department', status: 'Active' },
  { id: '5', name: 'Staff Mr. Davis', email: 'staff@eduflow.demo', role: 'Staff', department: 'Computer Science & Engineering', employeeId: 'E005', designation: 'Assistant Professor', status: 'Active' }
];

export const demoDepartments = [
  { id: 'd1', name: 'Computer Science & Engineering', headId: '4', staffCount: 15, status: 'Active' },
  { id: 'd2', name: 'Computer Science & Business Systems', headId: '', staffCount: 8, status: 'Active' },
  { id: 'd3', name: 'Electronics & Communication Engineering', headId: '', staffCount: 12, status: 'Active' },
  { id: 'd4', name: 'Mechanical Engineering', headId: '', staffCount: 10, status: 'Active' },
  { id: 'd5', name: 'Management Studies', headId: '', staffCount: 5, status: 'Active' }
];

export const demoTasks = [
  { 
    id: 't1', 
    title: 'NAAC Documentation', 
    description: 'Prepare criteria 3 documents for upcoming NAAC visit.', 
    priority: 'High', 
    dueDate: '2026-10-15',
    createdBy: { userId: '4', name: 'HOD Prof. Williams', role: 'HOD' },
    assignmentType: 'ASSIGNED',
    assignedTo: { userId: '5', name: 'Staff Mr. Davis', role: 'Staff' },
    attachments: [],
    status: 'IN_PROGRESS',
    currentApproverRole: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: [
      { action: 'CREATED', actorId: '4', actorName: 'HOD Prof. Williams', actorRole: 'HOD', timestamp: new Date().toISOString() },
      { action: 'ASSIGNED', actorId: '4', actorName: 'HOD Prof. Williams', actorRole: 'HOD', timestamp: new Date().toISOString() }
    ]
  },
  { 
    id: 't2', 
    title: 'Q1 Staff Appraisal', 
    description: 'Quarterly review achievements and teaching activities.', 
    priority: 'Medium', 
    dueDate: '2026-09-30',
    createdBy: { userId: '5', name: 'Staff Mr. Davis', role: 'Staff' },
    assignmentType: 'SELF',
    assignedTo: { userId: '5', name: 'Staff Mr. Davis', role: 'Staff' },
    attachments: [],
    status: 'APPROVED', 
    currentApproverRole: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: [
      { action: 'CREATED', actorId: '5', actorName: 'Staff Mr. Davis', actorRole: 'Staff', timestamp: new Date().toISOString() },
      { action: 'SUBMITTED', actorId: '5', actorName: 'Staff Mr. Davis', actorRole: 'Staff', timestamp: new Date().toISOString() },
      { action: 'APPROVED', actorId: '4', actorName: 'HOD Prof. Williams', actorRole: 'HOD', timestamp: new Date().toISOString() },
      { action: 'APPROVED', actorId: '3', actorName: 'Dean Dr. Johnson', actorRole: 'Dean', timestamp: new Date().toISOString() },
      { action: 'APPROVED', actorId: '2', actorName: 'Principal Dr. Smith', actorRole: 'Principal', timestamp: new Date().toISOString() }
    ] 
  }
];

export const demoNotifications = [
  { id: 'n1', userId: '5', title: 'New Task Assigned', message: 'You have been assigned: NAAC Documentation', type: 'Task Assigned', isRead: false, createdAt: new Date().toISOString() },
];

export const resetDemoData = () => {
  writeData('users', demoUsers);
  writeData('departments', demoDepartments);
  writeData('tasks', demoTasks);
  writeData('notifications', demoNotifications);
};
