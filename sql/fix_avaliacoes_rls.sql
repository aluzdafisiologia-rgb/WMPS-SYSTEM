-- ============================================================
-- WMPS: SQL para corrigir a tabela avaliacoes no Supabase
-- Execute este script no SQL Editor do Supabase Dashboard
-- URL: https://supabase.com/dashboard/project/lilngtmfqbryqeuupxxz/sql
-- ============================================================

-- 1. Drop e recriar a tabela com estrutura correta
DROP TABLE IF EXISTS public.avaliacoes CASCADE;

CREATE TABLE public.avaliacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id text NOT NULL,
  athlete_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('anthropometric', 'agility', 'strength', 'power', 'endurance', 'other')),
  date date NOT NULL DEFAULT current_date,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- 3. Política: Treinadores e admins podem fazer tudo
CREATE POLICY "coach_full_access" ON public.avaliacoes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('coach', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('coach', 'admin')
    )
  );

-- 4. Política: Atletas podem ler suas próprias avaliações
CREATE POLICY "athlete_read_own" ON public.avaliacoes
  FOR SELECT
  TO authenticated
  USING (athlete_id = auth.uid()::text);

-- 5. Política: Service role bypassa RLS (necessário para Server Actions)
ALTER TABLE public.avaliacoes FORCE ROW LEVEL SECURITY;

-- 6. Grant explícito
GRANT ALL ON public.avaliacoes TO authenticated;
GRANT ALL ON public.avaliacoes TO service_role;
GRANT ALL ON public.avaliacoes TO anon;

-- 7. Verificar
SELECT 
  schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'avaliacoes';

SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'avaliacoes';
