
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, X, Crown, BarChart3, ArrowLeft } from "lucide-react";

const Pricing = () => {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Gratuito",
      description: "Perfeito para começar",
      price: isAnnual ? "R$ 0" : "R$ 0",
      period: "sempre",
      popular: false,
      features: [
        { text: "2 PDFs por mês", included: true },
        { text: "Painel básico de categorias", included: true },
        { text: "Análise de gastos por banco", included: true },
        { text: "Suporte por email", included: true },
        { text: "Projeção de parcelas", included: false },
        { text: "Alertas de assinatura", included: false },
        { text: "Exportar relatórios", included: false },
        { text: "Chat financeiro com IA", included: false },
      ],
      cta: "Começar Grátis",
      ctaVariant: "outline" as const
    },
    {
      name: "Pro",
      description: "Para quem quer controle total",
      price: isAnnual ? "R$ 14,90" : "R$ 17,90",
      period: "por mês",
      originalPrice: isAnnual ? "R$ 17,90" : null,
      popular: true,
      features: [
        { text: "PDFs ilimitados", included: true },
        { text: "Painel completo de análises", included: true },
        { text: "Projeção de parcelas futuras", included: true },
        { text: "Alertas inteligentes de assinatura", included: true },
        { text: "Categorização personalizada", included: true },
        { text: "Exportar relatórios em PDF/Excel", included: true },
        { text: "Chat financeiro com IA", included: true },
        { text: "Suporte prioritário", included: true },
      ],
      cta: "Começar Teste Grátis",
      ctaVariant: "default" as const
    }
  ];

  const annualSavings = "2 meses grátis";

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="text-gray-600 hover:text-sage-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-sage-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">SaldoJá</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/login")}
              className="text-gray-600 hover:text-sage-700"
            >
              Entrar
            </Button>
          </div>
        </nav>
      </header>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Escolha o plano ideal para você
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Comece grátis e faça upgrade quando precisar de mais funcionalidades
          </p>

          {/* Toggle Anual/Mensal */}
          <div className="flex items-center justify-center space-x-4 mb-12">
            <span className={`text-sm ${!isAnnual ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              Mensal
            </span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-sage-600"
            />
            <span className={`text-sm ${isAnnual ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              Anual
            </span>
            {isAnnual && (
              <Badge className="bg-green-100 text-green-700 ml-2">
                {annualSavings}
              </Badge>
            )}
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative border-2 ${
                plan.popular 
                  ? 'border-sage-400 shadow-xl scale-105' 
                  : 'border-sage-200 shadow-sm'
              } transition-all duration-300 hover:shadow-lg`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-sage-600 text-white px-4 py-1">
                    <Crown className="h-3 w-3 mr-1" />
                    Mais Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {plan.name}
                </CardTitle>
                <p className="text-gray-600">{plan.description}</p>
                
                <div className="py-4">
                  <div className="flex items-center justify-center space-x-2">
                    {plan.originalPrice && (
                      <span className="text-lg text-gray-400 line-through">
                        {plan.originalPrice}
                      </span>
                    )}
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">{plan.period}</p>
                  {isAnnual && plan.name === "Pro" && (
                    <p className="text-sm text-green-600 font-medium mt-2">
                      Economize R$ 35,80 por ano
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      {feature.included ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-gray-900' : 'text-gray-400'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className={`w-full py-3 ${
                    plan.ctaVariant === 'default' 
                      ? 'bg-sage-600 hover:bg-sage-700 text-white' 
                      : 'border-sage-300 text-sage-700 hover:bg-sage-50'
                  }`}
                  variant={plan.ctaVariant}
                  onClick={() => navigate("/signup")}
                >
                  {plan.cta}
                </Button>

                {plan.name === "Pro" && (
                  <p className="text-xs text-gray-500 text-center">
                    7 dias grátis, depois {plan.price} {plan.period}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Perguntas Frequentes
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-sage-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                Posso cancelar a qualquer momento?
              </h3>
              <p className="text-gray-600">
                Sim! Você pode cancelar sua assinatura a qualquer momento. Não há taxas de cancelamento ou penalidades.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-sage-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                O que acontece após o período gratuito?
              </h3>
              <p className="text-gray-600">
                Após os 7 dias grátis do plano Pro, você será cobrado automaticamente. Se não quiser continuar, pode cancelar antes do fim do período de teste.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-sage-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                Meus dados estão seguros?
              </h3>
              <p className="text-gray-600">
                Absolutamente! Utilizamos criptografia de nível bancário e seguimos as melhores práticas de segurança para proteger suas informações financeiras.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Final */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ainda tem dúvidas?
          </h2>
          <p className="text-gray-600 mb-6">
            Entre em contato conosco para uma demonstração personalizada
          </p>
          <Button 
            variant="outline"
            className="border-sage-300 text-sage-700 hover:bg-sage-50"
          >
            Falar com Especialista
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Pricing;
