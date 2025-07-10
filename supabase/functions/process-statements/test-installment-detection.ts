// TESTE ESPECÍFICO PARA DETECÇÃO DE PARCELAS
// Simula o processamento da transação "Agi*Tute Tech - Parcela 9/12"

import { NubankTransactionParser } from './libs/nubank-transaction-parser.ts';

console.log("🚀 === TESTE DE DETECÇÃO DE PARCELAS ===");

// Dados da transação problema
const testTransaction = {
  description: "Agi*Tute Tech - Parcela 9/12",
  amount: 396.66,
  date: "2025-05-04"
};

console.log("📋 Dados da transação teste:");
console.log(`  - Descrição: "${testTransaction.description}"`);
console.log(`  - Valor: R$ ${testTransaction.amount}`);
console.log(`  - Data: ${testTransaction.date}`);

// Criar instância do parser
const parser = new NubankTransactionParser();

console.log("\n🔍 === TESTE DOS REGEX PATTERNS CORRIGIDOS ===");

// Testar detecção de parcela
const installmentResult = parser.detectInstallmentPublic(testTransaction.description);

if (installmentResult) {
  console.log("✅ SUCESSO! Parcela detectada:");
  console.log(`   - Parcela atual: ${installmentResult.current}`);
  console.log(`   - Total de parcelas: ${installmentResult.total}`);
  console.log(`   - ID da parcela: ${installmentResult.id}`);
  
  // Testar extração da descrição base
  const baseDescription = testTransaction.description
    .replace(/\*/g, '') // Remove asteriscos
    .replace(/-\s*parcela\s+\d{1,2}\/\d{1,2}/i, '') // Remove "- Parcela X/Y"
    .trim();
    
  console.log(`   - Descrição base extraída: "${baseDescription}"`);
  
  // Simular geração de parcelas futuras
  console.log("\n🔮 === SIMULAÇÃO DE PARCELAS FUTURAS ===");
  
  const currentDate = new Date(testTransaction.date);
  const futureInstallments = [];
  
  for (let i = installmentResult.current + 1; i <= installmentResult.total; i++) {
    const futureDate = new Date(currentDate);
    futureDate.setMonth(futureDate.getMonth() + (i - installmentResult.current));
    
    const futureInstallment = {
      description: `${baseDescription} - Parcela ${i}/${installmentResult.total}`,
      amount: testTransaction.amount,
      dueDate: futureDate.toISOString().split('T')[0],
      installment_number: i,
      installment_total: installmentResult.total,
      installment_id: installmentResult.id,
      status: 'pending'
    };
    
    futureInstallments.push(futureInstallment);
  }
  
  console.log(`🎯 Parcelas futuras a serem criadas: ${futureInstallments.length}`);
  futureInstallments.forEach((installment, index) => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const date = new Date(installment.dueDate);
    const monthName = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    console.log(`   ${index + 1}. ${installment.description}`);
    console.log(`      📅 Data: ${monthName}/${year} (${installment.dueDate})`);
    console.log(`      💰 Valor: R$ ${installment.amount.toFixed(2)}`);
    console.log(`      🔗 ID: ${installment.installment_id}`);
  });
  
  // Testar estrutura para banco de dados
  console.log("\n💾 === ESTRUTURA PARA BANCO DE DADOS ===");
  
  const dbTransaction = {
    description: testTransaction.description,
    amount: -Math.abs(testTransaction.amount), // Negativo para débito
    transaction_date: testTransaction.date,
    installment_number: installmentResult.current,
    installment_total: installmentResult.total,
    installment_id: installmentResult.id,
    category: 'tecnologia', // Categoria exemplo
    is_credit: false
  };
  
  console.log("📊 Transação atual para salvar:");
  console.log(JSON.stringify(dbTransaction, null, 2));
  
  console.log("\n📊 Parcelas futuras para salvar:");
  const dbFutureTransactions = futureInstallments.map(inst => ({
    description: inst.description,
    amount: -Math.abs(inst.amount),
    transaction_date: inst.dueDate,
    installment_number: inst.installment_number,
    installment_total: inst.installment_total,
    installment_id: inst.installment_id,
    category: 'tecnologia',
    is_credit: false,
    // Campos adicionais para identificar como transação futura
    is_future: true,
    source: 'auto_generated'
  }));
  
  dbFutureTransactions.forEach((tx, index) => {
    console.log(`${index + 1}. ${JSON.stringify(tx, null, 2)}`);
  });
  
  console.log("\n🎉 === RESULTADO FINAL ===");
  console.log("✅ Detecção de parcela: FUNCIONOU");
  console.log("✅ Extração de descrição base: FUNCIONOU");
  console.log("✅ Geração de parcelas futuras: FUNCIONOU");
  console.log("✅ Estrutura para banco: PREPARADA");
  
} else {
  console.log("❌ FALHA! Parcela não foi detectada.");
  console.log("🔧 Verificando possíveis causas:");
  
  // Debug detalhado
  const patterns = [
    { name: "Padrão 1", regex: /.*?-\s*parcela\s+(\d{1,2})\/(\d{1,2})/i },
    { name: "Padrão 2", regex: /.*?parcela\s+(\d{1,2})\/(\d{1,2})/i },
    { name: "Padrão 3", regex: /.*?parc\.?\s*(\d{1,2})\/(\d{1,2})/i }
  ];
  
  patterns.forEach(pattern => {
    const match = testTransaction.description.match(pattern.regex);
    console.log(`   ${pattern.name}: ${match ? '✅ MATCH' : '❌ SEM MATCH'}`);
    if (match) {
      console.log(`      Grupos: [${match[1]}, ${match[2]}]`);
    }
  });
}

console.log("\n🔚 === FIM DO TESTE ===");