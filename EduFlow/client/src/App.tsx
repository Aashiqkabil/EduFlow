import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskDetails from './pages/TaskDetails';
import CreateTask from './pages/CreateTask';
import Approvals from './pages/Approvals';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Users from './pages/admin/Users';
import Departments from './pages/admin/Departments';
import Settings from './pages/admin/Settings';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  
  return <>{children}</>;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          <Route path="tasks" element={<Tasks />} />
          <Route path="tasks/create" element={<CreateTask />} />
          <Route path="tasks/:id" element={<TaskDetails />} />
          
          <Route path="approvals" element={<Approvals />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          
          {/* Admin Routes */}
          <Route path="admin/users" element={<ProtectedRoute roles={['Admin']}><Users /></ProtectedRoute>} />
          <Route path="admin/departments" element={<ProtectedRoute roles={['Admin']}><Departments /></ProtectedRoute>} />
          <Route path="admin/settings" element={<ProtectedRoute roles={['Admin']}><Settings /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
