// Arquivo de teste para debugging de detecção de parcelas
import { NubankTransactionParser } from './libs/nubank-transaction-parser.ts';

export function testParcelaDetection() {
    console.log('=== TESTE MANUAL DE DETECÇÃO DE PARCELAS ===');
    
    const parser = new NubankTransactionParser();
    
    // Casos de teste específicos
    const testCases = [
        "Agi*Tute Tech - Parcela 9/12",
        "UBER EATS - Parcela 3/6", 
        "Apple Store - Parcela 1/10",
        "Amazon - 5 de 12",
        "Nubank - 7/10 parcela",
        "iFood 2/4",
        "Netflix - Parcela 1/1"
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`\n--- CASO ${index + 1}: "${testCase}" ---`);
        
        // Chamar diretamente o método de detecção (usar reflexão para acessar método privado)
        try {
            // Como detectInstallment é privado, vamos simular a lógica aqui
            const patterns = [
                /-\s*parcela\s+(\d{1,2})\/(\d{1,2})/i,    // "- Parcela 9/12"
                /parcela\s+(\d{1,2})\/(\d{1,2})/i,        // "Parcela 9/12"
                /(\d{1,2})\s*de\s*(\d{1,2})/i,            // "9 de 12"
                /(\d{1,2})\/(\d{1,2})\s*parcela/i,        // "9/12 parcela"
                /(\d{1,2})\s*\/\s*(\d{1,2})/i             // "9/12" (genérico)
            ];

            let found = false;
            patterns.forEach((pattern, patternIndex) => {
                const match = testCase.match(pattern);
                if (match) {
                    const current = parseInt(match[1]);
                    const total = parseInt(match[2]);
                    
                    if (current > 0 && total > 0 && current <= total && total <= 99) {
                        console.log(`✅ DETECTADO com padrão ${patternIndex + 1}: ${current}/${total}`);
                        found = true;
                    }
                }
            });
            
            if (!found) {
                console.log('❌ NÃO DETECTADO por nenhum padrão');
            }
            
        } catch (error) {
            console.log('❌ ERRO:', error.message);
        }
    });
}

// Função para testar diretamente via console
export function debugSpecificCase(description: string) {
    console.log(`\n=== DEBUG CASO ESPECÍFICO: "${description}" ===`);
    
    // Informações básicas
    console.log('Tamanho:', description.length);
    console.log('Caracteres especiais:', description.match(/[^a-zA-Z0-9\s]/g));
    console.log('Contém "parcela":', description.toLowerCase().includes('parcela'));
    console.log('Contém padrão x/y:', !!description.match(/\d+\/\d+/));
    
    // Testar cada padrão
    const patterns = [
        { name: "- Parcela X/Y", regex: /-\s*parcela\s+(\d{1,2})\/(\d{1,2})/i },
        { name: "Parcela X/Y", regex: /parcela\s+(\d{1,2})\/(\d{1,2})/i },
        { name: "X de Y", regex: /(\d{1,2})\s*de\s*(\d{1,2})/i },
        { name: "X/Y parcela", regex: /(\d{1,2})\/(\d{1,2})\s*parcela/i },
        { name: "X/Y genérico", regex: /(\d{1,2})\s*\/\s*(\d{1,2})/i }
    ];
    
    patterns.forEach((pattern, index) => {
        console.log(`\nPadrão ${index + 1} (${pattern.name}):`);
        console.log('Regex:', pattern.regex.source);
        
        const match = description.match(pattern.regex);
        if (match) {
            console.log('✅ MATCH:', match[0]);
            console.log('Grupos:', match.slice(1));
        } else {
            console.log('❌ NO MATCH');
        }
    });
}

// Função de teste executável para o caso problemático
export function testProblematicCase() {
    console.log("🔍 === TESTE DO CASO PROBLEMÁTICO ===");
    
    const parser = new NubankTransactionParser();
    const problematicString = "Agi*Tute Tech - Parcela 9/12";
    
    console.log("Input:", problematicString);
    console.log("Caracteres especiais:", [...problematicString].filter(c => /[^a-zA-Z0-9\s]/.test(c)));
    
    // Testar a detecção diretamente
    const result = parser.detectInstallmentPublic(problematicString);
    console.log("Resultado final:", result);
    
    if (!result) {
        console.log("❌ FALHA: Parcela não foi detectada!");
        console.log("Vamos analisar cada componente...");
        
        // Verificar se contém os elementos necessários
        const hasHyphen = problematicString.includes('-');
        const hasParcela = problematicString.toLowerCase().includes('parcela');
        const hasNumbers = problematicString.match(/\d+\/\d+/);
        
        console.log("Contém hífen:", hasHyphen);
        console.log("Contém 'parcela':", hasParcela);
        console.log("Contém números X/Y:", hasNumbers);
        
        // Testar manualmente o primeiro padrão
        const pattern1 = /-\s*parcela\s+(\d{1,2})\/(\d{1,2})/i;
        const match1 = problematicString.match(pattern1);
        console.log("Match padrão 1 (- Parcela X/Y):", match1);
        
        // Testar padrão mais simples
        const simplePattern = /parcela\s+(\d+)\/(\d+)/i;
        const simpleMatch = problematicString.match(simplePattern);
        console.log("Match padrão simples (Parcela X/Y):", simpleMatch);
    } else {
        console.log("✅ SUCESSO: Parcela detectada corretamente!");
    }
    
    return result;
}

// Executar teste automaticamente quando importado
console.log('🔧 Debug tools carregadas. Use testParcelaDetection(), debugSpecificCase(string) ou testProblematicCase()');

// Tornar disponível globalmente para teste no console
if (typeof globalThis !== 'undefined') {
    (globalThis as any).testProblematicCase = testProblematicCase;
    console.log("🔧 Função testProblematicCase() disponível globalmente");
}

// Executar teste automaticamente
console.log("=== EXECUTANDO TESTE AUTOMÁTICO ===");
testProblematicCase();