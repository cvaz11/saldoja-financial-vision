
import { useState } from "react";
import { BarChart3, FileText, TrendingUp, Settings, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar = ({ activeSection, onSectionChange }: SidebarProps) => {
  const { signOut } = useAuth();
  
  const menuItems = [
    { id: "visao-geral", label: "Visão Geral", icon: BarChart3 },
    { id: "extratos", label: "Extratos (upload)", icon: Upload },
    { id: "movimentacoes", label: "Movimentações", icon: TrendingUp },
    { id: "configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">SaldoJá</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors",
                isActive 
                  ? "bg-sage-100 text-sage-700 border-l-4 border-sage-300" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <button 
          onClick={signOut}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span className="mr-2">👤</span>
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
