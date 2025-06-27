
-- Verificar se as políticas RLS existem e criar/atualizar conforme necessário
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Política para SELECT (já deve existir, mas vamos garantir)
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" 
  ON public.transactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para INSERT (já deve existir, mas vamos garantir)
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" 
  ON public.transactions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE (CRÍTICA - provavelmente está ausente)
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions" 
  ON public.transactions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Política para DELETE (CRÍTICA - provavelmente está ausente)
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions" 
  ON public.transactions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Verificar se a coluna user_id não é nullable (crítico para RLS)
ALTER TABLE public.transactions ALTER COLUMN user_id SET NOT NULL;

-- Adicionar realtime para atualizações em tempo real
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
