// backend/src/routes/incidents.ts
import { Router } from 'express';
import { incidentController } from '../controllers/incidentController';

export const incidentsRouter = Router();

// GET /api/incidents - List all incidents
incidentsRouter.get('/', (req, res) => incidentController.list(req, res));

// POST /api/incidents - Create / Report an incident
incidentsRouter.post('/', (req, res) => incidentController.create(req, res));

// GET /api/incidents/:id - Get incident details
incidentsRouter.get('/:id', (req, res) => incidentController.getDetail(req, res));

// POST /api/incidents/:id/action - Human-in-the-loop action
incidentsRouter.post('/:id/action', (req, res) => incidentController.handleAction(req, res));
