
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

export async function processImageWithGPT4Vision(imageData: string, pageNumber: number): Promise<string> {
  const prompt = `Você é um especialista em extratos bancários do Nubank. Analise esta imagem de extrato e converta TODO o conteúdo visível em Markdown estruturado.

INSTRUÇÕES CRÍTICAS:
1. Preserve TODAS as transações, valores, datas e descrições exatamente como aparecem
2. Use tabelas Markdown para organizar as transações
3. Mantenha a formatação de valores monetários (R$ X,XX)
4. Inclua cabeçalhos, seções e qualquer texto relevante
5. Se houver transações, organize-as em formato de tabela com colunas: Data | Descrição | Valor
6. Identifique claramente DÉBITOS/SAÍDAS vs CRÉDITOS/ENTRADAS
7. Preserve informações sobre parcelas (X/Y)

FORMATO ESPERADO:
# Extrato Nubank - Página ${pageNumber}

## Resumo do Período
[se houver informações de período]

## Transações

| Data | Descrição | Valor | Tipo |
|------|-----------|-------|------|
| DD/MM | Descrição completa | R$ X,XX | Débito |

## Outras Informações
[qualquer outro conteúdo relevante]

Analise a imagem cuidadosamente e extraia TUDO que conseguir ler:`;

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
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GPT4-VISION] API erro ${response.status}:`, errorText);
      return '';
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error(`[GPT4-VISION] Resposta inválida:`, data);
      return '';
    }

    const content = data.choices[0].message.content || '';
    console.log(`[GPT4-VISION] Página ${pageNumber}: ${content.length} chars`);
    
    return content;
    
  } catch (error) {
    console.error(`[GPT4-VISION] Erro na chamada:`, error.message);
    return '';
  }
}
