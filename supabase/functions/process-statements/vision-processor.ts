
import "https://deno.land/x/xhr@0.1.0/mod.ts";

interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

export const processWithVision = async (pdfBuffer: ArrayBuffer): Promise<Transaction[]> => {
  try {
    console.log(`[VISION] ===== INICIANDO PROCESSAMENTO VISION =====`);
    console.log(`[VISION] PDF Buffer size: ${pdfBuffer.byteLength} bytes`);
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    // Converter PDF para imagens PNG usando pdf2pic
    console.log(`[VISION] Convertendo PDF para imagens PNG...`);
    const images = await convertPdfToImages(pdfBuffer);
    console.log(`[VISION] PDF convertido em ${images.length} imagens PNG`);

    if (images.length === 0) {
      console.log(`[VISION] ❌ Nenhuma imagem PNG gerada do PDF`);
      return [];
    }

    // Processar cada imagem com GPT-4o Vision
    console.log(`[VISION] Processando ${images.length} imagens PNG com GPT-4o Vision...`);
    const allMarkdown: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
      console.log(`[VISION] Processando imagem PNG ${i + 1}/${images.length}...`);
      
      try {
        const markdown = await processImageWithGPT4Vision(images[i], i + 1);
        if (markdown.trim()) {
          allMarkdown.push(markdown);
          console.log(`[VISION] ✅ Página ${i + 1} processada com sucesso`);
        } else {
          console.log(`[VISION] ⚠️  Página ${i + 1} retornou conteúdo vazio`);
        }
      } catch (error) {
        console.error(`[VISION] ❌ Erro ao processar página ${i + 1}:`, error.message);
        continue;
      }
    }

    if (allMarkdown.length === 0) {
      console.log(`[VISION] ❌ Nenhuma página foi processada com sucesso`);
      return [];
    }

    // Combinar todo o Markdown
    const combinedMarkdown = allMarkdown.join('\n\n---\n\n');
    console.log(`[VISION] Markdown combinado (${combinedMarkdown.length} chars)`);

    // Extrair transações do Markdown combinado
    console.log(`[VISION] Extraindo transações do Markdown...`);
    const transactions = await extractTransactionsFromMarkdown(combinedMarkdown);
    
    console.log(`[VISION] ✅ ${transactions.length} transações extraídas com Vision`);
    
    if (transactions.length > 0) {
      console.log(`[VISION] Primeiras 3 transações:`);
      transactions.slice(0, 3).forEach((tx, i) => {
        console.log(`[VISION]   ${i + 1}. ${tx.date} - ${tx.description} - R$ ${tx.amount.toFixed(2)} (${tx.category})`);
      });
    }
    
    return transactions;
    
  } catch (error) {
    console.error(`[VISION] ❌ Erro no processamento Vision:`, error.message);
    return [];
  }
};

async function convertPdfToImages(pdfBuffer: ArrayBuffer): Promise<string[]> {
  try {
    // Usar pdf2pic library para converter PDF em imagens PNG
    const pdf2picModule = await import('https://esm.sh/pdf2pic@2.1.4');
    const { fromBuffer } = pdf2picModule.default;
    
    // Configurar pdf2pic para gerar imagens PNG
    const convert = fromBuffer(new Uint8Array(pdfBuffer), {
      density: 200,           // DPI para qualidade
      saveFilename: "page",
      savePath: "/tmp",
      format: "png",
      width: 1200,           // Largura fixa para melhor leitura
      height: 1600,          // Altura proporcional
      quality: 90
    });
    
    // Converter todas as páginas
    const results = await convert.bulk(-1); // -1 = todas as páginas
    console.log(`[VISION] pdf2pic converteu ${results.length} páginas`);
    
    const images: string[] = [];
    
    for (const result of results) {
      if (result.buffer) {
        // Converter buffer para base64
        const base64 = btoa(String.fromCharCode(...new Uint8Array(result.buffer)));
        images.push(`data:image/png;base64,${base64}`);
        console.log(`[VISION] Página ${result.page} convertida para PNG (${base64.length} chars)`);
      }
    }
    
    return images;
    
  } catch (error) {
    console.error(`[VISION] Erro na conversão PDF → PNG:`, error.message);
    console.log(`[VISION] Tentando método alternativo com Canvas...`);
    
    // Método alternativo usando canvas
    return await convertPdfToImagesCanvas(pdfBuffer);
  }
}

async function convertPdfToImagesCanvas(pdfBuffer: ArrayBuffer): Promise<string[]> {
  try {
    // Usar PDF.js para renderizar páginas como imagens
    const pdfjsModule = await import('https://esm.sh/pdfjs-dist@4.0.379');
    const { getDocument } = pdfjsModule;
    
    // Carregar PDF
    const pdf = await getDocument({ data: pdfBuffer }).promise;
    console.log(`[VISION] PDF carregado com ${pdf.numPages} páginas`);
    
    const images: string[] = [];
    
    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 10); pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        
        // Criar canvas para renderizar a página
        const canvas = new OffscreenCanvas(1200, 1600);
        const context = canvas.getContext('2d');
        
        const viewport = page.getViewport({ scale: 2.0 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Renderizar página no canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Converter canvas para PNG base64
        const blob = await canvas.convertToBlob({ type: 'image/png', quality: 0.9 });
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        
        images.push(`data:image/png;base64,${base64}`);
        console.log(`[VISION] Página ${pageNum} renderizada como PNG (${base64.length} chars)`);
        
      } catch (pageError) {
        console.error(`[VISION] Erro ao renderizar página ${pageNum}:`, pageError.message);
        continue;
      }
    }
    
    return images;
    
  } catch (error) {
    console.error(`[VISION] Erro no método Canvas:`, error.message);
    return [];
  }
}

async function processImageWithGPT4Vision(imageData: string, pageNumber: number): Promise<string> {
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
      console.error(`[VISION] GPT-4o Vision API erro ${response.status}:`, errorText);
      return '';
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error(`[VISION] Resposta GPT-4o Vision inválida:`, data);
      return '';
    }

    const content = data.choices[0].message.content || '';
    console.log(`[VISION] GPT-4o Vision página ${pageNumber}: ${content.length} chars`);
    
    return content;
    
  } catch (error) {
    console.error(`[VISION] Erro na chamada GPT-4o Vision:`, error.message);
    return '';
  }
}

async function extractTransactionsFromMarkdown(markdown: string): Promise<Transaction[]> {
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
      console.error(`[VISION] GPT-4o extração erro ${response.status}:`, errorText);
      return [];
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error(`[VISION] Resposta GPT-4o extração inválida:`, data);
      return [];
    }

    const content = data.choices[0].message.content || '';
    console.log(`[VISION] GPT-4o extração response: ${content.substring(0, 200)}...`);
    
    // Tentar extrair JSON da resposta
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`[VISION] Nenhum JSON encontrado na resposta GPT-4o`);
      return [];
    }
    
    const transactions = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(transactions)) {
      console.error(`[VISION] Resposta não é um array:`, transactions);
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
    
    console.log(`[VISION] ${validTransactions.length} transações válidas extraídas`);
    return validTransactions;
    
  } catch (error) {
    console.error(`[VISION] Erro na extração de transações:`, error.message);
    return [];
  }
}
