import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  is_credit: boolean;
  installment_number?: number;
  installment_total?: number;
  category?: string;
  statement_id?: string;
  user_id: string;
}

interface CategoryData {
  name: string;
  icon: string;
  totalAmount: number;
  transactions: Transaction[];
  percentage: number;
}

interface CategoryViewProps {
  transactions: Transaction[];
  isLoading: boolean;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteClick: (transactionId: string) => void;
}

const categoryIcons: Record<string, string> = {
  "Alimentação": "🍽️",
  "Restaurantes": "🍕",
  "Supermercado": "🛒",
  "Transporte": "🚗",
  "Combustível": "⛽",
  "Uber/Taxi": "🚕",
  "Casa": "🏠",
  "Roupas": "👕",
  "Saúde": "🏥",
  "Educação": "📚",
  "Entretenimento": "🎬",
  "Viagem": "✈️",
  "Outros": "📋",
  "Freelance": "💼",
  "Salário": "💰",
  "Investimentos": "📈",
  "Receita": "💸"
};

const CategoryView = ({ 
  transactions, 
  isLoading, 
  onEditTransaction, 
  onDeleteClick 
}: CategoryViewProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const categoryData = useMemo(() => {
    // Filtrar apenas débitos para o cálculo de gastos
    const expenseTransactions = transactions.filter(t => !t.is_credit);
    
    if (expenseTransactions.length === 0) {
      return [];
    }

    // Agrupar por categoria
    const grouped = expenseTransactions.reduce((acc, transaction) => {
      const category = transaction.category || "Outros";
      
      if (!acc[category]) {
        acc[category] = {
          name: category,
          icon: categoryIcons[category] || "📋",
          totalAmount: 0,
          transactions: [],
          percentage: 0
        };
      }
      
      acc[category].totalAmount += transaction.amount;
      acc[category].transactions.push(transaction);
      
      return acc;
    }, {} as Record<string, CategoryData>);

    // Calcular total geral e porcentagens
    const totalAmount = Object.values(grouped).reduce((sum, cat) => sum + cat.totalAmount, 0);
    
    const result = Object.values(grouped).map(category => ({
      ...category,
      percentage: totalAmount > 0 ? (category.totalAmount / totalAmount) * 100 : 0
    }));

    // Ordenar por valor (maior primeiro)
    return result.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [transactions]);

  const totalExpenses = categoryData.reduce((sum, cat) => sum + cat.totalAmount, 0);

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded mt-4"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (categoryData.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Nenhum gasto encontrado para este período
        </h3>
        <p className="text-gray-600">
          Importe extratos ou adicione transações para ver suas categorias de gastos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo total */}
      <Card className="bg-gradient-to-r from-sage-50 to-sage-100 border-sage-200">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-sm text-sage-700 mb-1">Total de Gastos</p>
            <p className="text-2xl font-bold text-sage-900">{formatCurrency(totalExpenses)}</p>
            <p className="text-sm text-sage-600 mt-1">
              {categoryData.length} {categoryData.length === 1 ? 'categoria' : 'categorias'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cards por categoria */}
      {categoryData.map((category) => {
        const isExpanded = expandedCategories.has(category.name);
        
        return (
          <Card key={category.name} className="border-gray-200 overflow-hidden">
            <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category.name)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="text-2xl">{category.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                        <p className="text-sm text-gray-600">
                          {category.transactions.length} {category.transactions.length === 1 ? 'transação' : 'transações'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(category.totalAmount)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {category.percentage.toFixed(1)}% do total
                      </p>
                    </div>
                  </div>
                  
                  {/* Barra de progresso */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>{formatCurrency(category.totalAmount)}</span>
                      <span>{formatCurrency(totalExpenses)}</span>
                    </div>
                    <Progress 
                      value={category.percentage} 
                      className="h-2 bg-gray-200"
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0 border-t border-gray-100">
                  {/* Lista de transações expandida */}
                  <div className="space-y-2 mt-4">
                    {category.transactions.map((transaction, index) => (
                      <div 
                        key={transaction.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 relative"
                      >
                        {/* Layout Mobile Otimizado */}
                        <div className="space-y-3">
                          {/* Linha 1: Descrição e Valor */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-2 h-2 bg-sage-600 rounded-full flex-shrink-0"></div>
                              <p className="font-medium text-gray-900 text-sm leading-tight">
                                {transaction.description}
                              </p>
                            </div>
                            <p className="font-bold text-red-600 text-lg whitespace-nowrap">
                              -{formatCurrency(transaction.amount)}
                            </p>
                          </div>
                          
                          {/* Linha 2: Data e Badges */}
                          <div className="flex items-center justify-between gap-2 ml-5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-gray-600">
                                {format(new Date(transaction.transaction_date), "dd MMM yyyy", { locale: ptBR })}
                              </span>
                              
                              {transaction.installment_number && transaction.installment_total && (
                                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                  {transaction.installment_number}/{transaction.installment_total}
                                </Badge>
                              )}
                              
                              {transaction.statement_id && (
                                <Badge variant="outline" className="text-xs px-2 py-0.5">
                                  Extrato
                                </Badge>
                              )}
                            </div>
                            
                            {/* Ações */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditTransaction(transaction);
                                }}
                                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteClick(transaction.id);
                                }}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
};

export default CategoryView;