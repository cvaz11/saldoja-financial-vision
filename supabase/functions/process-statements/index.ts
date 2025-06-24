
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
    console.log('Starting statement processing...');
    
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    
    console.log('Environment variables check:');
    console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('SERVICE_ROLE_KEY:', serviceRoleKey ? 'SET (length: ' + serviceRoleKey.length + ')' : 'NOT SET');
    
    if (!supabaseUrl || !serviceRoleKey) {
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

    // Get AWS credentials
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const awsRegion = Deno.env.get('AWS_REGION');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    console.log('AWS and OpenAI credentials check:');
    console.log('AWS_ACCESS_KEY_ID:', awsAccessKeyId ? 'SET' : 'NOT SET');
    console.log('AWS_SECRET_ACCESS_KEY:', awsSecretAccessKey ? 'SET' : 'NOT SET');
    console.log('AWS_REGION:', awsRegion ? 'SET' : 'NOT SET');
    console.log('OPENAI_API_KEY:', openaiApiKey ? 'SET' : 'NOT SET');

    if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion || !openaiApiKey) {
      console.error('Missing AWS or OpenAI credentials');
      return new Response(
        JSON.stringify({ error: 'Missing AWS or OpenAI credentials' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Environment variables loaded successfully');

    // 1. Select statements with status 'processing' (max 5)
    console.log('Executing query: SELECT * FROM statements WHERE status = processing LIMIT 5');
    
    const { data: statements, error: selectError } = await supabase
      .from('statements')
      .select('*')
      .eq('status', 'processing')
      .limit(5);

    console.log('Query executed. Results:');
    console.log('selectError:', selectError);
    console.log('statements:', statements);
    console.log('statements length:', statements ? statements.length : 'null/undefined');

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
      console.log('No statements found with status = processing');
      
      // Let's also check what statements exist in total
      const { data: allStatements, error: allError } = await supabase
        .from('statements')
        .select('id, status, filename')
        .limit(10);
      
      console.log('All statements check:');
      console.log('allError:', allError);
      console.log('allStatements:', allStatements);
      
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

    console.log(`Found ${statements.length} statements to process`);
    let processedCount = 0;

    for (const statement of statements) {
      try {
        console.log(`Processing statement ${statement.id} (${statement.filename})`);

        // 2a. Download PDF from storage bucket using signed URL
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('statements')
          .createSignedUrl(statement.file_url, 300); // 5 minutes

        if (urlError || !signedUrlData?.signedUrl) {
          console.error(`Error creating signed URL for ${statement.id}:`, urlError);
          continue;
        }

        console.log(`Generated signed URL for ${statement.id}`);

        // Download the PDF file
        const pdfResponse = await fetch(signedUrlData.signedUrl);
        if (!pdfResponse.ok) {
          console.error(`Error downloading PDF for ${statement.id}: ${pdfResponse.status} ${pdfResponse.statusText}`);
          continue;
        }

        const pdfBuffer = await pdfResponse.arrayBuffer();
        console.log(`Downloaded PDF for ${statement.id}, size: ${pdfBuffer.byteLength} bytes`);

        // 2b. Send PDF to AWS Textract
        const textractText = await extractTextFromPDF(pdfBuffer, awsAccessKeyId, awsSecretAccessKey, awsRegion);
        
        if (!textractText) {
          console.error(`Failed to extract text from PDF for ${statement.id}`);
          continue;
        }

        console.log(`Extracted text from ${statement.id}, length: ${textractText.length}`);

        // 2c. Send text to GPT-4o-mini
        const transactions = await extractTransactionsWithGPT(textractText, openaiApiKey);
        
        if (!transactions || transactions.length === 0) {
          console.error(`No transactions extracted for ${statement.id}`);
          continue;
        }

        console.log(`Extracted ${transactions.length} transactions for ${statement.id}`);

        // 2d. Insert transactions into database
        const transactionInserts = transactions.map(transaction => ({
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

        const { error: insertError } = await supabase
          .from('transactions')
          .insert(transactionInserts);

        if (insertError) {
          console.error(`Error inserting transactions for ${statement.id}:`, insertError);
          continue;
        }

        // 2e. Update statement status to 'ready'
        const { error: updateError } = await supabase
          .from('statements')
          .update({ 
            status: 'ready', 
            parsed_at: new Date().toISOString(),
            total_credit: transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
            total_debit: Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))
          })
          .eq('id', statement.id);

        if (updateError) {
          console.error(`Error updating statement ${statement.id}:`, updateError);
          continue;
        }

        processedCount++;
        console.log(`Successfully processed statement ${statement.id}`);

      } catch (error) {
        console.error(`Error processing statement ${statement.id}:`, error);
        continue;
      }
    }

    console.log(`Processing complete. Processed ${processedCount} statements`);

    return new Response(
      JSON.stringify({ processed: processedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-statements function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function extractTextFromPDF(pdfBuffer: ArrayBuffer, accessKeyId: string, secretAccessKey: string, region: string): Promise<string | null> {
  try {
    // Convert ArrayBuffer to Uint8Array for AWS SDK
    const pdfBytes = new Uint8Array(pdfBuffer);
    
    // Start document text detection
    const startParams = {
      DocumentLocation: {
        S3Object: {
          Bucket: 'temp-textract-bucket', // You might need to create this or use direct document bytes
          Name: `temp-${Date.now()}.pdf`
        }
      }
    };

    // For simplicity, we'll use synchronous text detection for smaller documents
    const detectParams = {
      Document: {
        Bytes: Array.from(pdfBytes)
      }
    };

    const textractEndpoint = `https://textract.${region}.amazonaws.com/`;
    
    // Create AWS signature and headers
    const awsHeaders = await createAWSHeaders('DetectDocumentText', detectParams, accessKeyId, secretAccessKey, region);
    
    const response = await fetch(textractEndpoint, {
      method: 'POST',
      headers: awsHeaders,
      body: JSON.stringify(detectParams)
    });

    if (!response.ok) {
      console.error('Textract API error:', await response.text());
      return null;
    }

    const result = await response.json();
    
    // Extract text from Textract response
    let extractedText = '';
    if (result.Blocks) {
      for (const block of result.Blocks) {
        if (block.BlockType === 'LINE' && block.Text) {
          extractedText += block.Text + '\n';
        }
      }
    }

    return extractedText.trim();
  } catch (error) {
    console.error('Error in Textract extraction:', error);
    return null;
  }
}

async function createAWSHeaders(action: string, body: any, accessKeyId: string, secretAccessKey: string, region: string) {
  const service = 'textract';
  const host = `textract.${region}.amazonaws.com`;
  const amzTarget = `Textract.${action}`;
  
  return {
    'Content-Type': 'application/x-amz-json-1.1',
    'X-Amz-Target': amzTarget,
    'Authorization': `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${getDateStamp()}/${region}/${service}/aws4_request, SignedHeaders=host;x-amz-date;x-amz-target, Signature=dummy`,
    'X-Amz-Date': getAmzDate(),
    'Host': host
  };
}

function getAmzDate(): string {
  return new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
}

function getDateStamp(): string {
  return new Date().toISOString().split('T')[0].replace(/-/g, '');
}

async function extractTransactionsWithGPT(text: string, apiKey: string): Promise<Transaction[]> {
  try {
    const prompt = `Analise o texto do extrato bancário abaixo e converta em um array JSON com as transações encontradas. Cada transação deve ter o formato:
{
  "date": "YYYY-MM-DD",
  "description": "descrição da transação",
  "amount": valor_numérico (positivo para crédito, negativo para débito),
  "category": "categoria estimada",
  "installment_number": número_da_parcela (se aplicável),
  "installment_total": total_de_parcelas (se aplicável)
}

Texto do extrato:
${text}

Retorne apenas o array JSON, sem texto adicional:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em análise de extratos bancários. Retorne apenas arrays JSON válidos com as transações encontradas.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      return [];
    }

    const data = await response.json();
    const gptResponse = data.choices[0].message.content.trim();
    
    // Try to parse the JSON response
    try {
      // Remove any markdown code blocks if present
      const cleanJson = gptResponse.replace(/```json\n?|\n?```/g, '').trim();
      const transactions = JSON.parse(cleanJson);
      
      // Validate that it's an array
      if (!Array.isArray(transactions)) {
        console.error('GPT response is not an array:', transactions);
        return [];
      }
      
      return transactions;
    } catch (parseError) {
      console.error('Error parsing GPT JSON response:', parseError);
      console.error('GPT response was:', gptResponse);
      return [];
    }

  } catch (error) {
    console.error('Error in GPT extraction:', error);
    return [];
  }
}
