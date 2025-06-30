
-- Garantir que a coluna created_at existe
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- Garantir que RLS está habilitado
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Criar política específica para INSERT
DROP POLICY IF EXISTS "owner-insert" ON public.transactions;
CREATE POLICY "owner-insert"
  ON public.transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
