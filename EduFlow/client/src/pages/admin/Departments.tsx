import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { Department } from '../../types';

const Departments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Departments</h1>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Head ID</th>
                <th>Staff Count</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => (
                <tr key={dept.id}>
                  <td className="font-bold">{dept.name}</td>
                  <td>{dept.headId || 'N/A'}</td>
                  <td>{dept.staffCount}</td>
                  <td><span className="badge badge-success">{dept.status}</span></td>
                  <td>
                    {/* Edit removed */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Departments;
