// File: src/routes/v1/users.ts
import express, { Router } from 'express';
import { UserController } from '../../controllers/userController.js';
import { jwtAuthWithAutoRefresh } from '../../middleware/auth/jwtAuthWithAutoRefresh.js';

const router: Router = express.Router();

// User routes (require authentication with auto-refresh)
router.get('/profile', jwtAuthWithAutoRefresh, UserController.getProfile);
router.put('/profile', jwtAuthWithAutoRefresh, UserController.updateProfile);

export default router;