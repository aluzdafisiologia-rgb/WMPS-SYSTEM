'use server'

import { addSession, addWellness, getDb, Session, WellnessEntry, saveProfile } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { supabase } from '../lib/supabase';

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
export async function registerProfile(profile: any) {
  const athlete_id = profile.fullName.toLowerCase().replace(/\s+/g, '-');
  const data = {
    athlete_id,
    full_name: profile.fullName,
    email: profile.email,
    birth_date: profile.birthDate,
    gender: profile.gender,
    height: profile.height,
    weight: profile.weight,
    sport: profile.sport,
    goal: profile.goal,
    experience_level: profile.experienceLevel
  };

  try {
    const result = await saveProfile(data); 
    revalidatePath('/');
    revalidatePath('/coach');
    return result;
  } catch (error) {
    console.error('Action error (registerProfile):', error);
    throw error;
  }
}

export async function submitRegistrationRequest(request: any) {
  const { data, error } = await supabase.from('registration_requests').insert([request]).select().single();
  if (error) {
    console.error('Error submitting registration request:', error);
    throw error;
  }
  return data;
}

export async function getRegistrationRequests() {
  const { data, error } = await supabase.from('registration_requests').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching registration requests:', error);
    throw error;
  }
  return data;
}
