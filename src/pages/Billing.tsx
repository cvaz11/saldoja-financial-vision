
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  Calendar, 
  Crown, 
  CheckCircle, 
  Download, 
  ArrowLeft,
  AlertCircle 
} from "lucide-react";

const Billing = () => {
  const navigate = useNavigate();
  const [showCardForm, setShowCardForm] = useState(false);

  const currentPlan = {
    name: "Plano Gratuito",
    description: "2 PDFs por mês",
    price: "R$ 0,00",
    nextBilling: null,
    status: "active"
  };

  const recentInvoices = [
    {
      id: "INV-001",
      date: "15 Nov 2024",
      amount: "R$ 17,90",
      status: "paid",
      description: "Plano Pro - Mensal"
    },
    {
      id: "INV-002", 
      date: "15 Out 2024",
      amount: "R$ 17,90",
      status: "paid",
      description: "Plano Pro - Mensal"
    }
  ];

  const paymentMethods = [
    {
      id: "1",
      type: "visa",
      last4: "4242",
      expiry: "12/25",
      isDefault: true
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard")}
            className="text-gray-600 hover:text-sage-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Faturamento</h1>
          <div></div>
        </nav>
      </header>

      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Plano Atual */}
          <Card className="border-sage-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-sage-600" />
                  Plano Atual
                </span>
                <Badge className={
                  currentPlan.status === 'active' 
                    ? "bg-green-100 text-green-700" 
                    : "bg-red-100 text-red-700"
                }>
                  {currentPlan.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              </CardTitle>
              <CardDescription>
                Gerencie sua assinatura e faturamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-sage-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-900">{currentPlan.name}</h3>
                  <p className="text-sm text-gray-600">{currentPlan.description}</p>
                  {currentPlan.nextBilling && (
                    <p className="text-xs text-gray-500 mt-1">
                      Próxima cobrança: {currentPlan.nextBilling}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{currentPlan.price}</p>
                  <p className="text-sm text-gray-600">por mês</p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Você está no plano gratuito. Faça upgrade para desbloquear todas as funcionalidades.
                </AlertDescription>
              </Alert>

              <div className="flex space-x-4">
                <Button 
                  className="bg-sage-600 hover:bg-sage-700"
                  onClick={() => navigate("/pricing")}
                >
                  Fazer Upgrade
                </Button>
                <Button variant="outline" className="border-sage-300 text-sage-700">
                  Alterar Plano
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Formas de Pagamento */}
          <Card className="border-sage-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-sage-600" />
                Formas de Pagamento
              </CardTitle>
              <CardDescription>
                Gerencie seus cartões e formas de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentMethods.length > 0 ? (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-4 border border-sage-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">VISA</span>
                        </div>
                        <div>
                          <p className="font-medium">•••• •••• •••• {method.last4}</p>
                          <p className="text-sm text-gray-600">Expira em {method.expiry}</p>
                        </div>
                        {method.isDefault && (
                          <Badge variant="secondary" className="bg-sage-100 text-sage-700">
                            Padrão
                          </Badge>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-300">
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma forma de pagamento cadastrada</p>
                </div>
              )}

              {!showCardForm ? (
                <Button 
                  variant="outline" 
                  onClick={() => setShowCardForm(true)}
                  className="w-full border-sage-300 text-sage-700"
                >
                  Adicionar Cartão
                </Button>
              ) : (
                <div className="border border-sage-200 rounded-lg p-4 space-y-4">
                  <h4 className="font-medium">Adicionar Novo Cartão</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="card-number">Número do Cartão</Label>
                      <Input 
                        id="card-number"
                        placeholder="1234 5678 9012 3456"
                        className="border-sage-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiry">Validade</Label>
                      <Input 
                        id="expiry"
                        placeholder="MM/AA"
                        className="border-sage-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input 
                        id="cvv"
                        placeholder="123"
                        className="border-sage-200"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="card-name">Nome no Cartão</Label>
                      <Input 
                        id="card-name"
                        placeholder="João Silva"
                        className="border-sage-200"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button className="bg-sage-600 hover:bg-sage-700">
                      Salvar Cartão
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCardForm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Faturas */}
          <Card className="border-sage-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-sage-600" />
                Histórico de Faturas
              </CardTitle>
              <CardDescription>
                Visualize e baixe suas faturas anteriores
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentInvoices.length > 0 ? (
                <div className="space-y-3">
                  {recentInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border border-sage-200 rounded-lg">
                      <div>
                        <p className="font-medium">{invoice.description}</p>
                        <p className="text-sm text-gray-600">{invoice.date}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-semibold">{invoice.amount}</p>
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span className="text-xs text-green-600">Pago</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma fatura encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Zona de Perigo */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700">Zona de Perigo</CardTitle>
              <CardDescription>
                Ações irreversíveis para sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-red-900">Cancelar Assinatura</h4>
                  <p className="text-sm text-red-600">
                    Cancele sua assinatura e perca acesso aos recursos premium
                  </p>
                </div>
                <Button variant="destructive">
                  Cancelar Assinatura
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Billing;
