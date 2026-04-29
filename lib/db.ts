import { supabase } from './supabase';

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

export interface Profile {
  id?: string;
  athleteId: string;
  fullName: string;
  email: string;
  birthDate: string;
  gender: 'male' | 'female' | 'other';
  height: number;
  weight: number;
  sport: string;
  goal: 'performance' | 'hypertrophy' | 'health' | 'weight-loss';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  createdAt?: string;
}

export interface Database {
  sessions: Session[];
  wellness: WellnessEntry[];
  profiles: Profile[];
}

export async function getDb(): Promise<Database> {
  const { data: sessions, error: sErr } = await supabase.from('sessions').select('*');
  const { data: wellness, error: wErr } = await supabase.from('wellness').select('*');
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  
  if (sErr) console.error('Error fetching sessions:', sErr);
  if (wErr) console.error('Error fetching wellness:', wErr);
  if (pErr) console.error('Error fetching profiles:', pErr);

  return {
    sessions: sessions || [],
    wellness: wellness || [],
    profiles: profiles || []
  };
}

export async function saveProfile(profile: Profile) {
  const { data, error } = await supabase.from('profiles').upsert([profile], { onConflict: 'athleteId' }).select().single();
  if (error) {
    console.error('Supabase error (profiles):', error);
    throw error;
  }
  return data;
}

export async function saveDb(data: Database) {
  // saveDb was mainly used internally for the JSON file.
  // With Supabase, we insert/update directly.
  console.warn('saveDb called, but should use direct Supabase inserts.');
}

export async function addSession(session: Omit<Session, 'id' | 'load'>) {
  const load = session.rpe * session.duration;
  
  const { data, error } = await supabase.from('sessions').insert([{
    ...session,
    load
  }]).select().single();

  if (error) {
    console.error('Supabase insert error (sessions):', error);
    throw error;
  }
  return data;
}

export async function addWellness(entry: Omit<WellnessEntry, 'id' | 'score' | 'classification'>) {
  const total = entry.recovery + entry.sleep + entry.stress + entry.fatigue + entry.soreness;
  const score = Number((total / 40 * 100).toFixed(0));
  
  let classification = 'Médio';
  if (total >= 32) classification = 'Alto';
  else if (total <= 18) classification = 'Baixo';

  const { data, error } = await supabase.from('wellness').insert([{
    ...entry,
    score,
    classification
  }]).select().single();

  if (error) {
    console.error('Supabase insert error (wellness):', error);
    throw error;
  }
  return data;
}
