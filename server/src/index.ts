import 'dotenv/config';
import express, { Request, Response } from 'express';
import { httpLogger, logger } from './logger';
import meRouter from './routes/me';
import coursesRouter from './routes/courses';

const app = express();

app.use(express.json());
app.use(httpLogger);

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'studyflow-server', version: '0.1.0' });
});

// Protected routes
app.use('/api', meRouter);
app.use('/api', coursesRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Backend server started');
});

// Export the app for integration testing (Supertest)
export { app };
