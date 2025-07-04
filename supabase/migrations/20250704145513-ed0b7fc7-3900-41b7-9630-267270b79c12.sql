INSERT INTO transactions (
  user_id, 
  statement_id, 
  transaction_date, 
  description, 
  amount, 
  category,
  installment_number, 
  installment_total,
  is_credit
) VALUES (
  '017aaf81-bc61-4a44-bbbe-e7f6214fd3a4',
  (SELECT id FROM statements WHERE filename = 'Nubank_2025-06-12.csv'),
  '2025-05-04',
  'Agi*Tute Tech - Parcela 9/12',
  396.66,
  'Tecnologia',
  9,
  12,
  false
);