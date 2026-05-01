-- 1. ATIVAR RLS EM TODAS AS TABELAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anamnesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS PARA 'PROFILES'
-- Qualquer um pode ler nomes básicos, mas apenas o dono ou coach lê tudo
CREATE POLICY "Perfis visíveis para coaches e o próprio usuário" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('coach', 'admin'))
  );

CREATE POLICY "Usuários podem atualizar seus próprios perfis" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. POLÍTICAS PARA 'SESSIONS' (TREINOS)
CREATE POLICY "Atletas leem seus próprios treinos" ON public.sessions
  FOR SELECT USING (athlete_id::uuid = auth.uid());

CREATE POLICY "Coaches leem todos os treinos" ON public.sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('coach', 'admin'))
  );

CREATE POLICY "Atletas inserem seus próprios treinos" ON public.sessions
  FOR INSERT WITH CHECK (athlete_id::uuid = auth.uid());

-- 4. POLÍTICAS PARA 'WELLNESS'
CREATE POLICY "Atletas leem seu próprio wellness" ON public.wellness
  FOR SELECT USING (athlete_id::uuid = auth.uid());

CREATE POLICY "Coaches leem todo wellness" ON public.wellness
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('coach', 'admin'))
  );

CREATE POLICY "Atletas inserem seu próprio wellness" ON public.wellness
  FOR INSERT WITH CHECK (athlete_id::uuid = auth.uid());

-- 5. POLÍTICAS PARA 'TRAINING_PRESCRIPTIONS'
CREATE POLICY "Atletas leem suas prescrições" ON public.training_prescriptions
  FOR SELECT USING (athlete_id::uuid = auth.uid());

CREATE POLICY "Coaches gerenciam prescrições" ON public.training_prescriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('coach', 'admin'))
  );

-- 6. POLÍTICAS PARA 'REGISTRATION_REQUESTS'
CREATE POLICY "Público pode inserir solicitações" ON public.registration_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Apenas coaches leem/gerenciam solicitações" ON public.registration_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('coach', 'admin'))
  );

-- 7. POLÍTICAS PARA 'ANAMNESIS'
CREATE POLICY "Atletas leem sua anamnese" ON public.anamnesis
  FOR SELECT USING (athlete_id::uuid = auth.uid());

CREATE POLICY "Coaches gerenciam anamnese" ON public.anamnesis
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('coach', 'admin'))
  );
