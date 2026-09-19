import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CheckSquare, CheckCircle, Bell, User, Users, Building, Settings } from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  
  if (!user) return null;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        EDUFLOW
      </div>
      
      <div className="sidebar-nav">
        <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} /> Dashboard
        </NavLink>
        
        <div className="nav-section">Workflow</div>
        <NavLink to="/tasks" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <CheckSquare size={20} /> Tasks
        </NavLink>
        {(user.role === 'HOD' || user.role === 'Dean' || user.role === 'Principal' || user.role === 'Admin') && (
          <NavLink to="/approvals" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <CheckCircle size={20} /> Approvals
          </NavLink>
        )}
        
        <div className="nav-section">Communication</div>
        <NavLink to="/notifications" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <Bell size={20} /> Notifications
        </NavLink>
        
        <div className="nav-section">Account</div>
        <NavLink to="/profile" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
          <User size={20} /> Profile
        </NavLink>

        {user.role === 'Admin' && (
          <>
            <div className="nav-section">Admin</div>
            <NavLink to="/admin/users" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={20} /> Users
            </NavLink>
            <NavLink to="/admin/departments" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Building size={20} /> Departments
            </NavLink>
            <NavLink to="/admin/settings" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Settings size={20} /> Settings
            </NavLink>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
