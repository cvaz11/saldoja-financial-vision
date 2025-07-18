
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CreditCard, Shield, User, Palette, Database, Trash2, Download, X } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useCategories } from "@/hooks/useCategories";
import { PasswordChangeDialog } from "@/components/dialogs/PasswordChangeDialog";
import { TwoFactorDialog } from "@/components/dialogs/TwoFactorDialog";
import { DeleteAccountDialog } from "@/components/dialogs/DeleteAccountDialog";
import { useToast } from "@/hooks/use-toast";

const ConfiguracoesSidebar = () => {
  const { profile, updateProfile, deleteAccount, exportData, isLoading } = useUserProfile();
  const { categories, addCategory, removeCategory } = useCategories();
  const { toast } = useToast();

  // Form states
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [newCategory, setNewCategory] = useState("");

  // Dialog states
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Notification states
  const [notificacoes, setNotificacoes] = useState(profile?.notifications_email ?? true);
  const [emailMarketing, setEmailMarketing] = useState(profile?.email_marketing ?? false);
  const [alertasParcelas, setAlertasParcelas] = useState(profile?.installment_alerts ?? true);

  const handleSaveProfile = () => {
    const updates = {
      full_name: fullName,
      email: email,
      phone: phone,
      notifications_email: notificacoes,
      email_marketing: emailMarketing,
      installment_alerts: alertasParcelas,
    };
    
    updateProfile(updates);
  };

  const handleAddCategory = () => {
    if (addCategory(newCategory)) {
      setNewCategory("");
    }
  };

  const handleUpgrade = () => {
    toast({
      title: "Upgrade para Pro",
      description: "Funcionalidade de upgrade será implementada em breve",
    });
  };

  if (isLoading) {
    return <div className="p-6">Carregando...</div>;
  }

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
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
                className="border-sage-200 focus:border-sage-400"
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="border-sage-200 focus:border-sage-400"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Input 
              id="telefone" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="border-sage-200 focus:border-sage-400"
            />
          </div>
          <Button 
            onClick={handleSaveProfile}
            className="bg-sage-600 hover:bg-sage-700"
          >
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
              onCheckedChange={(checked) => {
                setNotificacoes(checked);
                updateProfile({ notifications_email: checked });
              }}
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
              onCheckedChange={(checked) => {
                setEmailMarketing(checked);
                updateProfile({ email_marketing: checked });
              }}
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
              onCheckedChange={(checked) => {
                setAlertasParcelas(checked);
                updateProfile({ installment_alerts: checked });
              }}
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
            {categories.map((category) => (
              <Badge 
                key={category.name} 
                variant="secondary" 
                className={`${category.color} relative group cursor-pointer`}
              >
                {category.name}
                <X 
                  className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeCategory(category.name)}
                />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input 
              placeholder="Nova categoria..." 
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              className="border-sage-200 focus:border-sage-400"
            />
            <Button 
              variant="outline" 
              onClick={handleAddCategory}
              className="border-sage-300 text-sage-700"
            >
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
              <h4 className="font-medium">Plano {profile?.plan === 'free' ? 'Gratuito' : 'Pro'}</h4>
              <p className="text-sm text-gray-600">
                {profile?.pdf_uploads_this_month || 0} PDFs por mês
              </p>
            </div>
            <Badge className="bg-sage-600 text-white">Ativo</Badge>
          </div>
          <Button 
            onClick={handleUpgrade}
            className="w-full bg-sage-600 hover:bg-sage-700"
          >
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
          <Button 
            variant="outline" 
            onClick={exportData}
            className="w-full border-sage-300 text-sage-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar meus dados
          </Button>
          <Separator />
          <Button 
            variant="destructive" 
            onClick={() => setDeleteDialogOpen(true)}
            className="w-full"
          >
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
          <Button 
            variant="outline" 
            onClick={() => setPasswordDialogOpen(true)}
            className="w-full border-sage-300 text-sage-700"
          >
            Alterar senha
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setTwoFactorDialogOpen(true)}
            className="w-full border-sage-300 text-sage-700"
          >
            Configurar 2FA
          </Button>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PasswordChangeDialog 
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
      
      <TwoFactorDialog 
        open={twoFactorDialogOpen}
        onOpenChange={setTwoFactorDialogOpen}
      />
      
      <DeleteAccountDialog 
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={deleteAccount}
      />
    </div>
  );
};

export default ConfiguracoesSidebar;
