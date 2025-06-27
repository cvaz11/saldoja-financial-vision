
-- Verificar se RLS está habilitado e criar/recriar políticas
ALTER TABLE public.statements ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes e recriar
DROP POLICY IF EXISTS "Users can view own statements" ON public.statements;
DROP POLICY IF EXISTS "Users can insert own statements" ON public.statements;
DROP POLICY IF EXISTS "Users can update own statements" ON public.statements;
DROP POLICY IF EXISTS "Users can delete own statements" ON public.statements;

-- Recriar políticas com nomes mais específicos
CREATE POLICY "owner can select statement" 
  ON public.statements 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "owner can insert statement" 
  ON public.statements 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner can update statement" 
  ON public.statements 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "owner can delete statement" 
  ON public.statements 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Garantir que a FK tenha CASCADE
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_statement_id_fkey;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_statement_id_fkey 
FOREIGN KEY (statement_id) 
REFERENCES public.statements(id) 
ON DELETE CASCADE;

-- Verificar se user_id não é nullable na tabela statements
ALTER TABLE public.statements ALTER COLUMN user_id SET NOT NULL;
