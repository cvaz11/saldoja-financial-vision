-- Enable realtime for statements table
ALTER TABLE public.statements REPLICA IDENTITY FULL;

-- The table is already in the supabase_realtime publication based on the query above,
-- but let's ensure it's properly configured for real-time updates
-- We'll add it again just to be safe (this won't error if it already exists)
DO $$
BEGIN
    -- Check if the table is already in the publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'statements'
    ) THEN
        -- Add the table to the publication if it's not already there
        ALTER PUBLICATION supabase_realtime ADD TABLE public.statements;
    END IF;
END $$;