import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import taskRoutes from './routes/tasks';
import approvalRoutes from './routes/approvals';
import notificationRoutes from './routes/notifications';
import departmentRoutes from './routes/departments';
import adminRoutes from './routes/admin';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

import { authenticateToken } from './middleware/auth';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);
app.use('/api/approvals', authenticateToken, approvalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'EduFlow API is running' });
});

app.listen(PORT, () => {
  console.log(`Backend -> http://localhost:${PORT}`);
  console.log('API Connected ✓');
});
