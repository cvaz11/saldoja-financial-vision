
// Convert PDF to base64 and send to Gemini for transaction extraction
interface Transaction {
  date: string;
  description: string;  
  amount: number;
  category: string;
}

export const processWithGemini = async (pdfBuffer: ArrayBuffer): Promise<Transaction[]> => {
  try {
    console.log(`[GEMINI] ===== INICIANDO PROCESSAMENTO GEMINI =====`);
    console.log(`[GEMINI] PDF Buffer size: ${pdfBuffer.byteLength} bytes`);
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY não configurada');
    }

    // Convert PDF to base64
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
    console.log(`[GEMINI] PDF convertido para base64: ${base64Pdf.length} chars`);

    const prompt = `
VOCÊ É UM ESPECIALISTA EM ANÁLISE DE EXTRATOS BANCÁRIOS.

Analise este extrato bancário em PDF e extraia TODAS as transações de DÉBITO (gastos/despesas).

INSTRUÇÕES CRÍTICAS:
1. Extraia APENAS transações com valores NEGATIVOS ou marcadas como débito/saída
2. Ignore completamente: créditos, depósitos, receitas, valores positivos
3. Para data, use SEMPRE formato YYYY-MM-DD (ano com 4 dígitos)
4. Para valores, use números NEGATIVOS (exemplo: -150.50)
5. Ignore taxas bancárias, juros do próprio banco, tarifas
6. Se não encontrar NENHUMA transação de débito, retorne array vazio []

CATEGORIZAÇÃO INTELIGENTE:
- Alimentação: restaurantes, delivery, supermercado, mercado, açougue, padaria, lanchonete
- Transporte: uber, taxi, combustível, gasolina, posto, estacionamento, pedágio
- Compras: lojas, e-commerce, amazon, mercado livre, farmácia, magazine
- Lazer: cinema, streaming, netflix, spotify, jogos, teatro, parque
- Serviços: academia, salão, barbeiro, consultório, veterinário
- Casa: luz, água, gás, internet, telefone, condomínio, aluguel
- Educação: escola, curso, livro, material escolar
- Saúde: remédio, hospital, clínica, laboratório
- Outros: tudo que não se encaixa nas categorias acima

FORMATO DE RESPOSTA (APENAS JSON):
[
  {
    "date": "2025-01-15",
    "description": "UBER TRIP SAO PAULO",
    "amount": -25.50,
    "category": "Transporte"
  },
  {
    "date": "2025-01-14", 
    "description": "SUPERMERCADO EXTRA",
    "amount": -180.30,
    "category": "Alimentação"
  }
]

IMPORTANTE: Responda APENAS com o array JSON, sem explicações, sem texto adicional, sem markdown.
`;

    console.log(`[GEMINI] Enviando para Gemini API...`);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "application/pdf",
                data: base64Pdf
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          topK: 40,
          topP: 0.8,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GEMINI] Erro na API: ${response.status} - ${errorText}`);
      throw new Error(`Gemini API falhou: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[GEMINI] Resposta recebida da API`);

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error(`[GEMINI] Resposta inválida:`, data);
      throw new Error('Resposta inválida do Gemini');
    }

    const geminiText = data.candidates[0].content.parts[0].text;
    console.log(`[GEMINI] Texto extraído: ${geminiText.slice(0, 200)}...`);

    // Parse JSON response com múltiplas tentativas
    let transactions: Transaction[] = [];
    
    try {
      // Primeira tentativa: procurar JSON limpo
      const cleanText = geminiText.trim();
      if (cleanText.startsWith('[') && cleanText.endsWith(']')) {
        transactions = JSON.parse(cleanText);
        console.log(`[GEMINI] JSON parseado diretamente com sucesso`);
      } else {
        // Segunda tentativa: extrair JSON do texto
        const jsonMatch = geminiText.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const jsonText = jsonMatch[0];
          transactions = JSON.parse(jsonText);
          console.log(`[GEMINI] JSON extraído e parseado com sucesso`);
        } else {
          console.log(`[GEMINI] Nenhum JSON válido encontrado na resposta`);
          console.log(`[GEMINI] Resposta completa:`, geminiText);
          return [];
        }
      }
    } catch (parseError) {
      console.error(`[GEMINI] Erro ao fazer parse do JSON:`, parseError);
      console.log(`[GEMINI] Texto problemático:`, geminiText);
      
      // Tentativa de recuperação: procurar por transações no texto
      try {
        const lines = geminiText.split('\n');
        const transactionLines = lines.filter(line => 
          line.includes('date') || line.includes('description') || line.includes('amount')
        );
        console.log(`[GEMINI] Linhas com possíveis transações:`, transactionLines);
      } catch (recoveryError) {
        console.error(`[GEMINI] Falha na tentativa de recuperação:`, recoveryError);
      }
      
      return [];
    }

    // Validar e limpar transações
    const validTransactions = transactions.filter((tx, index) => {
      if (!tx || typeof tx !== 'object') {
        console.log(`[GEMINI] Transação ${index + 1} não é objeto válido:`, tx);
        return false;
      }
      
      if (!tx.date || !tx.description || typeof tx.amount !== 'number') {
        console.log(`[GEMINI] Transação ${index + 1} com campos obrigatórios faltando:`, tx);
        return false;
      }
      
      if (tx.amount >= 0) {
        console.log(`[GEMINI] Transação ${index + 1} ignorada (valor positivo):`, tx);
        return false;
      }
      
      // Validar formato da data
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(tx.date)) {
        console.log(`[GEMINI] Transação ${index + 1} com data inválida:`, tx);
        return false;
      }
      
      return true;
    }).map(tx => ({
      ...tx,
      category: tx.category || 'Outros',
      description: tx.description.slice(0, 255) // Limitar tamanho
    }));

    console.log(`[GEMINI] ✅ Processamento concluído: ${validTransactions.length} débitos válidos de ${transactions.length} originais`);
    
    if (validTransactions.length > 0) {
      console.log(`[GEMINI] 📋 Primeiras transações extraídas:`);
      validTransactions.slice(0, 5).forEach((tx, i) => {
        console.log(`[GEMINI]   ${i + 1}. ${tx.date} - ${tx.description} - R$ ${Math.abs(tx.amount).toFixed(2)} (${tx.category})`);
      });
      
      const totalAmount = validTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      console.log(`[GEMINI] 💰 Total extraído: R$ ${totalAmount.toFixed(2)}`);
    }

    return validTransactions;

  } catch (error) {
    console.error(`[GEMINI] ===== ERRO CRÍTICO NO PROCESSAMENTO GEMINI =====`);
    console.error(`[GEMINI] Tipo do erro:`, error.name);
    console.error(`[GEMINI] Mensagem:`, error.message);
    console.error(`[GEMINI] Stack:`, error.stack);
    throw error;
  }
};
