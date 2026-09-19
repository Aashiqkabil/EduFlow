import { Router } from 'express';
import { readData } from '../utils/fileData';
import { resetDemoData } from '../data/seed';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = 'eduflow-super-secret-key-for-demo';

// Ensure seed data exists on startup
const usersPath = path.join(__dirname, '../data/users.json');
if (!fs.existsSync(usersPath)) {
  resetDemoData();
}

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = readData<any>('users');
  
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  if (password !== 'demo123') {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    { 
      userId: user.id, 
      role: user.role, 
      department: user.department, 
      name: user.name 
    }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user
  });
});

export default router;
