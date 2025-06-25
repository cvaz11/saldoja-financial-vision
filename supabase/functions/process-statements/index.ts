
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

  const functionStartTime = Date.now();

  try {
    console.log('\n🚀 PROCESS STATEMENTS FUNCTION STARTED');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Environment variables validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('🔧 Environment Check:');
    console.log(`  SUPABASE_URL: ${supabaseUrl ? '✅ SET' : '❌ MISSING'}`);
    console.log(`  SERVICE_ROLE_KEY: ${serviceRoleKey ? `✅ SET (${serviceRoleKey.length} chars)` : '❌ MISSING'}`);
    console.log(`  OPENAI_API_KEY: ${openAIKey ? '✅ SET' : '❌ MISSING'}`);
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Missing Supabase configuration',
          details: 'SUPABASE_URL or SERVICE_ROLE_KEY not configured'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!openAIKey) {
      console.error('❌ Missing OpenAI API key');
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          details: 'OPENAI_API_KEY environment variable is required'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    console.log('✅ Supabase client initialized');

    // Query statements to process
    console.log('🔍 Querying statements with status "processing"...');
    
    const { data: statements, error: selectError } = await supabase
      .from('statements')
      .select('*')
      .eq('status', 'processing')
      .limit(5)
      .order('uploaded_at', { ascending: true });

    if (selectError) {
      console.error('❌ Database query error:', selectError);
      return new Response(
        JSON.stringify({ 
          error: 'Database query failed', 
          details: selectError.message 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📋 Query Results: ${statements?.length || 0} statements found`);

    if (!statements || statements.length === 0) {
      console.log('ℹ️  No statements to process');
      return new Response(
        JSON.stringify({ 
          processed: 0, 
          total: 0,
          message: 'No statements found with processing status'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each statement
    console.log(`\n⚡ Processing ${statements.length} statements...`);
    let processedCount = 0;
    const results = [];

    for (const statement of statements) {
      const statementStartTime = Date.now();
      
      try {
        console.log(`\n--- Processing ${processedCount + 1}/${statements.length} ---`);
        await processStatement(statement, supabase);
        
        const statementTime = Date.now() - statementStartTime;
        processedCount++;
        
        results.push({
          id: statement.id,
          filename: statement.filename,
          status: 'success',
          processingTime: statementTime
        });
        
        console.log(`✅ Statement ${statement.id} completed in ${statementTime}ms`);
        
      } catch (error) {
        const statementTime = Date.now() - statementStartTime;
        console.error(`❌ Statement ${statement.id} failed in ${statementTime}ms:`, error.message);
        
        results.push({
          id: statement.id,
          filename: statement.filename,
          status: 'error',
          error: error.message,
          processingTime: statementTime
        });
        
        // Continue processing other statements
        continue;
      }
    }

    const totalTime = Date.now() - functionStartTime;
    console.log(`\n🏁 PROCESSING COMPLETE`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Processed: ${processedCount}/${statements.length}`);
    console.log(`   Success rate: ${((processedCount / statements.length) * 100).toFixed(1)}%`);

    return new Response(
      JSON.stringify({ 
        processed: processedCount,
        total: statements.length,
        successRate: ((processedCount / statements.length) * 100).toFixed(1) + '%',
        totalProcessingTime: totalTime,
        results: results,
        message: `Successfully processed ${processedCount} out of ${statements.length} statements`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const totalTime = Date.now() - functionStartTime;
    console.error(`💥 CRITICAL ERROR after ${totalTime}ms:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        processingTime: totalTime
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
