import { Bell, Shield, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const TowerHeader = () => {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-600">Controle administrativo do SaldoJá</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Alertas críticos */}
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
              2 Alertas
            </Badge>
          </div>
          
          {/* Notificações */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500">
              3
            </Badge>
          </Button>
          
          {/* Status de segurança */}
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-500" />
            <span className="text-sm text-slate-600">Sistema Seguro</span>
          </div>
        </div>
      </div>
    </header>
  );
};