
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { processStatement } from './statement-processor.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== PROCESS STATEMENTS FUNCTION STARTED ===');
    
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('Environment variables check:');
    console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? `SET (length: ${serviceRoleKey.length})` : 'NOT SET');
    console.log('OPENAI_API_KEY:', openAIKey ? 'SET' : 'NOT SET');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing required Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing required Supabase environment variables' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!openAIKey) {
      console.error('Missing OpenAI API key');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('=== QUERYING STATEMENTS ===');
    
    // Select statements with status 'processing' (max 5)
    const { data: statements, error: selectError } = await supabase
      .from('statements')
      .select('*')
      .eq('status', 'processing')
      .limit(5);

    console.log('Query results:');
    console.log('selectError:', selectError);
    console.log('statements count:', statements ? statements.length : 'null/undefined');

    if (selectError) {
      console.error('Error selecting statements:', selectError);
      return new Response(
        JSON.stringify({ error: 'Database query failed', details: selectError }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!statements || statements.length === 0) {
      console.log('No statements to process');
      return new Response(
        JSON.stringify({ 
          processed: 0, 
          message: 'No statements to process'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`=== PROCESSING ${statements.length} STATEMENTS ===`);
    let processedCount = 0;

    for (const statement of statements) {
      try {
        await processStatement(statement, supabase);
        processedCount++;
      } catch (error) {
        console.error(`❌ Error processing statement ${statement.id}:`, error);
        continue;
      }
    }

    console.log(`=== PROCESSING COMPLETE ===`);
    console.log(`Successfully processed ${processedCount} out of ${statements.length} statements`);

    return new Response(
      JSON.stringify({ 
        processed: processedCount,
        total: statements.length,
        message: `Successfully processed ${processedCount} statements`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in process-statements function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
