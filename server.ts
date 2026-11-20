import 'dotenv/config';
import express from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { SEED_DATA } from './src/data/seedData';
import { reconcileDatabaseIntegrity } from './src/utils/syncEngine';
import {
  generateGroundedWeeklyRecap,
  queryAethelBrainMemory,
} from './src/utils/calculations';
import type { AethelDatabaseState, FounderName } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'aethel-db.json');

interface PersistedSupabaseConfig {
  url: string;
  anonKey: string;
}

interface PersistedDiskEnvelope {
  updatedAt: string;
  state: AethelDatabaseState;
  supabaseConfig?: PersistedSupabaseConfig;
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
      if (!parsed || !parsed.state || !Array.isArray(parsed.state.clients)) {
        throw new Error('The persisted workspace file does not contain a valid state object.');
      }

      parsed.state = reconcileDatabaseIntegrity({
        ...SEED_DATA,
        ...parsed.state,
      });
      writeEnvelopeAtomically(parsed);
      return parsed;
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : 'Unknown parse or validation error';
      // Never replace an existing workspace file with an empty seed after a read failure.
      throw new Error(`Unable to load ${DB_FILE_PATH}; the original file has been preserved. ${detail}`);
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



const AUTH_COOKIE_NAME = 'aethel_os_session';
const AUTH_SESSION_TTL_SECONDS = 60 * 60 * 8;
const loginAttempts = new Map<string, { count: number; windowStartedAt: number }>();

function authIsRequired(): boolean {
  // Fail closed when NODE_ENV is missing or unfamiliar; only explicit local
  // development mode disables the gate.
  return process.env.NODE_ENV !== 'development' || process.env.AETHEL_FORCE_AUTH === 'true';
}

function authIsConfigured(): boolean {
  const password = process.env.AETHEL_ACCESS_PASSWORD || '';
  const secret = process.env.AETHEL_SESSION_SECRET || '';
  return password.length >= 12 && secret.length >= 32;
}

function safeStringEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function readCookie(req: express.Request, name: string): string | null {
  const cookieHeader = req.headers.cookie || '';
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return null;
}

function createSessionToken(): string {
  const payload = Buffer.from(JSON.stringify({
    audience: 'aethel-os',
    expiresAt: Date.now() + AUTH_SESSION_TTL_SECONDS * 1000,
  })).toString('base64url');
  const signature = createHmac('sha256', process.env.AETHEL_SESSION_SECRET || '')
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function hasValidSession(req: express.Request): boolean {
  const token = readCookie(req, AUTH_COOKIE_NAME);
  if (!token) return false;
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const suppliedSignature = Buffer.from(token.slice(separator + 1), 'base64url');
  const expectedSignature = createHmac('sha256', process.env.AETHEL_SESSION_SECRET || '')
    .update(payload)
    .digest();
  if (suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      audience?: string;
      expiresAt?: number;
    };
    return session.audience === 'aethel-os' &&
      typeof session.expiresAt === 'number' &&
      session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

function setSessionCookie(req: express.Request, res: express.Response): void {
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `${AUTH_COOKIE_NAME}=${createSessionToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${AUTH_SESSION_TTL_SECONDS}${secure}`
  );
}

function clearSessionCookie(req: express.Request, res: express.Response): void {
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `${AUTH_COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`
  );
}

function getLoginAttemptState(ip: string): { count: number; windowStartedAt: number } {
  const now = Date.now();
  const current = loginAttempts.get(ip);
  if (!current || now - current.windowStartedAt > 15 * 60 * 1000) {
    const fresh = { count: 0, windowStartedAt: now };
    loginAttempts.set(ip, fresh);
    return fresh;
  }
  return current;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/auth/session', (req, res) => {
    const required = authIsRequired();
    const configured = !required || authIsConfigured();
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      authRequired: required,
      configured,
      authenticated: configured && (!required || hasValidSession(req)),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!authIsRequired()) {
      res.json({ ok: true });
      return;
    }
    if (!authIsConfigured()) {
      res.status(503).json({
        error: 'Workspace access protection is not configured. Set AETHEL_ACCESS_PASSWORD and AETHEL_SESSION_SECRET on the server.',
      });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const attemptState = getLoginAttemptState(ip);
    if (attemptState.count >= 10) {
      res.setHeader('Retry-After', '900');
      res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' });
      return;
    }

    const suppliedPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!safeStringEqual(suppliedPassword, process.env.AETHEL_ACCESS_PASSWORD || '')) {
      attemptState.count += 1;
      res.status(401).json({ error: 'Incorrect workspace password.' });
      return;
    }

