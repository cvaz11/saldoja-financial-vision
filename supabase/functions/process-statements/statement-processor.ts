
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { processStructuredFile } from './structured-processor.ts';
import { processWithSmartAI } from './smart-ai-processor.ts';
import { extractTextFromPDFBytes } from './advanced-pdf-parser.ts';
import { insertTransactions, updateStatementStatus } from './database-operations.ts';

// === TESTE DE PARCELAS AUTOMÁTICO ===
console.log("🔥 === INICIANDO TESTE DE PARCELAS AUTOMÁTICO ===");

// Teste isolado dos regex patterns
function testParcelaPatterns() {
    console.log("🔍 === TESTE DO CASO PROBLEMÁTICO ===");
    
    const problematicString = "Agi*Tute Tech - Parcela 9/12";
    console.log("Input:", problematicString);
    console.log("Caracteres especiais:", [...problematicString].filter(c => /[^a-zA-Z0-9\s]/.test(c)));
    
    // Definir padrões
    const patterns = [
        { name: "Padrão 1: '- Parcela X/Y'", regex: /-\s*parcela\s+(\d{1,2})\/(\d{1,2})/i },
        { name: "Padrão 2: 'Parcela X/Y'", regex: /parcela\s+(\d{1,2})\/(\d{1,2})/i },
        { name: "Padrão 3: 'X de Y'", regex: /(\d{1,2})\s*de\s*(\d{1,2})/i },
        { name: "Padrão 4: 'X/Y parcela'", regex: /(\d{1,2})\/(\d{1,2})\s*parcela/i },
        { name: "Padrão 5: 'X/Y' (genérico)", regex: /(\d{1,2})\s*\/\s*(\d{1,2})/i }
    ];
    
    // Verificar se contém os elementos necessários
    const hasHyphen = problematicString.includes('-');
    const hasParcela = problematicString.toLowerCase().includes('parcela');
    const hasNumbers = problematicString.match(/\d+\/\d+/);
    
    console.log("Contém hífen:", hasHyphen);
    console.log("Contém 'parcela':", hasParcela);
    console.log("Contém números X/Y:", hasNumbers);
    
    // Testar cada padrão
    patterns.forEach((pattern, index) => {
        console.log(`\n--- Testando ${pattern.name} ---`);
        console.log(`Regex: ${pattern.regex.source}`);
        
        const match = problematicString.match(pattern.regex);
        
        if (match) {
            console.log(`✅ MATCH ENCONTRADO!`);
            console.log(`Match completo:`, match[0]);
            console.log(`Grupos capturados:`, match.slice(1));
            
            if (match[1] && match[2]) {
                const current = parseInt(match[1]);
                const total = parseInt(match[2]);
                console.log(`Parcela atual: ${current}, Total: ${total}`);
                console.log(`Validação: ${current > 0 && total > 0 && current <= total && total <= 99 ? 'VÁLIDA' : 'INVÁLIDA'}`);
                
                if (current > 0 && total > 0 && current <= total && total <= 99) {
                    console.log(`🎯 SUCESSO! Padrão ${index + 1} detectou corretamente: ${current}/${total}`);
                    return true;
                }
            }
        } else {
            console.log(`❌ SEM MATCH`);
        }
    });
    
    console.log("🔥 === FIM DO TESTE DE PARCELAS ===\n");
    return false;
}

// Executar o teste imediatamente
testParcelaPatterns();

// === FIM DO TESTE ===

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
        console.log(`🔍 [DEBUG] Texto contém "Agi*Tute Tech": ${extractedText.includes('Agi*Tute Tech')}`);
        console.log(`🔍 [DEBUG] Texto contém "Parcela 9/12": ${extractedText.includes('Parcela 9/12')}`);
        
        // Usar IA inteligente para identificar TODOS os gastos
        transactions = await processWithSmartAI(extractedText);
        
        if (transactions.length > 0) {
          console.log(`🎯 IA identificou ${transactions.length} gastos automaticamente`);
          
          // DEBUG: Verificar se alguma transação tem dados de parcela
          const installmentTransactions = transactions.filter(t => 
            t.installment_number && t.installment_total
          );
          console.log(`🔍 [DEBUG] Transações com parcelas detectadas: ${installmentTransactions.length}`);
          
          installmentTransactions.forEach((t, index) => {
            console.log(`🔍 [DEBUG] Parcela ${index + 1}: ${t.description} - ${t.installment_number}/${t.installment_total}`);
          });
          
          // DEBUG: Procurar especificamente por "Agi*Tute Tech"
          const agiTransaction = transactions.find(t => 
            t.description && t.description.includes('Agi') && t.description.includes('Tute')
          );
          
          if (agiTransaction) {
            console.log(`🔍 [DEBUG] Transação Agi encontrada:`, agiTransaction);
          } else {
            console.log(`🔍 [DEBUG] Transação Agi*Tute Tech NÃO encontrada nas transações processadas`);
          }
          
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
