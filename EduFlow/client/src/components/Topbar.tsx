import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, LogOut, Sun, Moon } from 'lucide-react';
import api from '../services/api';
import type { Notification } from '../types';

const Topbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (user) {
      api.get<Notification[]>(`/notifications?userId=${user.id}`).then(res => {
        setUnreadCount(res.data.filter(n => !n.isRead).length);
      }).catch(err => console.error(err));
    }
  }, [user]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="topbar">
      <div className="flex items-center gap-4">
        <div style={{position:'relative'}}>
          <Search size={20} style={{position:'absolute', left:10, top:8, color:'var(--text-muted)'}} />
          <input type="text" className="input" placeholder="Search..." style={{paddingLeft:36, width:250}} />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <button onClick={toggleTheme} className="btn" style={{color:'var(--text-muted)', background:'none', padding:0}}>
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <div style={{position: 'relative', cursor: 'pointer'}} onClick={() => navigate('/notifications')}>
          <Bell size={20} className="text-muted" />
          {unreadCount > 0 && (
            <span style={{position:'absolute', top:-5, right:-5, background:'var(--danger)', color:'white', fontSize:'10px', borderRadius:'10px', padding:'2px 5px', fontWeight:'bold'}}>
              {unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2" style={{borderLeft:'1px solid var(--border)', paddingLeft:'1.5rem'}}>
          <div style={{width:32, height:32, borderRadius:'50%', background:'var(--primary)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold'}}>
            {user?.name.charAt(0)}
          </div>
          <div>
            <div style={{fontSize:'14px', fontWeight:600}}>{user?.name}</div>
            <div style={{fontSize:'12px', color:'var(--text-muted)'}}>{user?.role}</div>
          </div>
        </div>

        <button onClick={handleLogout} className="btn" style={{color:'var(--text-muted)', background:'none', padding:0}}>
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
};

export default Topbar;
