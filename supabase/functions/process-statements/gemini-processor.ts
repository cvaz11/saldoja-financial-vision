
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
Analise este extrato bancário em PDF e extraia APENAS as transações de DÉBITO (gastos/despesas).

REGRAS IMPORTANTES:
- Extraia apenas transações com valores NEGATIVOS (débitos/gastos)
- Ignore créditos, receitas ou valores positivos
- Para data, use formato YYYY-MM-DD
- Para valores, use números negativos (ex: -150.50)
- Ignore taxas, juros ou valores do próprio banco

FORMATO DE SAÍDA (JSON):
[
  {
    "date": "2025-01-15",
    "description": "UBER TRIP",
    "amount": -25.50,
    "category": "Transporte"
  }
]

CATEGORIAS POSSÍVEIS:
- Alimentação (restaurantes, delivery, supermercado)
- Transporte (uber, taxi, combustível, estacionamento)
- Compras (lojas, e-commerce, farmácia)
- Lazer (cinema, streaming, jogos)
- Serviços (academia, salão, consultório)
- Casa (conta de luz, água, gás, internet)
- Educação (cursos, livros)
- Saúde (remédios, consultas)
- Outros (demais gastos)

Responda APENAS o JSON array, sem explicações adicionais.
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
          maxOutputTokens: 4096,
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
    console.log(`[GEMINI] Texto extraído: ${geminiText.slice(0, 500)}...`);

    // Parse JSON response
    let transactions: Transaction[] = [];
    try {
      // Clean the response to extract JSON
      const jsonMatch = geminiText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonText = jsonMatch[0];
        transactions = JSON.parse(jsonText);
        console.log(`[GEMINI] JSON parsed com sucesso: ${transactions.length} transações`);
      } else {
        console.log(`[GEMINI] Nenhum JSON encontrado na resposta`);
        return [];
      }
    } catch (parseError) {
      console.error(`[GEMINI] Erro ao fazer parse do JSON:`, parseError);
      console.log(`[GEMINI] Texto raw:`, geminiText);
      return [];
    }

    // Validate and filter transactions
    const validTransactions = transactions.filter(tx => {
      const isValid = tx.date && tx.description && tx.amount < 0;
      if (!isValid) {
        console.log(`[GEMINI] Transação inválida ignorada:`, tx);
      }
      return isValid;
    });

    console.log(`[GEMINI] ✅ Processamento concluído: ${validTransactions.length} débitos válidos`);
    
    if (validTransactions.length > 0) {
      console.log(`[GEMINI] Exemplos de transações extraídas:`);
      validTransactions.slice(0, 3).forEach((tx, i) => {
        console.log(`[GEMINI]   ${i + 1}. ${tx.date} - ${tx.description} - R$ ${Math.abs(tx.amount).toFixed(2)} (${tx.category})`);
      });
    }

    return validTransactions;

  } catch (error) {
    console.error(`[GEMINI] ===== ERRO NO PROCESSAMENTO GEMINI =====`);
    console.error(`[GEMINI] Erro:`, error.message);
    throw error;
  }
};
