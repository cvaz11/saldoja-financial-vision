
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { processStructuredFile } from './structured-processor.ts';
import { processWithSmartAI } from './smart-ai-processor.ts';
import { extractTextFromPDFBytes } from './advanced-pdf-parser.ts';
import { insertTransactions, updateStatementStatus } from './database-operations.ts';

export const processStatement = async (statement: any, supabase: any) => {
  console.log(`\n🔄 Processing statement: ${statement.filename}`);
  
  try {
    // Update status to processing
    await supabase
      .from('statements')
      .update({ status: 'processing' })
      .eq('id', statement.id);

    // Download file from storage
    console.log(`📁 Downloading file: ${statement.file_url}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('statements')
      .download(statement.file_url);

    if (downloadError) {
      throw new Error(`Download failed: ${downloadError.message}`);
    }

    console.log(`📊 File downloaded: ${fileData.size} bytes`);

    let transactions = [];
    const fileExtension = statement.filename.toLowerCase().split('.').pop();

    // Estratégia de processamento baseada no tipo de arquivo
    if (['csv', 'ofx', 'xls', 'xlsx'].includes(fileExtension)) {
      console.log(`📋 Processando arquivo estruturado: ${fileExtension}`);
      transactions = await processStructuredFile(fileData, statement.filename);
    } else if (fileExtension === 'pdf') {
      console.log(`📄 Processando PDF com IA inteligente...`);
      
      // Extrair texto do PDF
      const extractedText = await extractTextFromPDFBytes(fileData);
      
      if (extractedText && extractedText.length > 100) {
        console.log(`📝 Texto extraído: ${extractedText.length} caracteres`);
        
        // Usar IA inteligente para identificar TODOS os gastos
        transactions = await processWithSmartAI(extractedText);
        
        if (transactions.length > 0) {
          console.log(`🎯 IA identificou ${transactions.length} gastos automaticamente`);
        } else {
          console.log(`⚠️ IA não encontrou gastos no texto extraído`);
        }
      } else {
        console.log(`❌ Falha na extração de texto do PDF`);
      }
    }
    
    console.log(`💫 Total de transações processadas: ${transactions.length}`);

    if (transactions.length === 0) {
      // No transactions found
      await updateStatementStatus(supabase, statement.id, 'no_data');
      console.log('⚠️ Nenhuma transação encontrada - marcado como no_data');
      return;
    }

    // Insert transactions using the database operations module
    await insertTransactions(supabase, transactions, statement.id, statement.user_id);

    // Update statement with success status
    await updateStatementStatus(supabase, statement.id, 'ready', transactions);

    console.log(`✅ Extrato processado com sucesso:`);
    console.log(`   - ${transactions.length} transações identificadas automaticamente`);
    console.log(`   - Categorização inteligente aplicada`);
    console.log(`   - Todos os gastos foram capturados`);

  } catch (error) {
    console.error(`❌ Erro ao processar extrato ${statement.id}:`, error.message);
    
    // Update statement with error status
    await updateStatementStatus(supabase, statement.id, 'error');
    
    throw error;
  }
};
