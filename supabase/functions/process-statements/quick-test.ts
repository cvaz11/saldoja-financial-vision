// TESTE RÁPIDO DOS REGEX CORRIGIDOS

console.log("🧪 === TESTE RÁPIDO DOS REGEX ===");

// Casos de teste
const testCases = [
  "Agi*Tute Tech - Parcela 9/12",
  "Apple.Com/Bill - Parc 2/6", 
  "IOF de Apollo.Io - 3/10",
  "Supermercado Extra",
  "Data 01/01/2024", // Não deve detectar (é data)
  "URL site.com/path" // Não deve detectar
];

// Patterns corrigidos (copiados do nubank-transaction-parser.ts)
const patterns = [
  { name: "Padrão 1", regex: /.*?-\s*parcela\s+(\d{1,2})\/(\d{1,2})/i },
  { name: "Padrão 2", regex: /.*?parcela\s+(\d{1,2})\/(\d{1,2})/i },
  { name: "Padrão 3", regex: /.*?parc\.?\s*(\d{1,2})\/(\d{1,2})/i },
  { name: "Padrão 4", regex: /.*?(\d{1,2})\s*de\s*(\d{1,2})/i },
  { name: "Padrão 5", regex: /.*?(\d{1,2})\/(\d{1,2})\s*parcela/i },
  { name: "Padrão 6", regex: /.*?(\d{1,2})\s*\/\s*(\d{1,2})(?!\d|\/)/i }
];

console.log("\n📋 Testando casos:");

testCases.forEach((testCase, caseIndex) => {
  console.log(`\n${caseIndex + 1}. "${testCase}"`);
  
  let detected = false;
  
  for (const pattern of patterns) {
    const match = testCase.match(pattern.regex);
    
    if (match && match[1] && match[2]) {
      const current = parseInt(match[1]);
      const total = parseInt(match[2]);
      
      // Validar se é parcela válida
      if (current > 0 && total > 0 && current <= total && total <= 99) {
        console.log(`   ✅ DETECTADO por ${pattern.name}: ${current}/${total}`);
        detected = true;
        break;
      }
    }
  }
  
  if (!detected) {
    // Verificar se é um caso que NÃO deveria ser detectado
    if (testCase.includes('Data ') || testCase.includes('URL ') || testCase === 'Supermercado Extra') {
      console.log(`   ✅ CORRETO: Não detectado (como esperado)`);
    } else {
      console.log(`   ❌ PROBLEMA: Deveria ter sido detectado`);
    }
  }
});

console.log("\n🎯 === RESULTADO ESPECÍFICO PARA O CASO PROBLEMA ===");
const problematicCase = "Agi*Tute Tech - Parcela 9/12";
const pattern1 = /.*?-\s*parcela\s+(\d{1,2})\/(\d{1,2})/i;
const match1 = problematicCase.match(pattern1);

if (match1) {
  console.log(`✅ SUCESSO! "${problematicCase}" detectado como ${match1[1]}/${match1[2]}`);
  console.log("🎉 O regex corrigido funciona!");
} else {
  console.log(`❌ FALHA! "${problematicCase}" ainda não é detectado`);
}

console.log("\n🔚 === FIM DO TESTE RÁPIDO ===");