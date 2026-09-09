-- Migration: Corrigir role de 'client' para 'manager'
-- Data: 2026-09-09
-- Objetivo: Alinhar com o modelo definitivo onde só existem admin e manager

-- 1. Atualizar profiles existentes: client -> manager
UPDATE public.profiles
SET role = 'manager'
WHERE role = 'client';

-- 2. Corrigir trigger handle_new_user para usar 'manager' em vez de 'client'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email,
    'manager',
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
