// Teste direto da detecção de parcelas
console.log("🔥 === TESTE DIRETO DE DETECÇÃO DE PARCELAS ===");

// Importar a classe diretamente
import { NubankTransactionParser } from './libs/nubank-transaction-parser.ts';

// Criar instância do parser
const parser = new NubankTransactionParser();

// String de teste problemática
const testString = "Agi*Tute Tech - Parcela 9/12";

console.log("🔍 String de teste:", testString);
console.log("📊 Caracteres especiais:", [...testString].filter(c => /[^a-zA-Z0-9\s]/.test(c)));

// Teste direto do método público
console.log("\n🧪 === EXECUTANDO DETECÇÃO ===");
try {
  const resultado = parser.detectInstallmentPublic(testString);
  
  console.log("🎯 Resultado da detecção:", resultado);
  
  if (resultado) {
    console.log("✅ SUCESSO! Parcela detectada:");
    console.log(`   ✓ Parcela atual: ${resultado.current}`);
    console.log(`   ✓ Total parcelas: ${resultado.total}`);
    console.log(`   ✓ ID da parcela: ${resultado.id}`);
  } else {
    console.log("❌ FALHA: Parcela não foi detectada");
  }
  
} catch (error) {
  console.log("❌ Erro durante a detecção:", error.message);
}

console.log("🔥 === FIM DO TESTE ===");