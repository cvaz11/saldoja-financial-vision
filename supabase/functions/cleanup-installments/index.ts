// supabase/functions/cleanup-installments/index.ts
// Edge Function: cleanup-installments
// - Deduplica parcelas por (user_id, installment_id, installment_number)
// - Mantém a linha "real" (com statement_id) quando existir
// - Caso não exista "real", mantém um único placeholder
// - Remove duplicadas excedentes
// - Retorna um resumo da limpeza com exemplos

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Tx = {
  id: string;
  user_id: string;
  statement_id: string | null;
  installment_id: string | null;
  installment_number: number | null;
  installment_total: number | null;
  transaction_date: string;
  description: string | null;
  amount: number;
  category: string | null;
  created_at: string;
  is_credit: boolean | null;
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Identify current user (RLS enforced scope)
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const userId = userData.user.id;

  // Fetch all installment transactions for this user (we'll group in code)
  const { data: txs, error: fetchErr } = await supabase
    .from('transactions')
    .select(
      'id,user_id,statement_id,installment_id,installment_number,installment_total,transaction_date,description,amount,category,created_at,is_credit'
    )
    .eq('user_id', userId)
    .not('installment_id', 'is', null)
    .not('installment_number', 'is', null);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: `Fetch error: ${fetchErr.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const byKey = new Map<string, Tx[]>();
  for (const t of (txs || []) as Tx[]) {
    const key = `${t.installment_id}|${t.installment_number}`;
    const arr = byKey.get(key) || [];
    arr.push(t);
    byKey.set(key, arr);
  }

  let groupsProcessed = 0;
  let groupsWithDuplicates = 0;
  let groupsFixedKeepReal = 0;
  let groupsFixedKeepPlaceholder = 0;
  let duplicatesRemoved = 0;

  const examples: any[] = [];
  const idsToDelete: string[] = [];

  const sortByCreatedAtAsc = (a: Tx, b: Tx) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

  for (const [key, list] of byKey.entries()) {
    if (list.length <= 1) continue; // no duplicates
    groupsProcessed++;
    groupsWithDuplicates++;

    const reals = list.filter((t) => t.statement_id);
    const placeholders = list.filter((t) => !t.statement_id);

    if (reals.length > 0) {
      // Keep one real deterministically (oldest created_at)
      reals.sort(sortByCreatedAtAsc);
      const keep = reals[0];
      const toDelete = [
        ...reals.slice(1).map((t) => t.id),
        ...placeholders.map((t) => t.id),
      ];
      idsToDelete.push(...toDelete);
      duplicatesRemoved += toDelete.length;
      groupsFixedKeepReal++;

      if (examples.length < 5) {
        const [installmentId, installmentNumber] = key.split('|');
        examples.push({
          action: 'keep_real_delete_others',
          installment_id: installmentId,
          installment_number: Number(installmentNumber),
          kept_id: keep.id,
          deleted_ids: toDelete,
        });
      }
    } else {
      // Only placeholders exist; keep one deterministically
      placeholders.sort(sortByCreatedAtAsc);
      const keep = placeholders[0];
      const toDelete = placeholders.slice(1).map((t) => t.id);
      idsToDelete.push(...toDelete);
      duplicatesRemoved += toDelete.length;
      groupsFixedKeepPlaceholder++;

      if (examples.length < 5) {
        const [installmentId, installmentNumber] = key.split('|');
        examples.push({
          action: 'keep_placeholder_delete_extras',
          installment_id: installmentId,
          installment_number: Number(installmentNumber),
          kept_id: keep.id,
          deleted_ids: toDelete,
        });
      }
    }
  }

  // Batch delete in chunks to avoid payload limits
  const chunkSize = 200;
  for (let i = 0; i < idsToDelete.length; i += chunkSize) {
    const chunk = idsToDelete.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    const { error: delErr } = await supabase.from('transactions').delete().in('id', chunk);
    if (delErr) {
      return new Response(
        JSON.stringify({ error: `Delete error: ${delErr.message}`, progress: { i, total: idsToDelete.length } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  const summary = {
    user_id: userId,
    groupsProcessed,
    groupsWithDuplicates,
    groupsFixedKeepReal,
    groupsFixedKeepPlaceholder,
    duplicatesRemoved,
    examples,
  };

  return new Response(JSON.stringify({ ok: true, summary }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
