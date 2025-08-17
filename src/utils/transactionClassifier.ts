/**
 * Utilitários para classificação correta de receita vs despesa
 */

// Termos que indicam receita/crédito
const INCOME_INDICATORS = [
  'pagamento recebido',
  'estorno',
  'reembolso',
  'credito',
  'crédito',
  'ajuste',
  'transferencia recebida',
  'transferência recebida',
  'pix recebido',
  'deposito',
  'depósito',
  'cashback',
  'devolucao',
  'devolução',
  'restituicao',
  'restituição'
];

// Termos que indicam despesa/débito  
const EXPENSE_INDICATORS = [
  'pagamento',
  'compra',
  'saque',
  'tarifa',
  'taxa',
  'anuidade',
  'juros',
  'iof',
  'mensalidade',
  'assinatura',
  'transferencia enviada',
  'transferência enviada',
  'pix enviado'
];

/**
 * Classifica uma transação como receita ou despesa baseado em:
 * 1. Valor (positivo = receita, negativo = despesa)
 * 2. Descrição (termos indicadores)
 * 3. Campo is_credit existente (se disponível)
 */
export const classifyTransaction = (
  description: string,
  amount: number,
  originalIsCredit?: boolean
): { isCredit: boolean; reason: string } => {
  const normalizedDescription = description.toLowerCase().trim();
  
  // 1. Verificar termos de receita
  const hasIncomeIndicator = INCOME_INDICATORS.some(term => 
    normalizedDescription.includes(term)
  );
  
  if (hasIncomeIndicator) {
    return {
      isCredit: true,
      reason: `Termo de receita encontrado: ${INCOME_INDICATORS.find(term => normalizedDescription.includes(term))}`
    };
  }
  
  // 2. Verificar termos de despesa
  const hasExpenseIndicator = EXPENSE_INDICATORS.some(term =>
    normalizedDescription.includes(term)
  );
  
  if (hasExpenseIndicator) {
    return {
      isCredit: false,
      reason: `Termo de despesa encontrado: ${EXPENSE_INDICATORS.find(term => normalizedDescription.includes(term))}`
    };
  }
  
  // 3. Usar valor como critério (positivo = receita, negativo = despesa)
  if (amount > 0) {
    return {
      isCredit: true,
      reason: 'Valor positivo indica receita'
    };
  } else if (amount < 0) {
    return {
      isCredit: false,
      reason: 'Valor negativo indica despesa'
    };
  }
  
  // 4. Fallback para o valor original se disponível
  if (originalIsCredit !== undefined) {
    return {
      isCredit: originalIsCredit,
      reason: 'Classificação original mantida'
    };
  }
  
  // 5. Fallback padrão (considera como despesa)
  return {
    isCredit: false,
    reason: 'Classificação padrão: despesa'
  };
};

/**
 * Identifica transações que foram potencialmente classificadas incorretamente
 */
export const findMisclassifiedTransactions = (transactions: any[]): any[] => {
  return transactions.filter(transaction => {
    const newClassification = classifyTransaction(
      transaction.description || '',
      transaction.amount,
      transaction.is_credit
    );
    
    // Retorna true se a classificação atual difere da nova
    return transaction.is_credit !== newClassification.isCredit;
  });
};

/**
 * Calcula o impacto da reclassificação nos totais por mês
 */
export const calculateReclassificationImpact = (
  transactions: any[],
  competencyFilter: (transaction: any) => { month: number; year: number }
): Record<string, { currentExpenses: number; currentIncome: number; newExpenses: number; newIncome: number; impact: number }> => {
  const impactByMonth: Record<string, any> = {};
  
  transactions.forEach(transaction => {
    const competency = competencyFilter(transaction);
    const monthKey = `${competency.month}/${competency.year}`;
    
    if (!impactByMonth[monthKey]) {
      impactByMonth[monthKey] = {
        currentExpenses: 0,
        currentIncome: 0,
        newExpenses: 0,
        newIncome: 0,
        impact: 0
      };
    }
    
    const amount = Math.abs(transaction.amount);
    const newClassification = classifyTransaction(
      transaction.description || '',
      transaction.amount,
      transaction.is_credit
    );
    
    // Totais atuais
    if (transaction.is_credit) {
      impactByMonth[monthKey].currentIncome += amount;
    } else {
      impactByMonth[monthKey].currentExpenses += amount;
    }
    
    // Totais após reclassificação
    if (newClassification.isCredit) {
      impactByMonth[monthKey].newIncome += amount;
    } else {
      impactByMonth[monthKey].newExpenses += amount;
    }
  });
  
  // Calcular impacto
  Object.keys(impactByMonth).forEach(monthKey => {
    const data = impactByMonth[monthKey];
    data.impact = (data.currentExpenses - data.newExpenses);
  });
  
  return impactByMonth;
};