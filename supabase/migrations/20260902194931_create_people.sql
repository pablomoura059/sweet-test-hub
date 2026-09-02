-- Criação da tabela people
CREATE TABLE IF NOT EXISTS public.people (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Semillas de updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER people_updated_at
  BEFORE UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

-- Policies: cada usuário vê/só edita seus próprios registros
CREATE POLICY "people_select_own" ON public.people FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "people_insert_own" ON public.people FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "people_update_own" ON public.people FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "people_delete_own" ON public.people FOR DELETE USING (auth.uid() = user_id);
