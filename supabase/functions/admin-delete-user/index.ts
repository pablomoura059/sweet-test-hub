// deno-lint-ignore-file no-explicit-any
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const token = authHeader.replace('Bearer ', '');

  // Cria cliente admin com SERVICE_ROLE_KEY
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verifica se quem chamou é admin
  const { data: callerClaims } = await sb.auth.getClaims(token).catch(() => ({ data: null }));
  if (!callerClaims?.claims?.sub) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const { data: callerProfile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', callerClaims.claims.sub)
    .single();

  if (callerProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Parse request body
  let userId: string | undefined;
  try {
    const body = await req.json();
    userId = body?.userId;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return new Response(JSON.stringify({ error: 'userId is required and must be a non-empty string' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  userId = userId.trim();

  try {
    // Etapa 1: verifica se o usuário existe no Auth
    console.log('admin-delete-user: checking auth user', userId);
    const { data: authUser, error: getUserError } = await sb.auth.admin.getUserById(userId);
    console.log('admin-delete-user: auth check done', { found: !!authUser?.user, error: getUserError?.message });

    if (getUserError || !authUser?.user) {
      // Usuário não existe no Auth — já pode ter sido excluído
      console.log('admin-delete-user: user not found in auth, returning 200 as success');
      return new Response(JSON.stringify({ success: true, alreadyDeleted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Etapa 2: exclui o usuário do Supabase Auth
    console.log('admin-delete-user: deleting auth user', userId);
    const { error: authError } = await sb.auth.admin.deleteUser(userId);
    console.log('admin-delete-user: deleteUser result', { error: authError?.message });

    if (authError) {
      console.error('admin-delete-user: deleteUser failed', authError.message);
      return new Response(JSON.stringify({ error: 'Failed to delete auth user: ' + authError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Etapa 3: exclusão do Auth concluída — retorna 200 imediatamente
    // A limpeza de profiles/investments/people fica para uma próxima etapa, após validação
    console.log('admin-delete-user: returning 200 success');
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    console.error('Unexpected error in admin-delete-user:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
