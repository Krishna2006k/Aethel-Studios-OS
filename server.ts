import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { SEED_DATA } from './src/data/seedData';
import { reconcileDatabaseIntegrity } from './src/utils/syncEngine';
import type { AethelDatabaseState } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'aethel-db.json');

interface PersistedDiskEnvelope {
  updatedAt: string;
  state: AethelDatabaseState;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function writeEnvelopeAtomically(envelope: PersistedDiskEnvelope): void {
  ensureDataDir();
  const tempFile = `${DB_FILE_PATH}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(envelope, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE_PATH);
}

async function loadOrInitializeDiskDb(): Promise<PersistedDiskEnvelope> {
  ensureDataDir();
  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as PersistedDiskEnvelope;
      if (parsed && parsed.state && Array.isArray(parsed.state.clients)) {
        parsed.state = reconcileDatabaseIntegrity({
          ...SEED_DATA,
          ...parsed.state,
        });
        writeEnvelopeAtomically(parsed);
        return parsed;
      }
    } catch {
      // Fall through to re-seed if file is corrupted
    }
  }

  const initialEnvelope: PersistedDiskEnvelope = {
    updatedAt: new Date().toISOString(),
    state: reconcileDatabaseIntegrity(SEED_DATA),
  };
  writeEnvelopeAtomically(initialEnvelope);
  return initialEnvelope;
}

function isValidDatabaseState(candidate: unknown): candidate is AethelDatabaseState {
  if (!candidate || typeof candidate !== 'object') return false;
  const obj = candidate as Record<string, unknown>;
  return (
    Array.isArray(obj.clients) &&
    Array.isArray(obj.metaCampaigns) &&
    Array.isArray(obj.websites) &&
    Array.isArray(obj.tickets) &&
    Array.isArray(obj.expenses) &&
    Array.isArray(obj.payments)
  );
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  let currentEnvelope = await loadOrInitializeDiskDb();

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      engine: 'Aethel OS Persistent Backend Engine',
      updatedAt: currentEnvelope.updatedAt,
      counts: {
        clients: currentEnvelope.state.clients.length,
        metaCampaigns: currentEnvelope.state.metaCampaigns.length,
        websites: currentEnvelope.state.websites.length,
        tickets: currentEnvelope.state.tickets.length,
        rndProjects: currentEnvelope.state.rndProjects.length,
        expenses: currentEnvelope.state.expenses.length,
        payments: currentEnvelope.state.payments.length,
        vaultItems: currentEnvelope.state.vaultItems.length,
        tasks: (currentEnvelope.state.tasks || []).length,
      },
    });
  });

  app.get('/api/db', async (_req, res) => {
    try {
      currentEnvelope = await loadOrInitializeDiskDb();
      res.json(currentEnvelope);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to read database';
      res.status(500).json({ error: msg });
    }
  });

  app.put('/api/db', (req, res) => {
    const incomingState = req.body?.state ?? req.body;
    if (!isValidDatabaseState(incomingState)) {
      res.status(400).json({ error: 'Invalid AethelDatabaseState payload' });
      return;
    }

    const nextEnvelope: PersistedDiskEnvelope = {
      updatedAt: new Date().toISOString(),
      state: reconcileDatabaseIntegrity(incomingState),
    };
    writeEnvelopeAtomically(nextEnvelope);
    currentEnvelope = nextEnvelope;

    res.json({
      ok: true,
      updatedAt: nextEnvelope.updatedAt,
    });
  });

  app.post('/api/db/reset', async (_req, res) => {
    try {
      const freshEnvelope: PersistedDiskEnvelope = {
        updatedAt: new Date().toISOString(),
        state: reconcileDatabaseIntegrity(SEED_DATA),
      };
      writeEnvelopeAtomically(freshEnvelope);
      currentEnvelope = freshEnvelope;
      res.json(freshEnvelope);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset database';
      res.status(500).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aethel OS Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
