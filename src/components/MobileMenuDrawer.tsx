
import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { BarChart3, Upload, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const MobileMenuDrawer = ({ isOpen, onClose, activeSection, onSectionChange }: MobileMenuDrawerProps) => {
  const menuItems = [
    { id: "visao-geral", label: "Visão Geral", icon: BarChart3 },
    { id: "extratos", label: "Extratos (upload)", icon: Upload },
    { id: "movimentacoes", label: "Movimentações", icon: TrendingUp },
    { id: "configuracoes", label: "Configurações", icon: Settings },
  ];

  const handleItemClick = (sectionId: string) => {
    onSectionChange(sectionId);
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-xl font-bold text-gray-900">SaldoJá</DrawerTitle>
        </DrawerHeader>
        
        <nav className="flex-1 px-4 pb-8 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={cn(
                  "w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors",
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
      </DrawerContent>
    </Drawer>
  );
};

export default MobileMenuDrawer;
