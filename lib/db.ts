// Types and Interfaces for the William Moreira Performance System (WMPS)

export interface Session {
  id: string;
  athlete_id: string;
  athlete_name: string;
  date: string;
  rpe: number; // 1-10
  duration: number; // minutes
  load: number; // rpe * duration
  distance?: number; // km
  volume?: number; // total tons/kg (external load)
  series?: number;
  reps?: number;
}

export interface WellnessEntry {
  id: string;
  athlete_id: string;
  athlete_name: string;
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
  athlete_id: string;
  full_name: string;
  email: string;
  phone?: string;
  birth_date: string;
  gender: string;
  height: number;
  weight: number;
  sport: string;
  goal: string;
  experience_level: string;
  is_minor?: boolean;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relationship?: string;
  photo_url?: string;
  team_name?: string;
  created_at?: string;
  role?: 'athlete' | 'coach' | 'admin';
  is_injured?: boolean;
  injury_description?: string;
}

export interface TrainingPrescription {
  id?: string;
  athlete_id: string;
  coach_id: string;
  athlete_name: string;
  date?: string;
  status: 'pending' | 'completed';
  data: any;
  created_at?: string;
  completed_at?: string;
}

// Nota: Todas as funções de banco de dados foram movidas para app/actions.ts 
// para garantir consistência e segurança via Server Actions.
