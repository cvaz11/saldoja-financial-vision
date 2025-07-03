// Arquivo para triggerar manualmente os testes
console.log("🚀 === TRIGGER MANUAL DOS TESTES ===");

// Importar e executar o teste manual
try {
  console.log("📁 Importando test-manual.ts...");
  await import('./test-manual.ts');
  console.log("✅ test-manual.ts executado com sucesso");
} catch (error) {
  console.log("❌ Erro ao executar test-manual.ts:", error.message);
}

// Importar e executar o teste de correção
try {
  console.log("📁 Importando testCorrecaoParcelas...");
  const { testCorrecaoParcelas } = await import('./libs/nubank-transaction-parser.ts');
  
  console.log("🧪 Executando testCorrecaoParcelas...");
  const testResult = testCorrecaoParcelas();
  
  console.log("🎯 Resultado final do teste:", testResult);
  
  if (testResult) {
    console.log("🎉 SUCESSO! Parcela detectada com:");
    console.log(`   ✓ Parcela atual: ${testResult.current}`);
    console.log(`   ✓ Total parcelas: ${testResult.total}`);
    console.log(`   ✓ ID da parcela: ${testResult.id}`);
  } else {
    console.log("❌ FALHA: Parcela não foi detectada");
  }
  
} catch (error) {
  console.log("❌ Erro ao executar testCorrecaoParcelas:", error.message);
  console.log("Stack trace:", error.stack);
}

console.log("🏁 === FIM DOS TESTES ===");