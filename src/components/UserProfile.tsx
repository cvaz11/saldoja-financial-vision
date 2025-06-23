
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, CreditCard, Settings, LogOut, Edit, Crown } from "lucide-react";

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfile = ({ isOpen, onClose }: UserProfileProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-sage-600" />
            Perfil do Usuário
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Foto e Info Básica */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-sage-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">João Silva</h3>
              <p className="text-gray-600">joao@email.com</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-sage-100 text-sage-700 text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Plano Gratuito
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-sage-300">
              <Edit className="h-4 w-4" />
            </Button>
          </div>

          <Separator />

          {/* Informações da Conta */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Informações da Conta</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="profile-nome" className="text-sm">Nome</Label>
                <Input 
                  id="profile-nome"
                  defaultValue="João Silva" 
                  className="border-sage-200 focus:border-sage-400"
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="profile-telefone" className="text-sm">Telefone</Label>
                <Input 
                  id="profile-telefone"
                  defaultValue="(11) 99999-9999" 
                  className="border-sage-200 focus:border-sage-400"
                  readOnly
                />
              </div>
            </div>
            <div>
              <Label htmlFor="profile-email" className="text-sm">E-mail</Label>
              <Input 
                id="profile-email"
                defaultValue="joao@email.com" 
                className="border-sage-200 focus:border-sage-400"
                readOnly
              />
            </div>
          </div>

          <Separator />

          {/* Estatísticas */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Estatísticas da Conta</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-sage-50 rounded-lg">
                <p className="text-sm text-gray-600">PDFs processados</p>
                <p className="text-xl font-semibold text-sage-700">15</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Transações</p>
                <p className="text-xl font-semibold text-blue-700">324</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Economia</p>
                <p className="text-xl font-semibold text-green-700">R$ 450</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Membro desde</p>
                <p className="text-xl font-semibold text-purple-700">Nov/24</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Ações Rápidas */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Ações Rápidas</h4>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start border-sage-300 text-sage-700 hover:bg-sage-50"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Gerenciar Plano
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-sage-300 text-sage-700 hover:bg-sage-50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-red-300 text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair da Conta
              </Button>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex space-x-3 pt-4">
            <Button 
              onClick={onClose}
              variant="outline" 
              className="flex-1 border-sage-300"
            >
              Fechar
            </Button>
            <Button 
              className="flex-1 bg-sage-600 hover:bg-sage-700"
            >
              Editar Perfil
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfile;
