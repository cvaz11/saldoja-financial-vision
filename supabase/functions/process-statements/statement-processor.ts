
import { insertTransactions, updateStatementStatus } from './database-operations.ts';
import { processWithSmartText } from './smart-text-processor.ts';

// Convert to system Transaction format
interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

export const parseStatementContent = async (fileUrl: string, supabase: any): Promise<Transaction[]> => {
  try {
    console.log(`[PARSE] ===== ANÁLISE INTELIGENTE INICIADA =====`);
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
    
    // Converter para ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Usar processamento inteligente de texto
    console.log(`[PARSE] ===== INICIANDO PROCESSAMENTO INTELIGENTE =====`);
    const debitTransactions = await processWithSmartText(arrayBuffer);
    
    console.log(`[PARSE] Processamento inteligente concluído: ${debitTransactions.length} transações encontradas`);
    
    if (debitTransactions.length > 0) {
      console.log(`[PARSE] ✅ SUCESSO! Transações extraídas:`);
      debitTransactions.slice(0, 5).forEach((tx, i) => {
        console.log(`[PARSE]   ${i + 1}. ${tx.date} - ${tx.description} - R$ ${Math.abs(tx.amount).toFixed(2)} (${tx.category})`);
      });
      
      const totalDebit = debitTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      console.log(`[PARSE] 💰 Total de débitos: R$ ${totalDebit.toFixed(2)}`);
    } else {
      console.log(`[PARSE] ⚠️  Nenhuma transação encontrada`);
      console.log(`[PARSE]     - Verifique se o PDF é um extrato Nubank válido`);
      console.log(`[PARSE]     - Confirme se há transações no período`);
    }
    
    console.log(`[PARSE] ===== ANÁLISE INTELIGENTE CONCLUÍDA =====`);
    return debitTransactions;
    
  } catch (error) {
    console.error('[PARSE] ===== ERRO NA ANÁLISE INTELIGENTE =====');
    console.error('[PARSE] Erro:', error.message);
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

    // Parse com Vision GPT-4o
    console.log(`🔍 Iniciando análise Vision GPT-4o Nubank...`);
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
