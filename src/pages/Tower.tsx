import TowerMetricCard from '@/components/tower/TowerMetricCard';
import NavButton from '@/components/tower/NavButton';
import MRRCard from '@/components/tower/MRRCard';

export default function Tower() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Moderno com Gradiente */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-2xl">
        <div className="px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                🏗️ Tower
                <span className="text-xl font-normal opacity-80">Admin Dashboard</span>
              </h1>
              <p className="opacity-90 mt-2">Gerenciamento completo da plataforma SaldoJá</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
              <p className="text-sm opacity-80">Status do Sistema</p>
              <div className="flex items-center gap-2 mt-1 justify-center">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Operacional</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-8 py-8 max-w-7xl mx-auto">
        {/* Cards Elegantes com gradientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 -mt-8 relative z-10">
          <TowerMetricCard
            title="Total de Usuários"
            value="Carregando..."
            icon="👥"
            color="blue"
            trend="↗ +5.2%"
          />
          
          {/* Card MRR especial com gráfico */}
          <MRRCard />
          
          <TowerMetricCard
            title="Usuários Ativos"
            value="Carregando..."
            icon="📊"
            color="purple"
            trend="↗ +8.1%"
          />
          
          <TowerMetricCard
            title="Receita Mensal"
            value="Carregando..."
            icon="📈"
            color="orange"
            trend="↗ +15.3%"
          />
        </div>

        {/* Navegação Moderna */}
        <div className="bg-white rounded-xl shadow-lg border p-8 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Navegação Rápida</h2>
          <p className="text-gray-600 mb-6">Acesse rapidamente as principais funcionalidades</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NavButton
              href="/tower/users"
              icon="👥"
              title="Gerenciar Usuários"
              description="Visualizar, editar e gerenciar todos os usuários da plataforma"
              bgGradient="from-blue-50 to-blue-100"
              iconBg="bg-blue-500"
              hoverColor="hover:border-blue-300"
            />
            
            <NavButton
              href="/tower/billing"
              icon="💰"
              title="Faturamento"
              description="Receitas, custos, analytics financeiros e métricas de negócio"
              bgGradient="from-green-50 to-green-100"
              iconBg="bg-green-500"
              hoverColor="hover:border-green-300"
            />
          </div>
        </div>
      </main>
    </div>
  );
}