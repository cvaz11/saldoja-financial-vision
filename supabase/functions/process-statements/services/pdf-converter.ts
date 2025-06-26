
import "https://deno.land/x/xhr@0.1.0/mod.ts";

export async function convertPdfToImages(pdfBuffer: ArrayBuffer): Promise<string[]> {
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
    console.log(`[PDF-CONVERTER] pdf2pic converteu ${results.length} páginas`);
    
    const images: string[] = [];
    
    for (const result of results) {
      if (result.buffer) {
        // Converter buffer para base64
        const base64 = btoa(String.fromCharCode(...new Uint8Array(result.buffer)));
        images.push(`data:image/png;base64,${base64}`);
        console.log(`[PDF-CONVERTER] Página ${result.page} convertida para PNG (${base64.length} chars)`);
      }
    }
    
    return images;
    
  } catch (error) {
    console.error(`[PDF-CONVERTER] Erro na conversão PDF → PNG:`, error.message);
    console.log(`[PDF-CONVERTER] Tentando método alternativo com Canvas...`);
    
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
    console.log(`[PDF-CONVERTER] PDF carregado com ${pdf.numPages} páginas`);
    
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
        console.log(`[PDF-CONVERTER] Página ${pageNum} renderizada como PNG (${base64.length} chars)`);
        
      } catch (pageError) {
        console.error(`[PDF-CONVERTER] Erro ao renderizar página ${pageNum}:`, pageError.message);
        continue;
      }
    }
    
    return images;
    
  } catch (error) {
    console.error(`[PDF-CONVERTER] Erro no método Canvas:`, error.message);
    return [];
  }
}
