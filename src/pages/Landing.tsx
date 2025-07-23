import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  CheckCircle, 
  Star,
  Upload,
  FileText,
  TrendingUp,
  Shield,
  Users,
  Github
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: <Upload className="h-6 w-6" />,
    title: "Upload Automático",
    description: "Faça upload dos seus extratos bancários de forma simples e segura"
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: "Análise Inteligente",
    description: "Nossa IA categoriza e organiza suas transações automaticamente"
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: "Insights Financeiros",
    description: "Visualize seus gastos com gráficos e métricas detalhadas"
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Segurança Total",
    description: "Seus dados estão protegidos com criptografia de ponta"
  }
];

const testimonials = [
  {
    name: "Ana Silva",
    role: "Empresária",
    content: "O SaldoJá revolucionou a forma como gerencio minhas finanças. Economizo horas toda semana!",
    rating: 5
  },
  {
    name: "Carlos Santos",
    role: "Freelancer",
    content: "Finalmente consigo ter controle total dos meus gastos. A interface é muito intuitiva.",
    rating: 5
  },
  {
    name: "Maria Costa",
    role: "Contadora",
    content: "Recomendo para todos os meus clientes. A categorização automática é perfeita.",
    rating: 5
  }
];

const trustedCompanies = [
  "Empresa A", "Empresa B", "Empresa C", "Empresa D", "Empresa E", "Empresa F"
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold">S</span>
              </div>
              <span className="text-xl font-bold text-foreground">SaldoJá</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Recursos
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Preços
              </a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
                Sobre
              </a>
              <div className="flex items-center space-x-2">
                <Github className="h-4 w-4" />
                <span className="text-sm">1.2k</span>
              </div>
            </nav>

            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/login')}
                className="text-foreground hover:text-primary"
              >
                Entrar
              </Button>
              <Button 
                onClick={() => navigate('/login')}
                className="bg-primary hover:bg-secondary text-primary-foreground"
              >
                Cadastrar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Promotional Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center space-x-2 text-sm">
            <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
              ✨ Novo
            </Badge>
            <span className="text-foreground">
              Análise de parcelas automática disponível. 
              <button className="text-primary hover:underline ml-1 font-medium">
                Saiba mais
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
              O controle financeiro{" "}
              <span className="text-primary">rápido e confiável</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Transforme seus extratos bancários em insights poderosos. 
              Gerencie suas finanças com inteligência artificial.
            </p>
            
            {/* Demo Input */}
            <div className="max-w-md mx-auto mb-8">
              <div className="flex items-center space-x-2 bg-card border border-border rounded-lg p-2">
                <Input 
                  placeholder="exemplo@email.com" 
                  className="border-0 bg-transparent focus-visible:ring-0"
                />
                <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button 
              size="lg" 
              onClick={() => navigate('/login')}
              className="bg-foreground text-background hover:bg-foreground/90 text-base px-8 py-3"
            >
              Começar gratuitamente (500 créditos)
            </Button>
          </div>

          {/* Demo Visualization */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left side - Upload Demo */}
              <Card className="bg-card border-border shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-primary/20 rounded flex items-center justify-center">
                      <Upload className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <ArrowRight className="h-8 w-8 text-muted-foreground mx-auto lg:mx-0" />

              {/* Right side - Results Demo */}
              <Card className="bg-foreground text-background border-border shadow-lg">
                <CardContent className="p-6 font-mono text-sm">
                  <div className="text-primary mb-2">200 Response</div>
                  <div className="space-y-1">
                    <div>{"["}</div>
                    <div className="ml-4">{"{"}</div>
                    <div className="ml-8">"categoria": "Alimentação",</div>
                    <div className="ml-8">"valor": "R$ 45,80",</div>
                    <div className="ml-8">"data": "2024-01-15",</div>
                    <div className="ml-8">"parcelas": "1/1"</div>
                    <div className="ml-4">{"},"}</div>
                    <div className="ml-4">{"..."}</div>
                    <div>{"]"}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted Companies */}
      <section className="py-12 border-y border-border bg-card/30">
        <div className="container mx-auto px-4">
          <p className="text-center text-muted-foreground mb-8">
            Confiado por empresas líderes
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {trustedCompanies.map((company, index) => (
              <div key={index} className="text-muted-foreground font-medium">
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Como Funciona?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Três passos simples para ter controle total das suas finanças
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border border-border hover:shadow-lg transition-shadow bg-card/50">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <div className="text-primary">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              O que nossos usuários dizem
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Pronto para transformar suas finanças?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Junte-se a milhares de usuários que já descobriram uma nova forma de gerenciar dinheiro.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => navigate('/login')}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                Começar Agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-border"
              >
                Ver Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">S</span>
                </div>
                <span className="text-xl font-bold text-foreground">SaldoJá</span>
              </div>
              <p className="text-muted-foreground">
                Controle financeiro inteligente para todos.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Produto</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Recursos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Empresa</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Carreiras</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Suporte</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentação</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 SaldoJá. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}