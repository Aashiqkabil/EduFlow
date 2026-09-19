import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await api.post('/auth/login', { email, password: password || 'demo123' });
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo123');
    setTimeout(() => {
      // Small timeout to allow state to update visually before submitting
      const form = document.getElementById('login-form');
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }, 100);
  };

  return (
    <div style={{display:'flex', height:'100vh', background:'var(--bg-color)'}}>
      <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center'}}>
        <div className="card" style={{width:'100%', maxWidth:'450px'}}>
          <div className="text-center mb-4">
            <h1 style={{color:'var(--primary)', fontSize:'2rem', letterSpacing:'1px', marginBottom:'0.5rem'}}>EDUFLOW</h1>
            <p className="text-muted">Digital Workflow & Approval System</p>
          </div>
          
          {error && <div className="badge badge-danger w-full text-center" style={{padding:'0.75rem', marginBottom:'1rem'}}>{error}</div>}
          
          <form id="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6">
            <p className="text-center text-muted" style={{fontSize:'0.875rem', marginBottom:'1rem'}}>Or login with demo accounts (Password: demo123)</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => loginAsDemo('staff@eduflow.demo')} className="btn btn-secondary w-full">Staff Demo</button>
              <button onClick={() => loginAsDemo('hod@eduflow.demo')} className="btn btn-secondary w-full">HOD Demo</button>
              <button onClick={() => loginAsDemo('dean@eduflow.demo')} className="btn btn-secondary w-full">Dean Demo</button>
              <button onClick={() => loginAsDemo('principal@eduflow.demo')} className="btn btn-secondary w-full">Principal Demo</button>
              <button onClick={() => loginAsDemo('admin@eduflow.demo')} className="btn btn-secondary w-full">Admin Demo</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{flex:1, background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', padding:'3rem', flexDirection:'column'}}>
        <h2 style={{fontSize:'3rem', marginBottom:'1rem', color:'white'}}>Streamline your institution's workflow.</h2>
        <p style={{fontSize:'1.25rem', opacity:0.9}}>Replace paper forms, manual signatures, and complex tracking with one unified digital system.</p>
      </div>
    </div>
  );
};

export default Login;
