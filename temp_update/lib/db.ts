import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database.json');

export interface Session {
  id: string;
  athleteId: string;
  athleteName: string;
  date: string;
  rpe: number; // 1-10
  duration: number; // minutes
  load: number; // rpe * duration
  distance?: number; // km
  volume?: number; // total tons/kg (external load)
}

export interface WellnessEntry {
  id: string;
  athleteId: string;
  athleteName: string;
  date: string;
  recovery: number; // 6-20 (TQR)
  sleep: number; // 1-5
  stress: number; // 1-5
  fatigue: number; // 1-5
  soreness: number; // 1-5
  score: number;
  classification: string;
}

export interface Database {
  sessions: Session[];
  wellness: WellnessEntry[];
}

const INITIAL_DATA: Database = {
  sessions: [],
  wellness: [],
};

async function ensureDb() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(INITIAL_DATA, null, 2));
  }
}

export async function getDb(): Promise<Database> {
  await ensureDb();
  const content = await fs.readFile(DB_PATH, 'utf-8');
  const db = JSON.parse(content);
  // Migration for old DB format
  if (!db.wellness) db.wellness = [];
  return db;
}

export async function saveDb(data: Database) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

export async function addSession(session: Omit<Session, 'id' | 'load'>) {
  const db = await getDb();
  const newSession: Session = {
    ...session,
    id: Math.random().toString(36).substring(2, 9),
    load: session.rpe * session.duration,
  };
  db.sessions.push(newSession);
  await saveDb(db);
  return newSession;
}

export async function addWellness(entry: Omit<WellnessEntry, 'id' | 'score' | 'classification'>) {
  const db = await getDb();
  
  // Scoring logic:
  // Normalize Recovery (6-20) to 1-5 scale roughly? Or just use raw?
  // Let's use raw sum: 6-20 + 4*(1-5) = 10 to 40.
  const total = entry.recovery + entry.sleep + entry.stress + entry.fatigue + entry.soreness;
  const score = Number((total / 40 * 100).toFixed(0)); // Percentage based on max possible (40)
  
  let classification = 'Médio';
  if (total >= 32) classification = 'Alto';
  else if (total <= 18) classification = 'Baixo';

  const newEntry: WellnessEntry = {
    ...entry,
    id: Math.random().toString(36).substring(2, 9),
    score,
    classification,
  };
  
  db.wellness.push(newEntry);
  await saveDb(db);
  return newEntry;
}
