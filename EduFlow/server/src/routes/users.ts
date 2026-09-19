import { Router } from 'express';
import { readData, writeData } from '../utils/fileData';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/', (req, res) => {
  const users = readData<any>('users');
  res.json(users);
});

router.post('/', (req, res) => {
  const users = readData<any>('users');
  const newUser = { id: uuidv4(), ...req.body, status: 'Active' };
  users.push(newUser);
  writeData('users', users);
  res.status(201).json(newUser);
});

router.put('/:id', (req, res) => {
  const users = readData<any>('users');
  const index = users.findIndex(u => u.id === req.params.id);
  if (index !== -1) {
    users[index] = { ...users[index], ...req.body };
    writeData('users', users);
    res.json(users[index]);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

export default router;
