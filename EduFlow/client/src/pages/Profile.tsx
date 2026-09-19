import React from 'react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      <div className="card" style={{maxWidth: '600px'}}>
        <div className="flex items-center gap-6 mb-8 pb-8 border-b">
          <div style={{width: 80, height: 80, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold'}}>
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <div className="text-muted">{user.designation}</div>
            <div className="badge badge-info mt-2">{user.role}</div>
          </div>
        </div>

        <div className="grid gap-6">
          <div>
            <label className="text-sm text-muted">Email Address</label>
            <div className="font-bold">{user.email}</div>
          </div>
          <div>
            <label className="text-sm text-muted">Employee ID</label>
            <div className="font-bold">{user.employeeId}</div>
          </div>
          <div>
            <label className="text-sm text-muted">Department</label>
            <div className="font-bold">{user.department}</div>
          </div>
          <div>
            <label className="text-sm text-muted">Status</label>
            <div><span className="badge badge-success">{user.status}</span></div>
          </div>
        </div>
        
        {/* Profile editing removed as it was intentionally non-functional */}
      </div>
    </div>
  );
};

export default Profile;
