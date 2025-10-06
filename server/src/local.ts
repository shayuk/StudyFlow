import 'dotenv/config';
import { app } from './index';
import { logger } from './logger';
import { ensureDefaultAdmin } from './bootstrap/ensureDefaultAdmin';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  logger.info({ port: PORT, docs: `http://localhost:${PORT}/docs` }, 'Backend server started (local)');
  // Fire-and-forget default admin ensure (does not block startup)
  ensureDefaultAdmin().catch((err) => {
    logger.error({ err }, 'ensureDefaultAdmin failed');
  });
});
