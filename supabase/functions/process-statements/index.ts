import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import {
  getDocument,
  GlobalWorkerOptions
} from "npm:pdfjs-dist@3.11.174/build/pdf.mjs";

/* Registrar o worker do pdfjs – hospedado via esm.sh */
GlobalWorkerOptions.workerSrc =
  "https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

console.log("[PDFJS] workerSrc set ✔");

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

const extractTextFromPDF = async (fileData: Blob): Promise<string> => {
  try {
    console.log('[PDF] Starting text extraction...');
    
    // Convert blob to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const pdfBuffer = new Uint8Array(arrayBuffer);
    
    console.log(`[PDF] size=${pdfBuffer.length} bytes`);
    
    // Load the PDF document
    const pdf = await getDocument({ data: pdfBuffer }).promise;
    console.log(`[PDF] pages=${pdf.numPages}`);
    
    let fullText = "";
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    
    console.log(`[PDF] Extracted text length: ${fullText.length} characters`);
    return fullText.trim();
    
  } catch (error) {
    console.error('[PDF] Error extracting text:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

const parseStatementContent = async (fileUrl: string, supabase: any): Promise<Transaction[]> => {
  try {
    console.log(`[PDF] Downloading from: ${fileUrl}`);
    
    // Download the PDF file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('statements')
      .download(fileUrl);
    
    if (downloadError) {
      console.error('[PDF] Error downloading:', downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }
    
    console.log('[PDF] Downloaded successfully');
    
    // Extract text from PDF
    const extractedText = await extractTextFromPDF(fileData);
    
    if (!extractedText || extractedText.length < 50) {
      console.error('[PDF] Extracted text is too short or empty');
      throw new Error('PDF text extraction failed - no meaningful content found');
    }
    
    console.log('[GPT] Starting OpenAI processing...');
    
    // Prepare text for OpenAI (limit to ~15k tokens, roughly 60k characters)
    const textForGPT = extractedText.length > 60000 
      ? extractedText.substring(0, 60000) + '...'
      : extractedText;
    
    console.log(`[GPT] Text length for processing: ${textForGPT.length} characters`);
    
    // Use OpenAI to extract transaction data from the text
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em análise de extratos bancários brasileiros. Analise o texto do extrato e extraia TODAS as transações encontradas.

Para cada transação, retorne um JSON com:
- date: data no formato YYYY-MM-DD
- description: descrição da transação (limpa, sem códigos desnecessários)
- amount: valor (positivo para créditos/entradas, negativo para débitos/saídas)
- category: categoria baseada na descrição (Mercado, Restaurante, Transporte, Assinaturas, Transferência, Salário, Freelance, Eletrônicos, Saúde, etc.)
- installment_number: número da parcela (se aplicável)
- installment_total: total de parcelas (se aplicável)

IMPORTANTE: 
- Extraia APENAS transações reais do extrato
- NÃO invente ou crie dados fictícios
- Se não encontrar transações, retorne array vazio []
- Valores devem estar corretos conforme o extrato

Retorne APENAS um array JSON válido, sem texto adicional.`
          },
          {
            role: 'user',
            content: `Analise este extrato bancário e extraia todas as transações:\n\n${textForGPT}`
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      }),
    });
    
    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('[GPT] API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
    }
    
    const openAIResult = await openAIResponse.json();
    console.log(`[GPT] tokens_in=${openAIResult.usage?.prompt_tokens || 'unknown'} tokens_out=${openAIResult.usage?.completion_tokens || 'unknown'}`);
    
    const extractedTransactionsText = openAIResult.choices[0].message.content;
    console.log('[GPT] Raw response:', extractedTransactionsText);
    
    // Parse the JSON response from OpenAI
    let transactions: Transaction[];
    try {
      transactions = JSON.parse(extractedTransactionsText);
      console.log(`[GPT] Successfully parsed ${transactions.length} transactions`);
    } catch (parseError) {
      console.error('[GPT] Error parsing JSON response:', parseError);
      console.log('[GPT] Raw response that failed to parse:', extractedTransactionsText);
      throw new Error('Failed to parse transaction data from OpenAI response');
    }
    
    // Validate transactions
    if (!Array.isArray(transactions)) {
      throw new Error('OpenAI response is not an array of transactions');
    }
    
    // Filter and validate transaction data
    const validTransactions = transactions.filter(transaction => {
      return transaction.date && 
             transaction.description && 
             typeof transaction.amount === 'number' && 
             transaction.category;
    });
    
    console.log(`[VALIDATION] Filtered to ${validTransactions.length} valid transactions`);
    
    if (validTransactions.length === 0) {
      console.log('[VALIDATION] No valid transactions found in PDF');
    }
    
    return validTransactions;
    
  } catch (error) {
    console.error('[ERROR] Error parsing statement content:', error);
    throw error; // Re-throw to mark statement as error
  }
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
        console.log(`\n--- Processing statement ${statement.id} (${statement.filename}) ---`);

        // Parse the actual PDF content using text extraction
        console.log(`[PROCESSING] Starting extraction for ${statement.id}`);
        const extractedTransactions = await parseStatementContent(statement.file_url, supabase);
        
        console.log(`[PROCESSING] Extracted ${extractedTransactions.length} transactions from PDF`);

        if (extractedTransactions.length === 0) {
          console.log(`[PROCESSING] No transactions found, marking as error`);
          await supabase
            .from('statements')
            .update({ status: 'error' })
            .eq('id', statement.id);
          continue;
        }

        // Insert transactions into database using upsert to handle duplicates
        const transactionInserts = extractedTransactions.map(transaction => ({
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

        console.log(`[DB] Inserting ${transactionInserts.length} transactions...`);
        
        // Use upsert with ignoreDuplicates to handle the unique constraint
        const { error: insertError, data: insertedData } = await supabase
          .from('transactions')
          .upsert(transactionInserts, { 
            onConflict: 'user_id,transaction_date,description,amount,category',
            ignoreDuplicates: true 
          })
          .select();

        if (insertError) {
          console.error(`[DB] Error inserting transactions for ${statement.id}:`, insertError);
          await supabase
            .from('statements')
            .update({ status: 'error' })
            .eq('id', statement.id);
          continue;
        }

        console.log(`[DB] Successfully inserted/updated ${insertedData?.length || 0} transactions`);

        // Update statement status to 'ready'
        const totalCredit = extractedTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const totalDebit = Math.abs(extractedTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));

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
          console.error(`[DB] Error updating statement ${statement.id}:`, updateError);
          continue;
        }

        processedCount++;
        console.log(`✅ Successfully processed statement ${statement.id}`);

      } catch (error) {
        console.error(`❌ Error processing statement ${statement.id}:`, error);
        
        // Mark statement as error
        await supabase
          .from('statements')
          .update({ status: 'error' })
          .eq('id', statement.id);
          
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
