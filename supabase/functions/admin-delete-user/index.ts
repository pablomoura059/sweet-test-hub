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
    const { data: authUser, error: getUserError } = await sb.auth.admin.getUserById(userId);

    if (getUserError || !authUser?.user) {
      // Usuário não existe no Auth — pode já ter sido excluído por cascade
      // Tenta limpar dados relacionados de forma segura
      await sb.from('profiles').delete().eq('id', userId).catch(() => {});
      await sb.from('investments').delete().eq('user_id', userId).catch(() => {});
      await sb.from('people').delete().eq('user_id', userId).catch(() => {});

      return new Response(JSON.stringify({ success: true, note: 'User not found in auth — data cleaned up' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Etapa 2: exclui o usuário do Supabase Auth
    const { error: authError } = await sb.auth.admin.deleteUser(userId);
    if (authError) {
      return new Response(JSON.stringify({ error: 'Failed to delete auth user: ' + authError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Etapa 3: exclusão bem-sucedida — limpa dados relacionados de forma tolerante
    // O profile pode já ter sido removido por cascade do banco, então ignoramos erros
    await sb.from('profiles').delete().eq('id', userId).catch(() => {});
    await sb.from('investments').delete().eq('user_id', userId).catch(() => {});
    await sb.from('people').delete().eq('user_id', userId).catch(() => {});

    // Retorna sucesso — exclusão do Auth foi concluída com êxito
    return new Response(JSON.stringify({ success: true }), {
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
