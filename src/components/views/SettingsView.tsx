import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import ConfiguracoesSidebar from "@/components/ConfiguracoesSidebar";
import ProfileModal from "@/components/ProfileModal";

interface SettingsViewProps {
  onProfileClick?: () => void;
}

const SettingsView = ({ onProfileClick }: SettingsViewProps) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Configurações</h1>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleProfileClick}
          className="hover:bg-sage-50"
        >
          <User className="h-4 w-4 mr-0 sm:mr-2" />
          <span className="hidden sm:inline">Perfil</span>
        </Button>
      </div>
      <ConfiguracoesSidebar />
      
      <ProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default SettingsView;