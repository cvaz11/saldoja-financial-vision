
import { useState } from "react";
import { ChevronDown, Search, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

  const tabs = ["Todos", "Despesas", "Receitas", "Parcelas", "Categorias"];

  const getStatusBadge = (status: string) => {
    const statusColors = {
      "Pago": "bg-sage-100 text-sage-700",
      "Não Pago": "bg-red-100 text-red-700", 
      "Receita": "bg-blue-100 text-blue-700"
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

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header com abas */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab 
                    ? "bg-sage-100 text-sage-700" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Pesquisar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtro
            </Button>
            <Button onClick={onAddTransaction} className="bg-sage-300 hover:bg-sage-400 text-white">
              Adicionar Receita
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-sage-100">
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
            {transactions.map((transaction, index) => (
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
    </div>
  );
};

export default TransactionTable;
