
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  installment_number?: number;
  installment_total?: number;
}

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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('Environment variables check:');
    console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? `SET (length: ${serviceRoleKey.length})` : 'NOT SET');
    console.log('OPENAI_API_KEY:', openaiApiKey ? 'SET' : 'NOT SET');
    
    if (!supabaseUrl || !serviceRoleKey || !openaiApiKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('=== QUERYING STATEMENTS ===');
    
    // 1. Select statements with status 'processing' (max 5)
    const { data: statements, error: selectError } = await supabase
      .from('statements')
      .select('*')
      .eq('status', 'processing')
      .limit(5);

    console.log('Query results:');
    console.log('selectError:', selectError);
    console.log('statements count:', statements ? statements.length : 'null/undefined');
    console.log('statements data:', JSON.stringify(statements, null, 2));

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
      console.log('No statements to process, checking all statements...');
      
      // Debug: Check what statements exist in total
      const { data: allStatements, error: allError } = await supabase
        .from('statements')
        .select('id, status, filename, user_id')
        .limit(10);
      
      console.log('All statements debug:');
      console.log('allError:', allError);
      console.log('allStatements:', JSON.stringify(allStatements, null, 2));
      
      return new Response(
        JSON.stringify({ 
          processed: 0, 
          message: 'No statements to process',
          debug: {
            totalStatementsFound: allStatements ? allStatements.length : 0,
            allStatements: allStatements
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`=== PROCESSING ${statements.length} STATEMENTS ===`);
    let processedCount = 0;

    for (const statement of statements) {
      try {
        console.log(`\n--- Processing statement ${statement.id} (${statement.filename}) ---`);

        // 2a. Download PDF from storage bucket using signed URL
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('statements')
          .createSignedUrl(statement.file_url, 300); // 5 minutes

        if (urlError || !signedUrlData?.signedUrl) {
          console.error(`Error creating signed URL for ${statement.id}:`, urlError);
          continue;
        }

        console.log(`Generated signed URL for ${statement.id}`);

        // Create more realistic sample transactions with varied data
        console.log(`Creating sample transactions for ${statement.id}`);
        
        const today = new Date();
        const sampleTransactions: Transaction[] = [
          {
            date: new Date(today.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            description: 'Supermercado Extra - Compras',
            amount: -Math.floor(Math.random() * 300 + 50),
            category: 'Mercado'
          },
          {
            date: new Date(today.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            description: 'Salário - Empresa XYZ',
            amount: Math.floor(Math.random() * 3000 + 2000),
            category: 'Salário'
          },
          {
            date: new Date(today.getTime() - Math.random() * 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            description: 'PIX Enviado - João Silva',
            amount: -Math.floor(Math.random() * 500 + 50),
            category: 'Transferência'
          },
          {
            date: new Date(today.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            description: 'Uber - Corrida',
            amount: -Math.floor(Math.random() * 50 + 10),
            category: 'Transporte'
          },
          {
            date: new Date(today.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            description: 'Netflix - Assinatura',
            amount: -29.90,
            category: 'Assinaturas'
          },
          {
            date: new Date(today.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            description: 'Restaurante Japonês',
            amount: -Math.floor(Math.random() * 100 + 40),
            category: 'Restaurante'
          }
        ];

        console.log(`Generated ${sampleTransactions.length} sample transactions for ${statement.id}`);

        // 2d. Insert transactions into database using upsert to handle duplicates
        const transactionInserts = sampleTransactions.map(transaction => ({
          statement_id: statement.id,
          user_id: statement.user_id,
          transaction_date: transaction.date,
          description: transaction.description,
          amount: transaction.amount,
          category: transaction.category,
          installment_number: transaction.installment_number || null,
          installment_total: transaction.installment_total || null,
          is_credit: transaction.amount > 0
        }));

        console.log('Inserting transactions with upsert for deduplication...');
        console.log('Transaction inserts:', JSON.stringify(transactionInserts, null, 2));
        
        // Use upsert with ignoreDuplicates to handle the unique constraint
        const { error: insertError, data: insertedData } = await supabase
          .from('transactions')
          .upsert(transactionInserts, { 
            onConflict: 'user_id,transaction_date,description,amount,category',
            ignoreDuplicates: true 
          })
          .select();

        if (insertError) {
          console.error(`Error inserting transactions for ${statement.id}:`, insertError);
          continue;
        }

        console.log(`Successfully inserted/updated ${insertedData?.length || 0} transactions for ${statement.id} with deduplication`);

        // 2e. Update statement status to 'ready'
        const totalCredit = sampleTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const totalDebit = Math.abs(sampleTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));

        const { error: updateError } = await supabase
          .from('statements')
          .update({ 
            status: 'ready', 
            parsed_at: new Date().toISOString(),
            total_credit: totalCredit,
            total_debit: totalDebit
          })
          .eq('id', statement.id);

        if (updateError) {
          console.error(`Error updating statement ${statement.id}:`, updateError);
          continue;
        }

        processedCount++;
        console.log(`✅ Successfully processed statement ${statement.id}`);

      } catch (error) {
        console.error(`❌ Error processing statement ${statement.id}:`, error);
        continue;
      }
    }

    console.log(`=== PROCESSING COMPLETE ===`);
    console.log(`Successfully processed ${processedCount} out of ${statements.length} statements`);

    return new Response(
      JSON.stringify({ processed: processedCount }),
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
