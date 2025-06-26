
interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

export async function extractTransactionsFromMarkdown(markdown: string): Promise<Transaction[]> {
  const prompt = `Você é um especialista em extrair transações de extratos bancários Nubank.

MARKDOWN DO EXTRATO:
${markdown}

TAREFA: Extraia APENAS as transações de DÉBITO/SAÍDA (gastos) do extrato acima.

REGRAS CRÍTICAS:
1. IGNORE completamente créditos, depósitos, receitas, PIX recebidos
2. Extraia APENAS débitos/saídas/gastos (valores que saíram da conta)
3. Para cada transação de débito, forneça:
   - Data no formato YYYY-MM-DD
   - Descrição completa e limpa
   - Valor positivo (sem sinal negativo)
   - Categoria estimada

FORMATO DE RESPOSTA (JSON):
[
  {
    "date": "2024-01-15",
    "description": "Supermercado ABC",
    "amount": 85.50,
    "category": "Alimentação"
  }
]

CATEGORIAS VÁLIDAS:
- Alimentação
- Transporte
- Saúde
- Educação
- Lazer
- Compras
- Contas
- Outros

Analise o markdown e extraia APENAS as transações de débito:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TRANSACTION-EXTRACTOR] GPT-4o erro ${response.status}:`, errorText);
      return [];
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error(`[TRANSACTION-EXTRACTOR] Resposta inválida:`, data);
      return [];
    }

    const content = data.choices[0].message.content || '';
    console.log(`[TRANSACTION-EXTRACTOR] GPT-4o response: ${content.substring(0, 200)}...`);
    
    // Tentar extrair JSON da resposta
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`[TRANSACTION-EXTRACTOR] Nenhum JSON encontrado na resposta`);
      return [];
    }
    
    const transactions = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(transactions)) {
      console.error(`[TRANSACTION-EXTRACTOR] Resposta não é um array:`, transactions);
      return [];
    }
    
    // Validar e normalizar transações
    const validTransactions: Transaction[] = [];
    
    for (const tx of transactions) {
      if (tx.date && tx.description && typeof tx.amount === 'number' && tx.amount > 0) {
        validTransactions.push({
          date: tx.date,
          description: tx.description.trim(),
          amount: tx.amount,
          category: tx.category || 'Outros'
        });
      }
    }
    
    console.log(`[TRANSACTION-EXTRACTOR] ${validTransactions.length} transações válidas extraídas`);
    return validTransactions;
    
  } catch (error) {
    console.error(`[TRANSACTION-EXTRACTOR] Erro na extração:`, error.message);
    return [];
  }
}
