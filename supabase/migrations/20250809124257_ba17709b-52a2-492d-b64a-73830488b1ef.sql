-- 1) Garantir unicidade por compra parcelada e número da parcela por usuário
-- Isso evita duplicações mesmo em reprocessamentos e importações de meses seguintes
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_unique_installment_per_user
UNIQUE (user_id, installment_id, installment_number);

-- 2) Índice para consultas e upserts eficientes
CREATE INDEX IF NOT EXISTS idx_transactions_user_installment
  ON public.transactions (user_id, installment_id, installment_number);
