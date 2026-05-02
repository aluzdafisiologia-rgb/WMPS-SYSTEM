-- ====================================================================
-- WMPS: SQL para adicionar colunas de Responsável Legal (Menores)
-- Execute este script no SQL Editor do Supabase Dashboard
-- ====================================================================

-- 1. Atualizar tabela registration_requests
ALTER TABLE registration_requests 
ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS guardian_name TEXT,
ADD COLUMN IF NOT EXISTS guardian_cpf TEXT,
ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
ADD COLUMN IF NOT EXISTS guardian_relationship TEXT;

-- 2. Atualizar tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS guardian_name TEXT,
ADD COLUMN IF NOT EXISTS guardian_cpf TEXT,
ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
ADD COLUMN IF NOT EXISTS guardian_relationship TEXT;

-- Confirmar se a coluna cpf existe nas tabelas, caso não, adicionar:
ALTER TABLE registration_requests ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
