'use server'

import { addSession, addWellness, getDb, Session, WellnessEntry } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function logWorkout(formData: {
  athleteName: string;
  rpe: number;
  duration: number;
  date: string;
  distance?: number;
  volume?: number;
}) {
  const sessionData = {
    athleteId: formData.athleteName.toLowerCase().replace(/\s+/g, '-'),
    athleteName: formData.athleteName,
    date: formData.date,
    rpe: formData.rpe,
    duration: formData.duration,
    distance: formData.distance,
    volume: formData.volume,
  };

  await addSession(sessionData);
  revalidatePath('/coach');
  revalidatePath('/athlete');
}

export async function logWellness(formData: {
  athleteName: string;
  recovery: number;
  sleep: number;
  stress: number;
  fatigue: number;
  soreness: number;
  date: string;
}) {
  const wellnessData = {
    athleteId: formData.athleteName.toLowerCase().replace(/\s+/g, '-'),
    athleteName: formData.athleteName,
    date: formData.date,
    recovery: formData.recovery,
    sleep: formData.sleep,
    stress: formData.stress,
    fatigue: formData.fatigue,
    soreness: formData.soreness,
  };

  await addWellness(wellnessData);
  revalidatePath('/coach');
  revalidatePath('/athlete');
}

export async function getSessions(): Promise<Session[]> {
  const db = await getDb();
  return db.sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getWellness(): Promise<WellnessEntry[]> {
  const db = await getDb();
  return db.wellness.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
