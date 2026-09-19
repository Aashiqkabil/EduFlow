import { Router } from 'express';
import { readData, writeData } from '../utils/fileData';

const router = Router();

// GET /api/notifications — returns notifications for the authenticated user.
// The notification object already contains taskId if set at creation time.
router.get('/', (req, res) => {
  const userId = req.query.userId as string;
  let notifications = readData<any>('notifications');
  if (userId) {
    notifications = notifications.filter((n: any) => n.userId === userId);
  }
  notifications.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(notifications);
});

// PUT /api/notifications/:id/read
router.put('/:id/read', (req, res) => {
  const notifications = readData<any>('notifications');
  const index = notifications.findIndex((n: any) => n.id === req.params.id);
  if (index !== -1) {
    notifications[index].isRead = true;
    writeData('notifications', notifications);
    res.json(notifications[index]);
  } else {
    res.status(404).json({ message: 'Notification not found' });
  }
});

// PUT /api/notifications/read-all — mark all unread for a user as read
router.put('/read-all', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId required' });
  const notifications = readData<any>('notifications');
  notifications.forEach((n: any) => {
    if (n.userId === userId) n.isRead = true;
  });
  writeData('notifications', notifications);
  res.json({ message: 'All notifications marked as read' });
});

export default router;
