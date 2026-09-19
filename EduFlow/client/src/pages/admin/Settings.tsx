import React, { useState } from 'react';
import api from '../../services/api';

const Settings = () => {
  const [loading, setLoading] = useState(false);

  const handleResetData = async () => {
    if (confirm('Are you sure you want to reset all demo data? This will restore the original users, tasks, and approvals.')) {
      setLoading(true);
      try {
        const res = await api.post('/admin/reset');
        alert(res.data.message);
        window.location.reload(); // Reload to refresh data everywhere
      } catch (err) {
        console.error(err);
        alert('Failed to reset data');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">System Settings</h1>

      <div className="flex gap-6">
        <div className="flex-col gap-6" style={{flex: 1, display: 'flex'}}>
          <div className="card">
            <h2 className="font-bold mb-4">Institution Information</h2>
            <div className="form-group">
              <label className="form-label">Institution Name</label>
              <input type="text" className="input" defaultValue="Demo University" disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Timezone</label>
              <input type="text" className="input" defaultValue="UTC+5:30" disabled />
            </div>
          </div>

          <div className="card">
            <h2 className="font-bold mb-4 text-danger">Danger Zone</h2>
            <p className="text-muted mb-4">Resetting demo data will wipe all currently created tasks and approvals, and restore the initial seed data.</p>
            <button className="btn btn-danger" onClick={handleResetData} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Demo Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
