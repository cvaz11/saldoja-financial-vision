
export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  installment_number?: number;
  installment_total?: number;
}

const validateTransaction = (transaction: any): transaction is Transaction => {
  return (
    transaction &&
    typeof transaction.date === 'string' &&
    typeof transaction.description === 'string' &&
    transaction.description.trim().length > 0 &&
    typeof transaction.amount === 'number' &&
    !isNaN(transaction.amount) &&
    transaction.amount < 0 && // Only negative amounts (debits)
    typeof transaction.category === 'string' &&
    transaction.category.trim().length > 0
  );
};

export const processTextWithClaude = async (extractedText: string): Promise<Transaction[]> => {
  try {
    console.log('[CLAUDE] ===== INICIANDO ANÁLISE COM CLAUDE AVANÇADO =====');
    console.log(`[CLAUDE] Processando ${extractedText.length} caracteres de texto`);
    
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!claudeApiKey) {
      console.log('[CLAUDE] ❌ Chave da API do Claude não encontrada');
      return [];
    }
    
    console.log('[CLAUDE] 🎯 Usando prompt especializado para análise Nubank...');
    
    const prompt = `Você é um especialista em análise de extratos bancários Nubank. Analise este texto extraído de um PDF de fatura de cartão de crédito e extraia APENAS as transações de DÉBITO (gastos).

TEXTO DO EXTRATO:
${extractedText.slice(0, 20000)}

INSTRUÇÕES ESPECÍFICAS:
1. Extraia APENAS transações de DÉBITO (gastos, compras, IOF)
2. IGNORE completamente: pagamentos, créditos, cashback, transferências recebidas
3. Para cada transação encontrada, formate como JSON com:
   - date: formato YYYY-MM-DD (converta datas como "12 JUN" para "2025-06-12")
   - description: nome do estabelecimento/serviço
   - amount: valor sempre NEGATIVO (ex: -150.00)
   - category: uma das opções: "Alimentação", "Transporte", "Tecnologia", "Saúde", "Compras", "Lazer", "Financeiro", "Serviços", "Outros"

4. Para parcelamentos, se encontrar "Parcela X/Y", adicione:
   - installment_number: número da parcela atual
   - installment_total: total de parcelas

RETORNE APENAS um array JSON válido no formato:
[
  {
    "date": "2025-06-12",
    "description": "UBER EATS",
    "amount": -45.50,
    "category": "Alimentação"
  }
]

Se não encontrar transações de débito, retorne: []`;

    console.log('[CLAUDE] 📡 Enviando requisição para Claude...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${claudeApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CLAUDE] ❌ Erro na API do Claude:', response.status, errorText);
      return [];
    }
    
    const result = await response.json();
    let responseText = result.content[0].text.trim();
    
    console.log('[CLAUDE] 📄 Resposta recebida:', responseText.length, 'caracteres');
    console.log('[CLAUDE] 🔍 Resposta (primeiros 500 chars):', responseText.slice(0, 500));
    
    // Limpar resposta
    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[^[{]*/, '')
      .replace(/[^}\]]*$/, '')
      .trim();
    
    if (!responseText || responseText === '[]') {
      console.log('[CLAUDE] ⚠️  Claude retornou resultado vazio');
      return [];
    }
    
    let claudeTransactions: any[];
    try {
      claudeTransactions = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[CLAUDE] ❌ Erro ao fazer parse do JSON:', parseError);
      console.error('[CLAUDE] Resposta que falhou:', responseText);
      return [];
    }
    
    if (!Array.isArray(claudeTransactions)) {
      console.error('[CLAUDE] ❌ Resposta não é um array');
      return [];
    }
    
    const validTransactions = claudeTransactions.filter(validateTransaction);
    console.log(`[CLAUDE] ✅ Claude extraiu ${validTransactions.length} transações de débito válidas`);
    
    // Log das transações encontradas
    if (validTransactions.length > 0) {
      console.log('[CLAUDE] 🎉 Transações encontradas pelo Claude:');
      validTransactions.slice(0, 5).forEach((tx, i) => {
        console.log(`[CLAUDE]   ${i + 1}. ${tx.date} - ${tx.description} - R$ ${Math.abs(tx.amount).toFixed(2)} (${tx.category})`);
      });
    }
    
    return validTransactions;
    
  } catch (error) {
    console.error('[CLAUDE] ❌ Erro no processamento com Claude:', error);
    return [];
  }
};
