// File: src/routes/v1/apikeys.ts
import express, { Router } from 'express';
import { ApiKeyController } from '../../controllers/apiKeyController.js';
import { jwtAuthWithAutoRefresh } from '../../middleware/auth/jwtAuthWithAutoRefresh.js';

const router: Router = express.Router();

// API Key routes (require authentication with auto-refresh)
router.post('/create', jwtAuthWithAutoRefresh, ApiKeyController.createApiKey);

export default router;