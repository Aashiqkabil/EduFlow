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

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  status: 'Not Started' | 'In Progress' | 'Submitted' | 'Under Review' | 'Completed' | 'On Hold' | 'Rejected' | 'Overdue';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  headId: string;
  staffCount: number;
  status: string;
}
