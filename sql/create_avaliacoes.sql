CREATE TABLE public.avaliacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_name text NOT NULL,
  type text NOT NULL, -- e.g., 'anthropometric', 'agility', 'strength', 'power'
  date date NOT NULL DEFAULT current_date,
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Profissionais podem ler e escrever avaliacoes" ON public.avaliacoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('coach', 'admin'))
  );

CREATE POLICY "Atletas podem ler suas proprias avaliacoes" ON public.avaliacoes
  FOR SELECT USING (athlete_id = auth.uid());
