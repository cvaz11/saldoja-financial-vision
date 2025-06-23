
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bell, CreditCard, Shield, User, Palette, Database, Trash2, Download } from "lucide-react";

const ConfiguracoesSidebar = () => {
  const [notificacoes, setNotificacoes] = useState(true);
  const [emailMarketing, setEmailMarketing] = useState(false);
  const [alertasParcelas, setAlertasParcelas] = useState(true);

  return (
    <div className="space-y-6">
      {/* Perfil do Usuário */}
      <Card className="border-sage-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-sage-600" />
            Perfil do Usuário
          </CardTitle>
          <CardDescription>
            Gerencie suas informações pessoais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nome">Nome completo</Label>
              <Input 
                id="nome" 
                defaultValue="João Silva" 
                className="border-sage-200 focus:border-sage-400"
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                defaultValue="joao@email.com" 
                className="border-sage-200 focus:border-sage-400"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input 
              id="telefone" 
              defaultValue="(11) 99999-9999" 
              className="border-sage-200 focus:border-sage-400"
            />
          </div>
          <Button className="bg-sage-600 hover:bg-sage-700">
            Salvar alterações
          </Button>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card className="border-sage-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-sage-600" />
            Notificações
          </CardTitle>
          <CardDescription>
            Configure como você quer receber alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notif-email">Notificações por e-mail</Label>
              <p className="text-sm text-gray-500">Receba alertas importantes por e-mail</p>
            </div>
            <Switch 
              id="notif-email"
              checked={notificacoes}
              onCheckedChange={setNotificacoes}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="marketing">E-mail marketing</Label>
              <p className="text-sm text-gray-500">Novidades e dicas financeiras</p>
            </div>
            <Switch 
              id="marketing"
              checked={emailMarketing}
              onCheckedChange={setEmailMarketing}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="parcelas">Alertas de parcelas</Label>
              <p className="text-sm text-gray-500">Aviso quando uma parcela vencer</p>
            </div>
            <Switch 
              id="parcelas"
              checked={alertasParcelas}
              onCheckedChange={setAlertasParcelas}
            />
          </div>
        </CardContent>
      </Card>

      {/* Categorias */}
      <Card className="border-sage-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-sage-600" />
            Categorias Personalizadas
          </CardTitle>
          <CardDescription>
            Gerencie suas categorias de gastos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-sage-100 text-sage-700">Mercado</Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">Restaurante</Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">Transporte</Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-700">Assinaturas</Badge>
            <Badge variant="secondary" className="bg-orange-100 text-orange-700">Eletrônicos</Badge>
          </div>
          <div className="flex gap-2">
            <Input 
              placeholder="Nova categoria..." 
              className="border-sage-200 focus:border-sage-400"
            />
            <Button variant="outline" className="border-sage-300 text-sage-700">
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plano e Faturamento */}
      <Card className="border-sage-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-sage-600" />
            Plano e Faturamento
          </CardTitle>
          <CardDescription>
            Gerencie sua assinatura
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-sage-50 rounded-lg">
            <div>
              <h4 className="font-medium">Plano Gratuito</h4>
              <p className="text-sm text-gray-600">2 PDFs por mês</p>
            </div>
            <Badge className="bg-sage-600 text-white">Ativo</Badge>
          </div>
          <Button className="w-full bg-sage-600 hover:bg-sage-700">
            Fazer upgrade para Pro
          </Button>
        </CardContent>
      </Card>

      {/* Dados e Privacidade */}
      <Card className="border-sage-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-sage-600" />
            Dados e Privacidade
          </CardTitle>
          <CardDescription>
            Controle seus dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full border-sage-300 text-sage-700">
            <Download className="h-4 w-4 mr-2" />
            Exportar meus dados
          </Button>
          <Separator />
          <Button variant="destructive" className="w-full">
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir conta
          </Button>
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card className="border-sage-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-sage-600" />
            Segurança
          </CardTitle>
          <CardDescription>
            Proteja sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full border-sage-300 text-sage-700">
            Alterar senha
          </Button>
          <Button variant="outline" className="w-full border-sage-300 text-sage-700">
            Configurar 2FA
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfiguracoesSidebar;
