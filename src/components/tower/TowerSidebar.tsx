import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  TrendingUp, 
  UserCheck, 
  Settings,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export const TowerSidebar = () => {
  const { signOut } = useAuth();
  const location = useLocation();
  
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3, path: "/tower" },
    { id: "users", label: "Usuários", icon: Users, path: "/tower/users" },
    { id: "billing", label: "Receitas & Custos", icon: DollarSign, path: "/tower/billing" },
    { id: "analytics", label: "Analytics", icon: TrendingUp, path: "/tower/analytics" },
    { id: "team", label: "Equipe Admin", icon: UserCheck, path: "/tower/team" },
  ];

  return (
    <div className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Crown className="h-8 w-8 text-yellow-400" />
          <h1 className="text-xl font-bold text-white">Tower</h1>
        </div>
        <p className="text-sm text-slate-400 mt-1">Admin Control</p>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={cn(
                "w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors",
                isActive 
                  ? "bg-slate-800 text-white border-l-4 border-yellow-400" 
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <NavLink
          to="/dashboard"
          className="flex items-center text-slate-300 hover:text-white transition-colors mb-3"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span className="text-sm">Voltar ao App</span>
        </NavLink>
        <button 
          onClick={signOut}
          className="flex items-center text-slate-300 hover:text-white transition-colors"
        >
          <span className="mr-2">👤</span>
          <span className="text-sm">Sair</span>
        </button>
      </div>
    </div>
  );
};