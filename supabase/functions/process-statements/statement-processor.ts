
import { NubankPDFParser } from './libs/pdf-parser.ts';
import { NubankTransactionParser, NubankTransaction } from './libs/nubank-transaction-parser.ts';
import { insertTransactions, updateStatementStatus } from './database-operations.ts';
import { extractTextFromPDF } from './pdf-processor.ts';

// Converter NubankTransaction para Transaction do sistema
interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

export const parseStatementContent = async (fileUrl: string, supabase: any): Promise<Transaction[]> => {
  try {
    console.log(`[PARSE] ===== INICIANDO PARSE NUBANK OTIMIZADO =====`);
    console.log(`[PARSE] File URL: ${fileUrl}`);
    
    // Download do PDF
    console.log(`[PARSE] Fazendo download do arquivo...`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('statements')
      .download(fileUrl);
    
    if (downloadError) {
      console.error('[PARSE] Erro no download:', downloadError);
      throw new Error(`Falha no download do PDF: ${downloadError.message}`);
    }
    
    if (!fileData) {
      throw new Error('Arquivo baixado está vazio');
    }
    
    console.log('[PARSE] Download concluído:', fileData.size, 'bytes');
    
    // Extração de texto usando novo parser Deno nativo
    console.log(`[PARSE] ===== INICIANDO EXTRAÇÃO DE TEXTO =====`);
    const extractedText = await extractTextFromPDF(fileData);
    
    console.log(`[PARSE] Extração concluída: ${extractedText.length} caracteres`);
    
    if (extractedText.length < 50) {
      throw new Error('Texto extraído muito curto - PDF pode estar corrompido ou ser baseado em imagem');
    }
    
    // Parsing de transações Nubank
    console.log(`[PARSE] ===== INICIANDO PARSE DE TRANSAÇÕES =====`);
    const transactionParser = new NubankTransactionParser();
    const nubankTransactions = transactionParser.parseTransactions(extractedText);
    
    console.log(`[PARSE] Parse concluído: ${nubankTransactions.length} transações encontradas`);
    
    // Converter para formato do sistema
    const allTransactions: Transaction[] = nubankTransactions.map(nt => ({
      date: nt.date,
      description: nt.description,
      amount: nt.amount,
      category: nt.category
    }));
    
    // FILTRAR APENAS DÉBITOS (valores negativos)
    const debitTransactions = allTransactions.filter(t => t.amount < 0);
    console.log(`[PARSE] Transações de débito filtradas: ${debitTransactions.length} de ${allTransactions.length} total`);
    
    // Log das transações de débito encontradas
    if (debitTransactions.length > 0) {
      console.log(`[PARSE] Amostra de transações de débito encontradas:`);
      debitTransactions.slice(0, 5).forEach((tx, i) => {
        console.log(`[PARSE]   ${i + 1}. ${tx.date} - ${tx.description} - R$ ${Math.abs(tx.amount).toFixed(2)}`);
      });
      
      const totalDebito = debitTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      console.log(`[PARSE] Total em débitos: R$ ${totalDebito.toFixed(2)}`);
    }
    
    console.log(`[PARSE] ===== PARSE CONCLUÍDO COM SUCESSO =====`);
    return debitTransactions;
    
  } catch (error) {
    console.error('[PARSE] ===== ERRO NO PARSE =====');
    console.error('[PARSE] Erro:', error.message);
    console.error('[PARSE] Stack:', error.stack);
    throw error;
  }
};

export const processStatement = async (statement: any, supabase: any): Promise<void> => {
  const startTime = Date.now();
  
  try {
    console.log(`\n🚀 ===== PROCESSANDO EXTRATO NUBANK ${statement.id} =====`);
    console.log(`📄 Arquivo: ${statement.filename}`);
    console.log(`👤 Usuário: ${statement.user_id}`);
    console.log(`🔗 URL: ${statement.file_url}`);
    console.log(`🏦 Banco: ${statement.bank}`);

    // Parse do extrato com nova implementação
    console.log(`🔍 Iniciando extração Nubank otimizada...`);
    const debitTransactions = await parseStatementContent(statement.file_url, supabase);
    
    console.log(`✅ Extração concluída: ${debitTransactions.length} transações de débito`);

    // Verificar se há transações de débito
    if (debitTransactions.length === 0) {
      console.log(`⚠️  Nenhuma transação de débito encontrada`);
      console.log(`   Possíveis causas:`);
      console.log(`   - PDF contém apenas créditos/receitas`);
      console.log(`   - Período sem movimentações de débito`);
      console.log(`   - Formato do extrato Nubank mudou`);
      
      // Atualizar status para 'no_data'
      await updateStatementStatus(supabase, statement.id, 'no_data');
      console.log(`✅ Status atualizado para 'no_data'`);
      
      const processingTime = Date.now() - startTime;
      console.log(`🎉 EXTRATO ${statement.id} PROCESSADO em ${processingTime}ms`);
      console.log(`📊 Resultado final: 0 débitos processados\n`);
      return;
    }

    // Log detalhado das transações de débito
    console.log(`💰 Transações de débito encontradas:`);
    debitTransactions.forEach((tx, i) => {
      console.log(`   ${i + 1}. ${tx.date} - ${tx.description} - R$ ${Math.abs(tx.amount).toFixed(2)} (${tx.category})`);
    });
    
    const totalAmount = debitTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    console.log(`💸 Total de débitos: R$ ${totalAmount.toFixed(2)}`);

    // Inserir transações de débito
    console.log(`💾 Inserindo ${debitTransactions.length} transações de débito...`);
    await insertTransactions(supabase, debitTransactions, statement.id, statement.user_id);
    console.log(`✅ ${debitTransactions.length} transações de débito inseridas com sucesso`);
    
    // Atualizar status para 'ready'
    await updateStatementStatus(supabase, statement.id, 'ready', debitTransactions);
    console.log(`✅ Status do extrato atualizado para 'ready'`);
    
    // Emitir evento realtime para o frontend
    try {
      await supabase.realtime
        .channel('statement_processed')
        .send({
          type: 'broadcast',
          event: 'statement_ready',
          payload: {
            statement_id: statement.id,
            user_id: statement.user_id,
            transaction_count: debitTransactions.length,
            total_debit: totalAmount
          }
        });
      console.log(`✅ Evento realtime enviado`);
    } catch (realtimeError) {
      console.log(`⚠️  Aviso: Falha ao enviar evento realtime:`, realtimeError.message);
    }

    const processingTime = Date.now() - startTime;
    console.log(`🎉 EXTRATO ${statement.id} PROCESSADO em ${processingTime}ms`);
    console.log(`📊 Resultado final: ${debitTransactions.length} débitos processados\n`);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`💥 FALHA NO PROCESSAMENTO DO EXTRATO ${statement.id} após ${processingTime}ms`);
    console.error(`❌ Tipo do erro: ${error.name}`);
    console.error(`❌ Mensagem: ${error.message}`);
    console.error(`❌ Stack: ${error.stack}`);
    
    // Marcar como erro
    try {
      await updateStatementStatus(supabase, statement.id, 'error');
      console.log(`✅ Status atualizado para 'error'`);
    } catch (updateError) {
      console.error(`💥 Falha ao atualizar status de erro: ${updateError.message}`);
    }
    
    throw error;
  }
};
