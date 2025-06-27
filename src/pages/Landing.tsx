import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Upload, BarChart3, Bell, Star, ArrowRight, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirecionar usuário autenticado para dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sage-600"></div>
      </div>
    );
  }

  // Se usuário está logado, não mostrar landing page
  if (user) {
    return null;
  }

  const features = [
    {
      icon: Upload,
      title: "Upload Automático",
      description: "Envie seu extrato em PDF e deixe nossa IA fazer todo o trabalho"
    },
    {
      icon: BarChart3,
      title: "Análise Inteligente",
      description: "Categorização automática e insights sobre seus gastos"
    },
    {
      icon: Bell,
      title: "Alertas Inteligentes",
      description: "Nunca mais esqueça de uma parcela ou assinatura"
    }
  ];

  const testimonials = [
    {
      name: "Maria Silva",
      role: "Designer",
      content: "Finalmente acabei com o trabalho chato das planilhas! O SaldoJá me dá uma visão clara dos meus gastos em segundos.",
      rating: 5
    },
    {
      name: "João Santos",
      role: "Desenvolvedor",
      content: "A categorização automática é incrível. Descobri gastos que nem lembrava que tinha.",
      rating: 5
    },
    {
      name: "Ana Costa",
      role: "Arquiteta",
      content: "Os alertas de parcelas me ajudaram a economizar muito dinheiro. Recomendo!",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-sage-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">SaldoJá</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/login")}
              className="text-gray-600 hover:text-sage-700"
            >
              Entrar
            </Button>
            <Button 
              onClick={() => navigate("/pricing")}
              className="bg-sage-600 hover:bg-sage-700 text-white"
            >
              Começar Grátis
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Acabe com o trabalho chato das 
            <span className="text-sage-600"> planilhas</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Envie seu extrato em PDF e receba, em segundos, um painel claro de categorias, 
            parcelas e gastos por banco. Simples assim.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg"
              onClick={() => navigate("/signup")}
              className="bg-sage-600 hover:bg-sage-700 text-white px-8 py-3 text-lg"
            >
              Teste Grátis por 7 Dias
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-sage-300 text-sage-700 hover:bg-sage-50 px-8 py-3 text-lg"
            >
              <Play className="mr-2 h-5 w-5" />
              Ver Demo
            </Button>
          </div>

          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Sem cartão de crédito
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Setup em 2 minutos
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Cancele quando quiser
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Como funciona?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Em apenas 3 passos simples você tem controle total das suas finanças
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="border-sage-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="h-8 w-8 text-sage-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Prova Social */}
      <section className="bg-sage-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Mais de 1.000 pessoas já organizaram suas finanças
            </h2>
            <p className="text-xl text-gray-600">
              Veja o que nossos usuários estão dizendo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-sage-200">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Pronto para organizar suas finanças?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Junte-se a milhares de pessoas que já simplificaram sua vida financeira
          </p>
          <Button 
            size="lg"
            onClick={() => navigate("/signup")}
            className="bg-sage-600 hover:bg-sage-700 text-white px-8 py-3 text-lg"
          >
            Começar Agora - É Grátis
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-sage-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">SaldoJá</span>
              </div>
              <p className="text-gray-400">
                Gestão financeira inteligente para jovens profissionais.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Funcionalidades</a></li>
                <li><a href="#" className="hover:text-white">Preços</a></li>
                <li><a href="#" className="hover:text-white">Segurança</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white">Contato</a></li>
                <li><a href="#" className="hover:text-white">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Sobre</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Carreiras</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SaldoJá. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
