export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Principal' | 'Dean' | 'HOD' | 'Staff';
  department: string;
  employeeId: string;
  designation: string;
  status: string;
}

export interface TaskMeta {
  classId?: string;
  className?: string;
  semester?: number | string;
  academicYear?: string;
  averageAttendance?: number | string;
  [key: string]: any; // extensible for other task types
}

export interface Task {
  id: string;
  title: string;
  description: string;
  taskType?: string;
  taskMeta?: TaskMeta;
  assignedTo: { userId: string; name: string; role: string } | null;
  createdBy: { userId: string; name: string; role: string };
  assignmentType: 'SELF' | 'ASSIGNED';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  status: string; // DRAFT | ASSIGNED | IN_PROGRESS | PENDING_APPROVAL | APPROVED | REJECTED | CHANGES_REQUESTED
  currentApproverRole: string | null;
  currentApproverId: string | null;
  attachments: Attachment[];
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
}

export interface TimelineEvent {
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
  reason?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  taskId?: string;  // if set, clicking opens /tasks/:taskId
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  headId: string;
  staffCount: number;
  status: string;
}

export interface ClassRecord {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  year: number;
  section: string;
  handledByStaffId: string;
  handledByStaffName: string;
  semesters: number[];
}
