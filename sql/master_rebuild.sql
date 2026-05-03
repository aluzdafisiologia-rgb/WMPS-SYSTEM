-- =================================================================================
-- FASE 1: LIMPEZA TOTAL E EXTREMA
-- =================================================================================
-- Desabilitar gatilhos temporariamente
SET session_replication_role = 'replica';

DROP TABLE IF EXISTS sessoes_treino CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS bem_estar CASCADE;
DROP TABLE IF EXISTS wellness CASCADE;
DROP TABLE IF EXISTS treinos CASCADE;
DROP TABLE IF EXISTS training_prescriptions CASCADE;
DROP TABLE IF EXISTS anamnese CASCADE;
DROP TABLE IF EXISTS anamnesis CASCADE;
DROP TABLE IF EXISTS avaliacoes CASCADE;
DROP TABLE IF EXISTS ciclo_menstrual CASCADE;
DROP TABLE IF EXISTS sintomas_menstruais CASCADE;
DROP TABLE IF EXISTS prontidao CASCADE;
DROP TABLE IF EXISTS comorbidades CASCADE;
DROP TABLE IF EXISTS registros_clinicos CASCADE;
DROP TABLE IF EXISTS registration_requests CASCADE;
DROP TABLE IF EXISTS atletas CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

SET session_replication_role = 'origin';

-- =================================================================================
-- FASE 2: RECRIAÇÃO DA ARQUITETURA BASE
-- =================================================================================

