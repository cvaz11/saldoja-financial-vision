import TowerMetricCard from '@/components/tower/TowerMetricCard';
import NavButton from '@/components/tower/NavButton';

export default function Tower() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Profissional */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                🏗️ Tower
                <span className="text-lg font-normal text-gray-500">Admin Dashboard</span>
              </h1>
              <p className="text-gray-600 mt-1">Gerenciamento da plataforma SaldoJá</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Última atualização</p>
                <p className="text-sm font-medium">Agora mesmo</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-8 py-8 max-w-7xl mx-auto">
        {/* Cards Elegantes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <TowerMetricCard
            title="Total de Usuários"
            value="Carregando..."
            icon="👥"
            bgColor="bg-blue-50"
            iconColor="text-blue-600"
            borderColor="border-blue-200"
          />
          <TowerMetricCard
            title="MRR"
            value="Carregando..."
            icon="💰"
            bgColor="bg-green-50"
            iconColor="text-green-600"
            borderColor="border-green-200"
          />
          <TowerMetricCard
            title="Usuários Ativos"
            value="Carregando..."
            icon="📊"
            bgColor="bg-purple-50"
            iconColor="text-purple-600"
            borderColor="border-purple-200"
          />
          <TowerMetricCard
            title="Receita Mensal"
            value="Carregando..."
            icon="📈"
            bgColor="bg-orange-50"
            iconColor="text-orange-600"
            borderColor="border-orange-200"
          />
        </div>

        {/* Navegação Moderna */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Navegação Rápida</h2>
          <div className="grid grid-cols-2 gap-4">
            <NavButton
              href="/tower/users"
              icon="👥"
              title="Gerenciar Usuários"
              description="Visualizar e gerenciar todos os usuários"
              bgColor="bg-blue-50"
              iconColor="text-blue-600"
            />
            <NavButton
              href="/tower/billing"
              icon="💰"
              title="Faturamento"
              description="Receitas, custos e analytics financeiros"
              bgColor="bg-green-50"
              iconColor="text-green-600"
            />
          </div>
        </div>
      </main>
    </div>
  );
}