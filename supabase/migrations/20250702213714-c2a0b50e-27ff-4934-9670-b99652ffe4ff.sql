-- Inserir parcelas de exemplo para testar a funcionalidade
INSERT INTO public.transactions (
  user_id,
  description,
  amount,
  transaction_date,
  category,
  installment_number,
  installment_total,
  is_credit
) VALUES 
-- Parcelas da compra Agi*Tute Tech
('017aaf81-bc61-4a44-bbbe-e7f6214fd3a4', 'Agi*Tute Tech - Parcela 9/12', 150.00, '2025-06-15', 'Tecnologia', 9, 12, false),
('017aaf81-bc61-4a44-bbbe-e7f6214fd3a4', 'Agi*Tute Tech - Parcela 10/12', 150.00, '2025-07-15', 'Tecnologia', 10, 12, false),
('017aaf81-bc61-4a44-bbbe-e7f6214fd3a4', 'Agi*Tute Tech - Parcela 11/12', 150.00, '2025-08-15', 'Tecnologia', 11, 12, false),
('017aaf81-bc61-4a44-bbbe-e7f6214fd3a4', 'Agi*Tute Tech - Parcela 12/12', 150.00, '2025-09-15', 'Tecnologia', 12, 12, false),

-- Parcelas de um iPhone
('017aaf81-bc61-4a44-bbbe-e7f6214fd3a4', 'Apple Store - iPhone 15 - Parcela 3/10', 450.00, '2025-06-10', 'Tecnologia', 3, 10, false),
('017aaf81-bc61-4a44-bbbe-e7f6214fd3a4', 'Apple Store - iPhone 15 - Parcela 4/10', 450.00, '2025-07-10', 'Tecnologia', 4, 10, false),
('017aaf81-bc61-4a44-bbbe-e7f6214fd3a4', 'Apple Store - iPhone 15 - Parcela 5/10', 450.00, '2025-08-10', 'Tecnologia', 5, 10, false),

-- Parcelas de móveis
('017aaf81-bc61-4a44-bbbe-e7f6214fd3a4', 'Casas Bahia - Sofá - Parcela 2/6', 280.00, '2025-06-20', 'Casa', 2, 6, false),
('017aaf81-bc61-4a44-bbbe-e7f6214fd3a4', 'Casas Bahia - Sofá - Parcela 3/6', 280.00, '2025-07-20', 'Casa', 3, 6, false),
('017aaf81-bc61-4a44-bbbe-e7f6214fd3a4', 'Casas Bahia - Sofá - Parcela 4/6', 280.00, '2025-08-20', 'Casa', 4, 6, false);