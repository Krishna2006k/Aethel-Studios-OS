import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { SEED_DATA, SEED_RAW_VAULT_ITEMS } from './src/data/seedData';
import { encryptSecret } from './src/utils/cryptoService';
import { reconcileDatabaseIntegrity } from './src/utils/syncEngine';
import type { AethelDatabaseState, VaultCredential } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'aethel-db.json');
const DEMO_MASTER_PASSPHRASE = 'aethel2026';

interface PersistedDiskEnvelope {
  updatedAt: string;
  state: AethelDatabaseState;
}

async function generateEncryptedSeedVault(): Promise<VaultCredential[]> {
  const credentials: VaultCredential[] = [];
  for (const item of SEED_RAW_VAULT_ITEMS) {
    const encrypted = await encryptSecret(item.plainSecret, DEMO_MASTER_PASSPHRASE);
    credentials.push({
      id: item.id,
      servicePlatform: item.servicePlatform,
      ownerClientTag: item.ownerClientTag,
      usernameEmail: item.usernameEmail,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      salt: encrypted.salt,
      url: item.url,
      notes: item.notes,
      createdAt: item.createdAt,
    });
  }
  return credentials;
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
        if (!parsed.state.vaultCredentials || parsed.state.vaultCredentials.length === 0) {
          parsed.state.vaultCredentials = await generateEncryptedSeedVault();
        }
        parsed.state = reconcileDatabaseIntegrity(parsed.state);
        writeEnvelopeAtomically(parsed);
        return parsed;
      }
    } catch {
      // Fall through to re-seed if file is corrupted
    }
  }

  const vaultCredentials = await generateEncryptedSeedVault();
  const initialEnvelope: PersistedDiskEnvelope = {
    updatedAt: new Date().toISOString(),
    state: reconcileDatabaseIntegrity({
      ...SEED_DATA,
      vaultCredentials,
    }),
  };
  writeEnvelopeAtomically(initialEnvelope);
  return initialEnvelope;
}

function isValidDatabaseState(candidate: any): candidate is AethelDatabaseState {
  return (
    Boolean(candidate) &&
    Array.isArray(candidate.clients) &&
    Array.isArray(candidate.metaCampaigns) &&
    Array.isArray(candidate.websites) &&
    Array.isArray(candidate.tickets) &&
    Array.isArray(candidate.prototypes) &&
    Array.isArray(candidate.expenses) &&
    Array.isArray(candidate.payments) &&
    Array.isArray(candidate.vaultCredentials)
  );
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize disk database on boot
  let currentEnvelope = await loadOrInitializeDiskDb();

  // API Route 1: Health & Telemetry Check
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
        prototypes: currentEnvelope.state.prototypes.length,
        expenses: currentEnvelope.state.expenses.length,
        payments: currentEnvelope.state.payments.length,
        vaultCredentials: currentEnvelope.state.vaultCredentials.length,
      },
    });
  });

  // API Route 2: Read full studio database state
  app.get('/api/db', async (_req, res) => {
    try {
      currentEnvelope = await loadOrInitializeDiskDb();
      res.json(currentEnvelope);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to read database' });
    }
  });

  // API Route 3: Atomic write of full studio database state
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

  // API Route 4: Reset database to factory Aethel Studios seed data
  app.post('/api/db/reset', async (_req, res) => {
    try {
      const vaultCredentials = await generateEncryptedSeedVault();
      const freshEnvelope: PersistedDiskEnvelope = {
        updatedAt: new Date().toISOString(),
        state: reconcileDatabaseIntegrity({
          ...SEED_DATA,
          vaultCredentials,
        }),
      };
      writeEnvelopeAtomically(freshEnvelope);
      currentEnvelope = freshEnvelope;
      res.json(freshEnvelope);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to reset database' });
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
