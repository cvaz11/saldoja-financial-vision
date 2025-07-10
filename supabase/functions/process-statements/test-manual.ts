// TESTE MANUAL DE DETECÇÃO DE PARCELAS
console.log("🔥 === TESTE MANUAL EXECUTANDO ===");

const problematicString = "Agi*Tute Tech - Parcela 9/12";
console.log("Input:", problematicString);
console.log("Caracteres especiais:", [...problematicString].filter(c => /[^a-zA-Z0-9\s]/.test(c)));

// Definir padrões corrigidos do nubank-transaction-parser.ts
const patterns = [
    { name: "Padrão 1: '.*- Parcela X/Y'", regex: /.*?-\s*parcela\s+(\d{1,2})\/(\d{1,2})/i },
    { name: "Padrão 2: '.*Parcela X/Y'", regex: /.*?parcela\s+(\d{1,2})\/(\d{1,2})/i },
    { name: "Padrão 3: '.*Parc X/Y'", regex: /.*?parc\.?\s*(\d{1,2})\/(\d{1,2})/i },
    { name: "Padrão 4: '.*X de Y'", regex: /.*?(\d{1,2})\s*de\s*(\d{1,2})/i },
    { name: "Padrão 5: '.*X/Y parcela'", regex: /.*?(\d{1,2})\/(\d{1,2})\s*parcela/i },
    { name: "Padrão 6: '.*X/Y' (não data)", regex: /.*?(\d{1,2})\s*\/\s*(\d{1,2})(?!\d|\/)/i }
];

// Verificações básicas
const hasHyphen = problematicString.includes('-');
const hasParcela = problematicString.toLowerCase().includes('parcela');
const hasNumbers = problematicString.match(/\d+\/\d+/);

console.log("=== VERIFICAÇÕES BÁSICAS ===");
console.log("Contém hífen (-):", hasHyphen);
console.log("Contém 'parcela':", hasParcela);
console.log("Contém números X/Y:", hasNumbers ? hasNumbers[0] : "NÃO");
console.log("String original length:", problematicString.length);

// Testar cada padrão individualmente
console.log("\n=== TESTANDO CADA PADRÃO ===");
patterns.forEach((pattern, index) => {
    console.log(`\n--- ${pattern.name} ---`);
    console.log(`Regex: ${pattern.regex.source}`);
    console.log(`Flags: ${pattern.regex.flags}`);
    
    const match = problematicString.match(pattern.regex);
    
    if (match) {
        console.log(`✅ MATCH ENCONTRADO!`);
        console.log(`Match completo: "${match[0]}"`);
        console.log(`Grupos capturados:`, match.slice(1));
        
        if (match[1] && match[2]) {
            const current = parseInt(match[1]);
            const total = parseInt(match[2]);
            console.log(`Parcela atual: ${current}, Total: ${total}`);
            
            const isValid = current > 0 && total > 0 && current <= total && total <= 99;
            console.log(`Validação: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
            
            if (isValid) {
                console.log(`🎯 SUCESSO! Padrão ${index + 1} detectou: ${current}/${total}`);
            }
        }
    } else {
        console.log(`❌ SEM MATCH`);
        
        // Debug adicional para entender por que não deu match
        if (pattern.regex.source.includes('parcela')) {
            console.log(`  - String contém 'parcela'?: ${problematicString.toLowerCase().includes('parcela')}`);
        }
        if (pattern.regex.source.includes('-')) {
            console.log(`  - String contém '-'?: ${problematicString.includes('-')}`);
        }
        
        // Testar versão simplificada
        const simpleTest = problematicString.toLowerCase().match(/parcela\s*\d+\/\d+/);
        console.log(`  - Match simplificado 'parcela X/Y':`, simpleTest ? simpleTest[0] : "NÃO");
    }
});

// Teste específico para o padrão corrigido que DEVE funcionar
console.log("\n=== TESTE ESPECÍFICO PADRÃO CORRIGIDO ===");
const specificPattern = /.*?-\s*parcela\s+(\d{1,2})\/(\d{1,2})/i;
const specificMatch = problematicString.match(specificPattern);
console.log(`Padrão específico: ${specificPattern.source}`);
console.log(`Input: "${problematicString}"`);
console.log(`Match:`, specificMatch);

if (specificMatch) {
    console.log(`✅ SUCESSO! Detectou: ${specificMatch[1]}/${specificMatch[2]}`);
} else {
    console.log(`❌ FALHOU - Padrão ainda não funciona`);
}

// Teste com string limpa
const cleanString = problematicString.replace('*', '');
console.log(`\n=== TESTE COM STRING LIMPA (sem *) ===`);
console.log(`String limpa: "${cleanString}"`);
const cleanMatch = cleanString.match(specificPattern);
console.log(`Match com string limpa:`, cleanMatch);

console.log("\n🔥 === FIM DO TESTE MANUAL ===");