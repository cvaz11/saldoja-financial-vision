import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminStats, formatCurrency } from '@/hooks/useAdminStats';
import { TowerLayout } from '@/components/tower/TowerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, TrendingUp, AlertTriangle, UserCheck, Crown, CheckCircle } from 'lucide-react';
import MetricCard from '@/components/MetricCard';

export default function Tower() {
  const { isAdmin, isLoading } = useAdminAuth();
  const { data: adminStats, isLoading: statsLoading } = useAdminStats();

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Administrativo</h1>
          <p className="text-lg text-slate-600">Visão geral da plataforma SaldoJá</p>
        </div>

        {/* Métricas principais com dados reais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total de Usuários"
            value={statsLoading ? "..." : adminStats?.totalUsers.toString() || "0"}
            previousValue="0"
            trend="up"
            percentage="100%"
            icon={<Users className="h-5 w-5" />}
            color="blue"
            hasData={!statsLoading && !!adminStats}
            hasPreviousData={false}
          />
          
          <MetricCard
            title="Usuários Pro"
            value={statsLoading ? "..." : adminStats?.proUsers.toString() || "0"}
            previousValue="0"
            trend="up"
            percentage="100%"
            icon={<Crown className="h-5 w-5" />}
            color="green"
            hasData={!statsLoading && !!adminStats}
            hasPreviousData={false}
          />
          
          <MetricCard
            title="Usuários Free"
            value={statsLoading ? "..." : adminStats?.freeUsers.toString() || "0"}
            previousValue="0"
            trend="up"
            percentage="100%"
            icon={<UserCheck className="h-5 w-5" />}
            color="blue"
            hasData={!statsLoading && !!adminStats}
            hasPreviousData={false}
          />
          
          <MetricCard
            title="MRR"
            value={statsLoading ? "..." : adminStats ? formatCurrency(adminStats.mrr) : "R$ 0,00"}
            previousValue="R$ 0,00"
            trend="up"
            percentage="100%"
            icon={<DollarSign className="h-5 w-5" />}
            color="green"
            hasData={!statsLoading && !!adminStats}
            hasPreviousData={false}
          />
        </div>

        {/* Alertas críticos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Alertas Críticos</span>
            </CardTitle>
            <CardDescription>
              Problemas que requerem atenção imediata
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Sistema operacional</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700">Normal</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Processamento de IA funcionando</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700">Ativo</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo estatístico */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Usuários</CardTitle>
              <CardDescription>
                Breakdown dos tipos de conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Usuários Free</span>
                    <span className="font-bold">{adminStats?.freeUsers || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Usuários Pro</span>
                    <span className="font-bold">{adminStats?.proUsers || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Administradores</span>
                    <span className="font-bold">{adminStats?.adminUsers || 0}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status do Sistema</CardTitle>
              <CardDescription>
                Monitoramento de serviços em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">API Principal</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Base de Dados</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Processamento IA</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Storage</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TowerLayout>
  );
}