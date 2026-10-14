// backend/src/routes/auth.ts
import { Router } from 'express';
import { authController } from '../controllers/authController';

export const authRouter = Router();

// ----------------------------------------------------
// Google OAuth Endpoints
// ----------------------------------------------------

authRouter.get('/google/login', (req, res) => authController.googleLogin(req, res));
authRouter.get('/google/callback', (req, res) => authController.googleCallback(req, res));
authRouter.get('/callback/google', (req, res) => {
  const queryStr = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(`/api/auth/google/callback${queryStr}`);
});
authRouter.get('/google/logout', (req, res) => authController.googleLogout(req, res));
authRouter.post('/google/logout', (req, res) => authController.googleLogout(req, res));
authRouter.get('/session', (req, res) => authController.getSession(req, res));
authRouter.get('/dev-login', (req, res) => authController.devLogin(req, res));

// ----------------------------------------------------
// GitHub OAuth Endpoints
// ----------------------------------------------------

authRouter.get('/github/status', (req, res) => authController.githubStatus(req, res));
authRouter.get('/github/repos', (req, res) => authController.githubRepos(req, res));
authRouter.post('/github/token', (req, res) => authController.githubToken(req, res));
authRouter.post('/github/check-permissions', (req, res) => authController.checkGithubPermissions(req, res));
authRouter.post('/github/config', (req, res) => authController.githubConfig(req, res));
authRouter.get('/github/login', (req, res) => authController.githubLogin(req, res));
authRouter.get('/github/callback', (req, res) => authController.githubCallback(req, res));
authRouter.post('/github/disconnect', (req, res) => authController.githubDisconnect(req, res));
