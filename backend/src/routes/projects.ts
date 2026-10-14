// backend/src/routes/projects.ts
import { Router } from 'express';
import { projectController } from '../controllers/projectController';

export const projectsRouter = Router();

// GET /api/projects/sandboxes - List sandbox providers
projectsRouter.get('/sandboxes', (req, res) => projectController.getSandboxes(req, res));

// GET /api/projects - List all projects
projectsRouter.get('/', (req, res) => projectController.list(req, res));

// POST /api/projects - Create or update a project
projectsRouter.post('/', (req, res) => projectController.create(req, res));

// PATCH /api/projects/:id & /api/projects - Update project details
projectsRouter.patch('/:id', (req, res) => projectController.update(req, res));
projectsRouter.patch('/', (req, res) => projectController.update(req, res));

// DELETE /api/projects/:id - Delete project
projectsRouter.delete('/:id', (req, res) => projectController.delete(req, res));
