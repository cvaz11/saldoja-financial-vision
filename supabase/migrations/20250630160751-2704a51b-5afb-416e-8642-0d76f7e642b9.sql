
-- Verificar se a coluna created_at existe e adicioná-la se necessário
DO $$
BEGIN
    -- Verificar se a coluna existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions' 
        AND column_name = 'created_at'
    ) THEN
        -- Adicionar a coluna com valor padrão
        ALTER TABLE public.transactions 
        ADD COLUMN created_at timestamptz NOT NULL DEFAULT NOW();
        
        -- Atualizar registros existentes (se houver)
        UPDATE public.transactions 
        SET created_at = NOW() 
        WHERE created_at IS NULL;
    END IF;
END
$$;

-- Garantir que a coluna tenha o valor padrão correto
ALTER TABLE public.transactions 
ALTER COLUMN created_at SET DEFAULT NOW();