    loginAttempts.delete(ip);
    setSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.use('/api', (req, res, next) => {
    const pathname = req.originalUrl.split('?')[0];
    const publicRoutes = new Set([
      '/api/health',
      '/api/auth/session',
      '/api/auth/login',
      '/api/auth/logout',
    ]);
    if (publicRoutes.has(pathname)) return next();

    res.setHeader('Cache-Control', 'no-store');
    if (!authIsRequired()) return next();
    if (!authIsConfigured()) {
      res.status(503).json({
        error: 'Workspace APIs are disabled until AETHEL_ACCESS_PASSWORD and AETHEL_SESSION_SECRET are configured.',
      });
      return;
    }
    if (!hasValidSession(req)) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
      req.get('X-Aethel-Request') !== 'same-origin'
    ) {
      res.status(403).json({ error: 'Missing same-origin request protection header.' });
      return;
    }
    next();
  });

  let currentEnvelope = await loadOrInitializeDiskDb();

  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      engine: 'Aethel OS API',
      authenticationRequired: authIsRequired(),
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

    const reconciled = reconcileDatabaseIntegrity(incomingState);
    const nextEnvelope: PersistedDiskEnvelope = {
      updatedAt: reconciled.lastUpdated || new Date().toISOString(),
      state: reconciled,
      supabaseConfig: req.body?.supabaseConfig ?? currentEnvelope.supabaseConfig,
    };
    writeEnvelopeAtomically(nextEnvelope);
    currentEnvelope = nextEnvelope;

    res.json({
      ok: true,
      updatedAt: nextEnvelope.updatedAt,
    });
  });

  app.post('/api/config/supabase', (req, res) => {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    const anonKey = typeof req.body?.anonKey === 'string' ? req.body.anonKey.trim() : '';
    currentEnvelope = {
      ...currentEnvelope,
      supabaseConfig: url && anonKey ? { url, anonKey } : undefined,
    };
    writeEnvelopeAtomically(currentEnvelope);
    res.json({ ok: true, supabaseConfig: currentEnvelope.supabaseConfig });
  });

  app.post('/api/db/reset', async (_req, res) => {
    try {
      const freshEnvelope: PersistedDiskEnvelope = {
        updatedAt: new Date().toISOString(),
        state: reconcileDatabaseIntegrity(SEED_DATA),
        supabaseConfig: currentEnvelope.supabaseConfig,
      };
      writeEnvelopeAtomically(freshEnvelope);
      currentEnvelope = freshEnvelope;
      res.json(freshEnvelope);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset database';
      res.status(500).json({ error: msg });
    }
  });

  /**
   * AETHEL BRAIN — Layer 1 + Layer 2 Grounded Weekly Recap Generator
   * Uses Gemini (gemini-4-hydrogen) when GEMINI_API_KEY is available, strictly grounded
   * in the Layer 1 studio dataset, and falls back to the deterministic Layer-1 brief.
   */
  app.post('/api/brain/weekly-recap', async (req, res) => {
    const incomingState: AethelDatabaseState = isValidDatabaseState(req.body?.state)
      ? reconcileDatabaseIntegrity(req.body.state)
      : currentEnvelope.state;

    const groundedRecap = generateGroundedWeeklyRecap(incomingState);

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const prompt = `You are the Aethel Brain Weekly Intelligence Engine for Aethel Studios (co-founded by Krishna Khakole and Vansh Khakole).
Analyze the following Layer 1 studio data snapshot and produce an accurate, grounded AETHEL WEEKLY BRIEF.
CRITICAL RULES:
- Never claim something was completed unless it is explicitly recorded as completed in the Layer 1 data below.
- Clearly distinguish between recorded facts/completions and AI observations.

Layer 1 Grounded Data Snapshot:
${JSON.stringify(groundedRecap, null, 2)}`;

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: { type: Type.STRING },
                aiObservations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['executiveSummary', 'aiObservations'],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text) as {
            executiveSummary?: string;
            aiObservations?: string[];
          };
          res.json({
            recap: {
              ...groundedRecap,
              executiveSummary: parsed.executiveSummary || groundedRecap.executiveSummary,
              aiObservations:
                parsed.aiObservations && parsed.aiObservations.length > 0
                  ? parsed.aiObservations
                  : groundedRecap.aiObservations,
            },
            engine: 'gemini-4-hydrogen',
          });
          return;
        }
      } catch {
        // Gracefully fall back to grounded Layer 1 deterministic recap
      }
    }

    res.json({
      recap: groundedRecap,
      engine: 'grounded-layer-1',
    });
  });

  /**
   * AETHEL BRAIN — Institutional Memory & "What should I focus on today?" Query Endpoint
   */
  app.post('/api/brain/ask', async (req, res) => {
    const query = typeof req.body?.query === 'string' ? req.body.query : '';
    const activeFounder: 'All' | FounderName = req.body?.activeFounder || 'All';
    const incomingState: AethelDatabaseState = isValidDatabaseState(req.body?.state)
      ? reconcileDatabaseIntegrity(req.body.state)
      : currentEnvelope.state;

    const groundedResult = queryAethelBrainMemory(incomingState, query, activeFounder);

    if (process.env.GEMINI_API_KEY && query.trim().length > 0) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `You are Aethel Brain, the internal institutional memory for Aethel Studios (co-founded by Krishna and Vansh).
Answer the founder's question concisely (2-3 sentences maximum) strictly using ONLY the grounded studio records below. Do not invent facts.
Question: "${query}"
Grounded Records & Priorities:
${JSON.stringify(groundedResult, null, 2)}`,
        });

        if (response.text) {
          res.json({
            ...groundedResult,
            directAnswer: response.text.trim(),
            engine: 'gemini-4-hydrogen',
          });
          return;
        }
      } catch {
        // Gracefully fall back to grounded deterministic answer
      }
    }

    res.json({
      ...groundedResult,
      engine: 'grounded-layer-1',
    });
  });

  const publicDir = path.join(__dirname, 'public');

  app.get(['/manifest.webmanifest', '/manifest.json'], (_req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(publicDir, 'manifest.webmanifest'));
  });

  app.get('/sw.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(publicDir, 'sw.js'));
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
