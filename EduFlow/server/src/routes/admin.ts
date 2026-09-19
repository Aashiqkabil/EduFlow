import { Router } from 'express';
import { readData, writeData } from '../utils/fileData';
import { resetDemoData } from '../data/seed';

const router = Router();

router.post('/reset', (req, res) => {
  resetDemoData();
  res.json({ message: 'Demo data has been reset to defaults.' });
});

export default router;
