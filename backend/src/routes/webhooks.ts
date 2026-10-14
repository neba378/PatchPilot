import { Router } from 'express';
import { webhookController } from '../controllers/webhookController';

export const webhooksRouter = Router();

// POST /api/webhooks/generic
webhooksRouter.post('/generic', (req, res) => webhookController.handleGeneric(req, res));

// POST /api/webhooks/github-actions
webhooksRouter.post('/github-actions', (req, res) => webhookController.handleGitHubActions(req, res));

// POST /api/webhooks/sentry
webhooksRouter.post('/sentry', (req, res) => webhookController.handleSentry(req, res));
