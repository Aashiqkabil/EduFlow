import { Router } from 'express';
import { readData } from '../utils/fileData';

const router = Router();
// authenticateToken already applied globally via index.ts

// ─── GET /api/classes — visible classes for the authenticated user ────────────
//   Staff  → only classes where handledByStaffId === user.userId
//   HOD    → all classes in their department
//   Others → all classes (Admin, Dean, Principal)
router.get('/', (req, res) => {
  const user = (req as any).user!;
  const classes = readData<any>('classes');

  if (user.role === 'Staff') {
    return res.json(classes.filter((c: any) => c.handledByStaffId === user.userId));
  }

  if (user.role === 'HOD') {
    const users = readData<any>('users');
    const hodRecord = users.find((u: any) => u.id === user.userId);
    const departments = readData<any>('departments');
    const dept = hodRecord
      ? departments.find((d: any) => d.name === hodRecord.department)
      : null;
    if (dept) {
      return res.json(classes.filter((c: any) => c.departmentId === dept.id));
    }
    return res.json([]);
  }

  // Admin / Dean / Principal see all classes
  return res.json(classes);
});

// ─── GET /api/classes/by-staff/:staffId — HOD fetches classes for a specific Staff ───
router.get('/by-staff/:staffId', (req, res) => {
  const user = (req as any).user!;
  if (!['HOD', 'Admin', 'Dean', 'Principal'].includes(user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  const classes = readData<any>('classes');
  res.json(classes.filter((c: any) => c.handledByStaffId === req.params.staffId));
});

export default router;
