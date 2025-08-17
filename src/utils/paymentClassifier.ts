/**
 * Utilitário para detectar pagamentos de fatura que devem ser neutros nos totais
 */

const PAYMENT_PATTERNS = [
  // Exato
  'pagamento recebido',
  
  // Variações
  'pagamento da fatura',
  'pagamento fatura',
  'pagamento cartão',
  'pagamento cartao',
  'crédito de fatura',
  'credito de fatura',
  'crédito referente pagamento',
  'credito referente pagamento',
];

/**
 * Verifica se uma transação é um pagamento de fatura (deve ser neutro nos totais)
 */
export const isInvoicePayment = (description: string): boolean => {
  if (!description) return false;
  
  const normalizedDesc = description.toLowerCase().trim()
    // Remove acentos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remove pontuação extra
    .replace(/[.,;:!?-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return PAYMENT_PATTERNS.some(pattern => 
    normalizedDesc === pattern || normalizedDesc.includes(pattern)
  );
};

/**
 * Determina se uma transação deve ser incluída nos totais
 */
export const shouldIncludeInTotals = (transaction: any): boolean => {
  return !isInvoicePayment(transaction.description || '');
};