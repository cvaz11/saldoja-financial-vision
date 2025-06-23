
import { useState } from "react";
import { ChevronDown, Search, Filter, ChevronRight, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import TransactionRowCard from "./TransactionRowCard";

interface Transaction {
  id: string;
  description: string;
  value: number;
  installment: string;
  category: string;
  bank: string;
  date: string;
  status: "Pago" | "Não Pago" | "Receita";
  notes?: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  onAddTransaction: () => void;
  showCategories?: boolean;
}

const TransactionTable = ({ transactions, onAddTransaction, showCategories = false }: TransactionTableProps) => {
  const [activeTab, setActiveTab] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const tabs = ["Todos", "Despesas", "Receitas", "Parcelas", "Categorias"];

  const getStatusBadge = (status: string) => {
    const statusColors = {
      "Pago": "bg-sage-100 text-sage-700",
      "Não Pago": "bg-orange-100 text-orange-700", 
      "Receita": "bg-sage-200 text-sage-800"
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors]}>
        {status}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2 
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.bank.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = () => {
      switch (activeTab) {
        case "Despesas":
          return transaction.value < 0;
        case "Receitas":
          return transaction.value > 0;
        case "Parcelas":
          return transaction.installment !== "À vista" && transaction.installment !== "";
        case "Categorias":
          return true;
        default:
          return true;
      }
    };

    return matchesSearch && matchesTab();
  });

  // Group by category when "Categorias" tab is active
  const groupedTransactions = activeTab === "Categorias" 
    ? filteredTransactions.reduce((groups, transaction) => {
        const category = transaction.category;
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(transaction);
        return groups;
      }, {} as Record<string, Transaction[]>)
    : null;

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header com abas */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex overflow-x-auto space-x-1 pb-2 md:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab 
                    ? "bg-sage-100 text-sage-700" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Pesquisar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Filter className="h-4 w-4 mr-2" />
                Filtro
              </Button>
              <Button onClick={onAddTransaction} className="bg-sage-300 hover:bg-sage-400 text-white flex-1 sm:flex-none">
                Adicionar Receita
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-hidden">
        {activeTab === "Categorias" && groupedTransactions ? (
          // Expandable categories view
          <div className="p-4 space-y-4">
            {Object.entries(groupedTransactions).map(([category, categoryTransactions]) => (
              <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full bg-sage-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between hover:bg-sage-100 transition-colors"
                >
                  <div className="flex items-center">
                    <h4 className="font-semibold text-gray-900 mr-2">{category}</h4>
                    <span className="text-sm text-gray-600">
                      ({categoryTransactions.length} transações)
                    </span>
                  </div>
                  {expandedCategories[category] ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                
                {expandedCategories[category] && (
                  <div className="p-4">
                    {/* Mobile view */}
                    <div className="block md:hidden space-y-3">
                      {categoryTransactions.map((transaction) => (
                        <TransactionRowCard key={transaction.id} transaction={transaction} />
                      ))}
                    </div>
                    
                    {/* Desktop table view */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left p-3 font-medium text-gray-700">Descrição</th>
                            <th className="text-left p-3 font-medium text-gray-700">Valor</th>
                            <th className="text-left p-3 font-medium text-gray-700">Parcela</th>
                            <th className="text-left p-3 font-medium text-gray-700">Banco</th>
                            <th className="text-left p-3 font-medium text-gray-700">Data</th>
                            <th className="text-left p-3 font-medium text-gray-700">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryTransactions.map((transaction, index) => (
                            <tr key={transaction.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="p-3">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-sage-100 rounded-full flex items-center justify-center mr-3">
                                    💳
                                  </div>
                                  {transaction.description}
                                </div>
                              </td>
                              <td className="p-3 font-medium">{formatCurrency(transaction.value)}</td>
                              <td className="p-3">{transaction.installment}</td>
                              <td className="p-3">{transaction.bank}</td>
                              <td className="p-3">{transaction.date}</td>
                              <td className="p-3">{getStatusBadge(transaction.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Mobile view - Card list */}
            <div className="block md:hidden p-4 space-y-3">
              {filteredTransactions.map((transaction) => (
                <TransactionRowCard key={transaction.id} transaction={transaction} />
              ))}
            </div>
            
            {/* Desktop view - Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-sage-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-700">
                      <input type="checkbox" className="mr-2" />
                      Descrição
                    </th>
                    <th className="text-left p-4 font-medium text-gray-700">
                      Valor <ChevronDown className="inline h-4 w-4" />
                    </th>
                    <th className="text-left p-4 font-medium text-gray-700">Parcela</th>
                    {showCategories && (
                      <th className="text-left p-4 font-medium text-gray-700">
                        Categorias <ChevronDown className="inline h-4 w-4" />
                      </th>
                    )}
                    <th className="text-left p-4 font-medium text-gray-700">
                      Banco <ChevronDown className="inline h-4 w-4" />
                    </th>
                    <th className="text-left p-4 font-medium text-gray-700">Informações</th>
                    <th className="text-left p-4 font-medium text-gray-700">
                      Data <ChevronDown className="inline h-4 w-4" />
                    </th>
                    <th className="text-left p-4 font-medium text-gray-700">
                      Status <ChevronDown className="inline h-4 w-4" />
                    </th>
                    <th className="text-left p-4 font-medium text-gray-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction, index) => (
                    <tr key={transaction.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-sage-100 rounded-full flex items-center justify-center mr-3">
                            💳
                          </div>
                          {transaction.description}
                        </div>
                      </td>
                      <td className="p-4 font-medium">{formatCurrency(transaction.value)}</td>
                      <td className="p-4">{transaction.installment}</td>
                      {showCategories && (
                        <td className="p-4">{transaction.category}</td>
                      )}
                      <td className="p-4">{transaction.bank}</td>
                      <td className="p-4 text-blue-600 cursor-pointer">Adicionar notas...</td>
                      <td className="p-4">{transaction.date}</td>
                      <td className="p-4">{getStatusBadge(transaction.status)}</td>
                      <td className="p-4">
                        <button className="text-gray-400 hover:text-gray-600">
                          ⋯
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TransactionTable;
