
export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  installment_number?: number;
  installment_total?: number;
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

export const processWithSmartAI = async (extractedText: string): Promise<Transaction[]> => {
  try {
    console.log('[SMART-AI] ===== INICIANDO ANÁLISE INTELIGENTE COM IA =====');
    console.log(`[SMART-AI] Processando ${extractedText.length} caracteres de texto`);
    
    if (!OPENAI_API_KEY) {
      console.log('[SMART-AI] ❌ Chave da API do OpenAI não encontrada');
      return [];
    }
    
    console.log('[SMART-AI] 🧠 Usando IA avançada para identificação completa de gastos...');
    
    const prompt = `Você é um especialista em análise financeira de extratos bancários brasileiros. Sua missão é identificar TODOS os gastos/débitos de forma completa e precisa, sem deixar nenhuma transação passar despercebida.

TEXTO DO EXTRATO:
${extractedText.slice(0, 25000)}

INSTRUÇÕES CRÍTICAS:
1. 🔍 IDENTIFIQUE TODOS OS GASTOS/DÉBITOS sem exceção:
   - Compras nacionais e internacionais
   - Parcelamentos (identifique parcela atual/total se mencionado)
   - IOF de transações internacionais
   - Taxas e tarifas bancárias
   - Anuidades de cartão
   - Juros e encargos
   - Saques
   - Transferências enviadas
   - Pagamentos de contas
   - Assinaturas e mensalidades

2. 🚫 IGNORE COMPLETAMENTE:
   - Pagamentos da fatura
   - Transferências recebidas
   - Depósitos
   - Cashback
   - Estornos de crédito
   - Saldo anterior/atual
   - Limite disponível

3. 📊 CATEGORIZAÇÃO INTELIGENTE E ESPECÍFICA:
   Analise o contexto e histórico da transação para categorizar precisamente:
   
   🍽️ **Alimentação**: Restaurantes, delivery, supermercados, padarias, bares, cafés
   🚗 **Transporte**: Uber, 99, taxi, combustível, estacionamento, pedágio, manutenção veicular
   💻 **Tecnologia**: Netflix, Spotify, Amazon Prime, Google, Apple, softwares, hardware
   🏥 **Saúde**: Farmácias, consultas médicas, planos de saúde, exames, tratamentos
   🛒 **Compras**: Lojas físicas/online, roupas, eletrônicos, casa e decoração
   🎯 **Lazer**: Cinemas, shows, viagens, hotéis, parques, entretenimento
   🏠 **Casa**: Aluguel, condomínio, energia, água, internet, gás, telefone
   📚 **Educação**: Cursos, livros, materiais educativos, mensalidades
   💰 **Financeiro**: IOF, taxas bancárias, juros, anuidades, seguros
   🔧 **Serviços**: Salão, barbeiro, manutenção, profissionais liberais, consultorias
   🚀 **Negócios**: Ferramentas de trabalho, marketing, vendas online
   ❓ **Outros**: Apenas quando não se encaixar em nenhuma categoria acima

4. 📝 FORMATO DE RESPOSTA:
   Para cada gasto encontrado, retorne exatamente neste formato JSON:
   [
     {
       "date": "2024-06-15",
       "description": "Uber Viagem",
        "amount": -25.50,
        "category": "Transporte",
        "installment_number": 1,
        "installment_total": 1
      }
    ]

5. ⚠️ REGRAS IMPORTANTES:
   - Valores sempre NEGATIVOS para gastos (ex: -150.00)
   - Datas no formato YYYY-MM-DD
   - Descrições claras e informativas
     - Se encontrar "Parcela X/Y" ou "X/Y" ou "X de Y", extraia X para installment_number e Y para installment_total
      - Procure especialmente por: "- Parcela 9/12", "Parcela 9/12", "9/12", "9 de 12", "9ª parcela de 12"
      - IMPORTANTE: Para "Agi*Tute Tech - Parcela 9/12" detecte installment_number: 9, installment_total: 12
      - Para parcelamentos detectados, installment_total DEVE ser maior que 1
      - SEMPRE inclua installment_number e installment_total no JSON para TODAS as transações

🎯 OBJETIVO: Garantir que NENHUM gasto seja perdido na análise. Seja meticuloso e detalhado.

Analise o extrato e retorne APENAS o array JSON com TODOS os gastos encontrados:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise financeira com foco em identificação completa de gastos e categorização inteligente. Seja preciso e não deixe nenhuma transação passar despercebida.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SMART-AI] Erro da API OpenAI:', response.status, errorText);
      return [];
    }
    
    const result = await response.json();
    let responseText = result.choices[0].message.content.trim();
    
    console.log('[SMART-AI] Resposta da IA recebida:', responseText.length, 'caracteres');
    console.log('[SMART-AI] Preview da resposta:', responseText.slice(0, 500));
    
    // Limpar resposta
    responseText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^[^[{]*/, '')
      .replace(/[^}\]]*$/, '')
      .trim();
    
    if (!responseText || responseText === '[]') {
      console.log('[SMART-AI] ⚠️ IA retornou resultado vazio');
      return [];
    }
    
    let smartTransactions: any[];
    try {
      smartTransactions = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[SMART-AI] ❌ Erro ao fazer parse do JSON:', parseError);
      console.error('[SMART-AI] Resposta que falhou:', responseText);
      return [];
    }
    
    if (!Array.isArray(smartTransactions)) {
      console.error('[SMART-AI] ❌ Resposta não é um array');
      return [];
    }
    
    // Validar e normalizar transações
    const validTransactions: Transaction[] = [];
    
    for (const tx of smartTransactions) {
      if (tx.date && tx.description && typeof tx.amount === 'number' && tx.amount < 0 && tx.category) {
        const transaction: Transaction = {
          date: tx.date,
          description: tx.description.trim(),
          amount: tx.amount,
          category: tx.category.trim()
        };
        
        // SEMPRE incluir campos de parcela - se não detectado usar 1,1
        transaction.installment_number = tx.installment_number || 1;
        transaction.installment_total = tx.installment_total || 1;
        
        validTransactions.push(transaction);
      }
    }
    
    console.log(`[SMART-AI] ✅ IA identificou ${validTransactions.length} gastos com categorização inteligente`);
    
    // Log específico de parcelas detectadas
    const installmentTransactions = validTransactions.filter(tx => 
      tx.installment_total && tx.installment_total > 1
    );
    
    console.log(`[SMART-AI] 🎯 Transações parceladas detectadas: ${installmentTransactions.length}`);
    
    if (installmentTransactions.length > 0) {
      console.log('[SMART-AI] 💳 PARCELAS DETECTADAS:');
      installmentTransactions.forEach((tx, i) => {
        console.log(`[SMART-AI]   ${i + 1}. ${tx.description} - Parcela ${tx.installment_number}/${tx.installment_total} - R$ ${Math.abs(tx.amount).toFixed(2)}`);
      });
    }
    
    // Log das categorias encontradas
    const categoryCounts = validTransactions.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('[SMART-AI] 📊 Distribuição por categoria:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`[SMART-AI]   - ${category}: ${count} transações`);
    });
    
    // Log de algumas transações de exemplo
    if (validTransactions.length > 0) {
      console.log('[SMART-AI] 🎯 Exemplos de gastos identificados:');
      validTransactions.slice(0, 5).forEach((tx, i) => {
        console.log(`[SMART-AI]   ${i + 1}. ${tx.date} - ${tx.description} - R$ ${Math.abs(tx.amount).toFixed(2)} (${tx.category})`);
      });
    }
    
    return validTransactions;
    
  } catch (error) {
    console.error('[SMART-AI] ❌ Erro no processamento inteligente:', error);
    return [];
  }
};
