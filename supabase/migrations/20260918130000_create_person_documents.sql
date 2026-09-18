-- Tabela de documentos de pessoas
create table if not exists public.person_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

alter table public.person_documents enable row level security;

create policy "pessoa_documents_select"
  on public.person_documents for select
  using (auth.uid() = user_id);

create policy "pessoa_documents_insert"
  on public.person_documents for insert
  with check (auth.uid() = user_id);

create policy "pessoa_documents_delete"
  on public.person_documents for delete
  using (auth.uid() = user_id);

-- Trigger updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create or replace trigger person_documents_updated_at
  before update on public.person_documents
  for each row execute function public.handle_updated_at();

-- Limite de 3 documentos por pessoa via trigger
create or replace function public.check_documents_limit()
returns trigger as $$
declare
  current_count bigint;
begin
  select count(*) into current_count
  from public.person_documents
  where person_id = new.person_id and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if current_count >= 3 then
    raise exception 'Limite de 3 documentos atingido para esta pessoa.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

create or replace trigger enforce_documents_limit
  before insert on public.person_documents
  for each row execute function public.check_documents_limit();