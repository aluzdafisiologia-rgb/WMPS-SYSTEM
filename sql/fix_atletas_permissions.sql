-- 1. Desativar RLS temporariamente para recuperar acesso
ALTER TABLE atletas DISABLE ROW LEVEL SECURITY;

-- 2. Garantir permissões básicas (Para Service Role e Autenticados)
GRANT ALL ON TABLE atletas TO postgres, service_role, authenticated, anon;
