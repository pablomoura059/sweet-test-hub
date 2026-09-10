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

  // Validate calling user is admin
  const supabaseAdmin = (globalThis as any).DenoSupabase;
  if (!supabaseAdmin) {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    (globalThis as any).DenoSupabase = sb;
  }

  const sb = (globalThis as any).DenoSupabase;

  // Verify caller is admin
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

  const { userId } = await req.json();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Delete from auth.users (service role bypasses RLS)
  const { error: authError } = await sb.auth.admin.deleteUser(userId);
  if (authError) {
    return new Response(JSON.stringify({ error: 'Failed to delete auth user: ' + authError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Delete profile (RLS bypassed by service role key)
  const { error: profileError } = await sb.from('profiles').delete().eq('id', userId);
  if (profileError) {
    console.error('Profile delete error:', profileError);
  }

  // Cascade delete related data
  await sb.from('investments').delete().eq('user_id', userId).catch(() => {});
  await sb.from('people').delete().eq('user_id', userId).catch(() => {});

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
});
