-- Migration 002: Adicionar coluna cpf_cnpj à tabela profiles
-- Executar isoladamente no SQL Editor do Supabase

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
