import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { TowerLayout } from '@/components/tower/TowerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  Users, 
  TrendingDown, 
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Tower() {
  const { isAdmin, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <TowerLayout>
      <div className="space-y-6">
        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 12.450</div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12.5% desde o mês passado
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">247</div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +8.2% desde o mês passado
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3.2%</div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingDown className="h-3 w-3 mr-1" />
                -0.5% desde o mês passado
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 18.750</div>
              <div className="flex items-center text-xs text-green-600">
                <TrendingUp className="h-3 w-3 mr-1" />
                +15.3% desde o mês passado
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas críticos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <span>Alertas Críticos</span>
            </CardTitle>
            <CardDescription>
              Itens que requerem atenção imediata
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="font-medium">Custo IA Alto</p>
                  <p className="text-sm text-muted-foreground">Processamento de PDFs acima do limite</p>
                </div>
              </div>
              <Badge variant="destructive">Crítico</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="font-medium">Falhas de Upload</p>
                  <p className="text-sm text-muted-foreground">3 usuários relataram problemas</p>
                </div>
              </div>
              <Badge variant="secondary">Atenção</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Últimos usuários cadastrados */}
        <Card>
          <CardHeader>
            <CardTitle>Últimos Usuários Cadastrados</CardTitle>
            <CardDescription>
              Novos usuários nas últimas 24 horas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Maria Silva", email: "maria@example.com", plan: "Pro", time: "2h atrás" },
                { name: "João Santos", email: "joao@example.com", plan: "Free", time: "4h atrás" },
                { name: "Ana Costa", email: "ana@example.com", plan: "Pro", time: "6h atrás" },
                { name: "Pedro Lima", email: "pedro@example.com", plan: "Free", time: "8h atrás" },
              ].map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={user.plan === "Pro" ? "default" : "secondary"}>
                      {user.plan}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{user.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status do sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Status do Sistema</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm">API Operacional</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm">Banco de Dados</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                <span className="text-sm">Processamento IA</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TowerLayout>
  );
}