-- 1. TABELA: ATLETAS (Base do Sistema)
CREATE TABLE atletas (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    athlete_id TEXT UNIQUE, -- Slug
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    cpf TEXT,
    role TEXT DEFAULT 'athlete' CHECK (role IN ('athlete', 'coach', 'admin')),
    birth_date DATE,
    gender TEXT,
    height NUMERIC,
    weight NUMERIC,
    sport TEXT,
    goal TEXT,
    experience_level TEXT,
    team_name TEXT,
    photo_url TEXT,
    must_change_password BOOLEAN DEFAULT false,
    
    -- Menores de Idade
    is_minor BOOLEAN DEFAULT false,
    guardian_name TEXT,
    guardian_cpf TEXT,
    guardian_phone TEXT,
    guardian_relationship TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_atletas_role ON atletas(role);
CREATE INDEX idx_atletas_email ON atletas(email);

-- 2. TABELA: REGISTRATION REQUESTS (Novos Cadastros)
CREATE TABLE registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    cpf TEXT,
    birth_date DATE,
    is_minor BOOLEAN DEFAULT false,
    guardian_name TEXT,
    guardian_cpf TEXT,
    guardian_phone TEXT,
    guardian_relationship TEXT,
    status TEXT DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA: ANAMNESE (Histórico Inicial)
CREATE TABLE anamnese (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES atletas(id) ON DELETE CASCADE,
    athlete_name TEXT,
    date DATE NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(athlete_id, date)
);

-- 4. TABELA: COMORBIDADES (Perfil Clínico Base)
CREATE TABLE comorbidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES atletas(id) ON DELETE CASCADE UNIQUE,
    has_comorbidities BOOLEAN DEFAULT false,
    comorbidities JSONB DEFAULT '[]',
    takes_medication BOOLEAN DEFAULT false,
    medications JSONB DEFAULT '[]',
    has_injuries BOOLEAN DEFAULT false,
    injuries JSONB DEFAULT '[]',
    observations TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA: REGISTROS CLÍNICOS (Log Clínico)
CREATE TABLE registros_clinicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES atletas(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    blood_pressure TEXT,
    heart_rate INTEGER,
    blood_glucose INTEGER,
    symptoms JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABELA: AVALIAÇÕES (Físicas e Biomecânicas)
CREATE TABLE avaliacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES atletas(id) ON DELETE CASCADE,
    athlete_name TEXT,
    type TEXT NOT NULL,
    date DATE NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_avaliacoes_athlete ON avaliacoes(athlete_id);

-- 7. TABELA: CICLO MENSTRUAL (Fisiologia Feminina)
CREATE TABLE ciclo_menstrual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES atletas(id) ON DELETE CASCADE UNIQUE,
    last_period_date DATE,
    cycle_duration INTEGER,
    regular BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABELA: SINTOMAS MENSTRUAIS (Tracking Diário)
CREATE TABLE sintomas_menstruais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES atletas(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    fatigue INTEGER DEFAULT 1,
    pain INTEGER DEFAULT 1,
    bloating INTEGER DEFAULT 1,
    mood INTEGER DEFAULT 1,
    flow TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TABELA: PRONTIDÃO (Readiness/AI)
CREATE TABLE prontidao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES atletas(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    score INTEGER NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(athlete_id, date)
);

-- 10. TABELA: BEM-ESTAR (Wellness Diário)
CREATE TABLE bem_estar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES atletas(id) ON DELETE CASCADE,
    athlete_name TEXT,
    date DATE NOT NULL,
    recovery INTEGER NOT NULL,
    sleep INTEGER NOT NULL,
    stress INTEGER NOT NULL,
    fatigue INTEGER NOT NULL,
    soreness INTEGER NOT NULL,
    score INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. TABELA: TREINOS (Prescrições do Coach)
CREATE TABLE treinos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES atletas(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES atletas(id) ON DELETE SET NULL,
    athlete_name TEXT,
    status TEXT DEFAULT 'pending',
    data JSONB NOT NULL DEFAULT '{}',
    completed_blocks INTEGER,
    total_blocks INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_treinos_athlete ON treinos(athlete_id);

-- 12. TABELA: SESSOES_TREINO (Execução Diária)
CREATE TABLE sessoes_treino (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID REFERENCES atletas(id) ON DELETE CASCADE,
    athlete_name TEXT,
    date DATE NOT NULL,
    rpe INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    load INTEGER NOT NULL,
    distance NUMERIC DEFAULT 0,
    volume NUMERIC DEFAULT 0,
    series INTEGER DEFAULT 0,
    reps INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================================
-- FASE 3: SEGURANÇA E RLS (ROW LEVEL SECURITY)
-- =================================================================================

-- 1. Habilitar RLS em Todas as Tabelas
ALTER TABLE atletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE anamnese ENABLE ROW LEVEL SECURITY;
ALTER TABLE comorbidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_clinicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciclo_menstrual ENABLE ROW LEVEL SECURITY;
ALTER TABLE sintomas_menstruais ENABLE ROW LEVEL SECURITY;
ALTER TABLE prontidao ENABLE ROW LEVEL SECURITY;
ALTER TABLE bem_estar ENABLE ROW LEVEL SECURITY;
ALTER TABLE treinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes_treino ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS GENÉRICAS SIMPLIFICADAS
-- Para evitar o inferno da recursão infinita, usamos auth.uid() direto.
-- A Service Role (nossas Actions Next.js) ignora tudo isso e escreve sem barreiras.

CREATE POLICY "Atletas vêem a si mesmos" ON atletas FOR SELECT USING (auth.uid() = id);
-- Coaches e Admins podem ver a tabela usando a API Server Side, client side será bloqueado se não for o dono.

CREATE POLICY "Leitura Própria Anamnese" ON anamnese FOR SELECT USING (auth.uid() = athlete_id);
CREATE POLICY "Leitura Própria Comorbidades" ON comorbidades FOR SELECT USING (auth.uid() = athlete_id);
CREATE POLICY "Leitura Própria Registros" ON registros_clinicos FOR SELECT USING (auth.uid() = athlete_id);
CREATE POLICY "Leitura Própria Avaliacoes" ON avaliacoes FOR SELECT USING (auth.uid() = athlete_id);
CREATE POLICY "Leitura Própria Ciclo" ON ciclo_menstrual FOR SELECT USING (auth.uid() = athlete_id);
CREATE POLICY "Leitura Própria Sintomas" ON sintomas_menstruais FOR SELECT USING (auth.uid() = athlete_id);
CREATE POLICY "Leitura Própria Prontidao" ON prontidao FOR SELECT USING (auth.uid() = athlete_id);
CREATE POLICY "Leitura Própria Bem Estar" ON bem_estar FOR SELECT USING (auth.uid() = athlete_id);
CREATE POLICY "Leitura Própria Treinos" ON treinos FOR SELECT USING (auth.uid() = athlete_id);
CREATE POLICY "Leitura Própria Sessoes" ON sessoes_treino FOR SELECT USING (auth.uid() = athlete_id);

-- Inserção Pública apenas para novos cadastros (Requests)
CREATE POLICY "Inserção Aberta" ON registration_requests FOR INSERT WITH CHECK (true);

-- Permissões gerais para autenticados
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
