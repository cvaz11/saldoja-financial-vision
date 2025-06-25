
-- Add unique constraint for transaction deduplication
-- Key: (user_id, transaction_date, description, amount, category)
ALTER TABLE public.transactions 
ADD CONSTRAINT unique_transaction_per_user 
UNIQUE (user_id, transaction_date, description, amount, category);

-- Enable realtime for statements table
ALTER TABLE public.statements REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.statements;
