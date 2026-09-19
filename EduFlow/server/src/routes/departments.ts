import { Router } from 'express';
import { readData, writeData } from '../utils/fileData';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/', (req, res) => {
  const departments = readData<any>('departments');
  res.json(departments);
});

router.post('/', (req, res) => {
  const departments = readData<any>('departments');
  const newDept = { id: uuidv4(), ...req.body, status: 'Active' };
  departments.push(newDept);
  writeData('departments', departments);
  res.status(201).json(newDept);
});

router.put('/:id', (req, res) => {
  const departments = readData<any>('departments');
  const index = departments.findIndex(d => d.id === req.params.id);
  if (index !== -1) {
    departments[index] = { ...departments[index], ...req.body };
    writeData('departments', departments);
    res.json(departments[index]);
  } else {
    res.status(404).json({ message: 'Department not found' });
  }
});

export default router;
