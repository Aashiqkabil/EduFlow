import { Router } from 'express';
import { readData, writeData } from '../utils/fileData';

const router = Router();

router.get('/', (req, res) => {
  const userId = req.query.userId as string;
  let notifications = readData<any>('notifications');
  if (userId) {
    notifications = notifications.filter(n => n.userId === userId);
  }
  // Sort descending by date
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(notifications);
});

router.put('/:id/read', (req, res) => {
  const notifications = readData<any>('notifications');
  const index = notifications.findIndex(n => n.id === req.params.id);
  if (index !== -1) {
    notifications[index].isRead = true;
    writeData('notifications', notifications);
    res.json(notifications[index]);
  } else {
    res.status(404).json({ message: 'Notification not found' });
  }
});

export default router;
