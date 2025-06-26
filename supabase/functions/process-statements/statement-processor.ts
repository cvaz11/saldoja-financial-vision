
import { insertTransactions, updateStatementStatus } from './database-operations.ts';
import { processWithEnhancedStrategy } from './enhanced-processor.ts';

// Convert to system Transaction format
interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

export const parseStatementContent = async (fileUrl: string, supabase: any): Promise<Transaction[]> => {
  try {
    console.log(`[PARSE] ===== INICIANDO ANÁLISE ENHANCED ROBUSTA =====`);
    console.log(`[PARSE] File URL: ${fileUrl}`);
    
    // Download PDF
    console.log(`[PARSE] Baixando arquivo...`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('statements')
      .download(fileUrl);
    
    if (downloadError) {
      console.error('[PARSE] Erro no download:', downloadError);
      throw new Error(`Download do PDF falhou: ${downloadError.message}`);
    }
    
    if (!fileData) {
      throw new Error('Arquivo baixado está vazio');
    }
    
    console.log('[PARSE] Download concluído:', fileData.size, 'bytes');
    
    // Usar processamento enhanced com múltiplas estratégias robustas
    console.log(`[PARSE] ===== INICIANDO PROCESSAMENTO ENHANCED =====`);
    const debitTransactions = await processWithEnhancedStrategy(fileData);
    
    console.log(`[PARSE] Processamento concluído: ${debitTransactions.length} transações de débito encontradas`);
    
    if (debitTransactions.length > 0) {
      console.log(`[PARSE] ✅ SUCESSO! Transações extraídas:`);
      debitTransactions.slice(0, 5).forEach((tx, i) => {
        console.log(`[PARSE]   ${i + 1}. ${tx.date} - ${tx.description} - R$ ${Math.abs(tx.amount).toFixed(2)} (${tx.category})`);
      });
      
      const totalDebit = debitTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      console.log(`[PARSE] 💰 Total de débitos: R$ ${totalDebit.toFixed(2)}`);
    } else {
      console.log(`[PARSE] ⚠️  Nenhuma transação de débito foi encontrada`);
      console.log(`[PARSE]     - Verifique se o PDF contém transações de débito`);
      console.log(`[PARSE]     - PDF pode estar corrompido ou em formato não suportado`);
    }
    
    console.log(`[PARSE] ===== ANÁLISE ENHANCED CONCLUÍDA =====`);
    return debitTransactions;
    
  } catch (error) {
    console.error('[PARSE] ===== ERRO CRÍTICO NA ANÁLISE =====');
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

    // Parse com abordagem multi-LLM
    console.log(`🔍 Iniciando análise multi-LLM Nubank...`);
    const debitTransactions = await parseStatementContent(statement.file_url, supabase);
    
    console.log(`✅ Análise concluída: ${debitTransactions.length} transações de débito`);

    // Verificar se há transações de débito
    if (debitTransactions.length === 0) {
      console.log(`⚠️  Nenhuma transação de débito encontrada`);
      console.log(`   Possíveis causas:`);
      console.log(`   - PDF contém apenas créditos/receitas`);
      console.log(`   - Período sem movimentações de débito`);
      console.log(`   - PDF corrompido ou ilegível`);
      
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
