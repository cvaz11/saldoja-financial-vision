import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import TransactionTable from "@/components/TransactionTable";

interface TransactionsViewProps {
  onAddTransaction: () => void;
  onProfileClick: () => void;
  onRefresh?: () => void;
}

const TransactionsView = ({ onAddTransaction, onProfileClick, onRefresh }: TransactionsViewProps) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Movimentações</h1>
          {import.meta.env.DEV && (
            <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
              Competência por Extrato
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="hover:bg-sage-50 hidden sm:flex"
            onClick={onRefresh}
          >
            🔄 Atualizar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onProfileClick}
            className="hover:bg-sage-50"
          >
            <User className="h-4 w-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Perfil</span>
          </Button>
        </div>
      </div>

      {/* Transaction Table with unified handlers */}
      <TransactionTable 
        onAddTransaction={onAddTransaction}
        showCategories={true}
        onRefresh={onRefresh}
      />
    </div>
  );
};

export default TransactionsView;