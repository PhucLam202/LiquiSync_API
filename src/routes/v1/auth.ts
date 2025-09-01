// File: src/routes/v1/auth.ts
import express, { Router } from 'express';
import { AuthController } from '../../controllers/authController.js';
import { jwtAuthWithAutoRefresh } from '../../middleware/auth/jwtAuthWithAutoRefresh.js';

const router: Router = express.Router();

// Simplified 3-step registration flow
router.post('/first-register', AuthController.firstRegister);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/complete-profile', AuthController.completeProfile);

// Authentication
router.post('/login', AuthController.login);
router.post('/web3-login', AuthController.web3Login);
router.post('/link-email-to-web3', AuthController.linkEmailToWeb3User);
router.post('/logout', AuthController.logout);
router.post('/refresh-token', AuthController.refreshToken);



// Password reset
router.post('/request-password-reset', AuthController.requestPasswordReset);
router.post('/reset-password', AuthController.resetPassword);

// Legacy endpoints (for backward compatibility)
router.post('/verify-email', AuthController.verifyEmail);

export default router;