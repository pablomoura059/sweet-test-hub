-- ============================================================
-- TABELA: user_settings
-- Data: 2026-09-14
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  system_name      TEXT,
  system_subtitle  TEXT,
  logo_url         TEXT,
  profile_photo_url TEXT,
  theme            TEXT NOT NULL DEFAULT 'dark'
                    CHECK (theme IN ('dark', 'light', 'system')),
  primary_color    TEXT NOT NULL DEFAULT 'blue'
                    CHECK (primary_color IN ('blue', 'purple', 'green', 'orange', 'red', 'pink')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_user_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_settings_updated_at ON public.user_settings;
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_settings_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- SELECT: usuário vê apenas sua própria configuração
DROP POLICY IF EXISTS "user_settings_select_own" ON public.user_settings;
CREATE POLICY "user_settings_select_own" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: usuário cria apenas sua própria configuração
DROP POLICY IF EXISTS "user_settings_insert_own" ON public.user_settings;
CREATE POLICY "user_settings_insert_own" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: usuário atualiza apenas sua própria configuração
DROP POLICY IF EXISTS "user_settings_update_own" ON public.user_settings;
CREATE POLICY "user_settings_update_own" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: usuário exclui apenas sua própria configuração
DROP POLICY IF EXISTS "user_settings_delete_own" ON public.user_settings;
CREATE POLICY "user_settings_delete_own" ON public.user_settings
  FOR DELETE USING (auth.uid() = user_id);
