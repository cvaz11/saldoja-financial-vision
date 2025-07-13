import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import ConfiguracoesSidebar from "@/components/ConfiguracoesSidebar";

interface SettingsViewProps {
  onProfileClick: () => void;
}

const SettingsView = ({ onProfileClick }: SettingsViewProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Configurações</h1>
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
      <ConfiguracoesSidebar />
    </div>
  );
};

export default SettingsView;