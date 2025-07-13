import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import UploadSection from "@/components/UploadSection";

interface StatementsViewProps {
  onUploadClick: () => void;
  onProfileClick: () => void;
  onNavigateToMovimentacoes: () => void;
}

const StatementsView = ({ onUploadClick, onProfileClick, onNavigateToMovimentacoes }: StatementsViewProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Extratos</h1>
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
      <UploadSection onUpload={onUploadClick} onNavigateToMovimentacoes={onNavigateToMovimentacoes} />
    </div>
  );
};

export default StatementsView;