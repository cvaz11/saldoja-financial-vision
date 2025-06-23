
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MetricCard from "@/components/MetricCard";
import TransactionTable from "@/components/TransactionTable";
import AddTransactionModal from "@/components/AddTransactionModal";
import UploadModal from "@/components/UploadModal";
import UploadSection from "@/components/UploadSection";
import CashFlowChart from "@/components/CashFlowChart";
import CategoryChart from "@/components/CategoryChart";
import BankPieChart from "@/components/BankPieChart";
import { Button } from "@/components/ui/button";
import { TrendingDown, DollarSign, CreditCard, TrendingUp, Upload } from "lucide-react";

const Index = () => {
  const [activeSection, setActiveSection] = useState("movimentacoes");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"receita" | "despesa">("receita");

  const sampleTransactions = [
    {
      id: "1",
      description: "Loja do 25",
      value: -11900.00,
      installment: "1/2",
      category: "Mercado",
      bank: "BancoInter",
      date: "20 de julho, 2028",
      status: "Pago" as const,
    },
    {
      id: "2", 
      description: "Ifood",
      value: -8900.00,
      installment: "1/2",
      category: "Restaurante",
      bank: "BancoInter",
      date: "20 de julho, 2028",
      status: "Não Pago" as const,
    },
    {
      id: "3",
      description: "Pix da empresa vv",
      value: 8900.00,
      installment: "",
      category: "Receita",
      bank: "BancoInter",
      date: "20 de julho, 2028",
      status: "Receita" as const,
    },
    {
      id: "4",
      description: "Asdfsadfasdfsda",
      value: -8900.00,
      installment: "09/10",
      category: "Restaurante",
      bank: "BancoInter",
      date: "20 de julho, 2028",
      status: "Pago" as const,
    },
  ];

  const handleAddTransaction = (type: "receita" | "despesa") => {
    setModalType(type);
    setIsAddModalOpen(true);
  };

  const handleTransactionSubmit = (data: any) => {
    console.log("Transaction submitted:", data);
  };

  const handleUploadSubmit = (data: any) => {
    console.log("Upload submitted:", data);
  };

  const renderVisaoGeral = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            🔄
          </Button>
          <Button variant="outline" size="sm">
            D
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total de Despesas no Mês"
          value="R$11.060,54"
          previousValue="R$8.500,10"
          trend="down"
          percentage="8.20%"
          icon={<TrendingDown className="h-6 w-6 text-sage-600" />}
          color="green"
        />
        <MetricCard
          title="Total de Receitas no Mês"
          value="R$12.400,00"
          previousValue="R$13.800,00"
          trend="up"
          percentage="2.20%"
          icon={<DollarSign className="h-6 w-6 text-blue-600" />}
          color="blue"
        />
        <MetricCard
          title="Resultado do Mês"
          value="R$1.100,00"
          previousValue="R$2.750,00"
          trend="down"
          percentage="13.95%"
          icon={<TrendingUp className="h-6 w-6 text-red-600" />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Parcelas do Mês"
          value="R$11.060,54"
          previousValue="R$8.500,10"
          trend="down"
          percentage="8.20%"
          icon={<CreditCard className="h-6 w-6 text-sage-600" />}
          color="green"
        />
        <MetricCard
          title="Parcelas do Próximo Mês"
          value="R$12.400,00"
          previousValue="R$13.800,00"
          trend="up"
          percentage="2.20%"
          icon={<CreditCard className="h-6 w-6 text-blue-600" />}
          color="blue"
        />
        <MetricCard
          title="Total de Parcelas"
          value="R$1.100,00"
          previousValue="R$2.750,00"
          trend="down"
          percentage="13.92%"
          icon={<TrendingUp className="h-6 w-6 text-red-600" />}
          color="red"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CashFlowChart />
        </div>
        <div className="space-y-6">
          <div className="bg-sage-100 rounded-lg p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-sage-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Enviar Extratos</h3>
            <Button 
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-sage-300 hover:bg-sage-400 text-white"
            >
              Upload
            </Button>
          </div>
          <BankPieChart />
        </div>
      </div>

      <CategoryChart />
    </div>
  );

  const renderMovimentacoes = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Movimentações</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            🔄
          </Button>
          <Button variant="outline" size="sm">
            D
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total de Despesas no Mês"
          value="R$11.060,54"
          previousValue="R$8.500,10"
          trend="down"
          percentage="8.20%"
          icon={<TrendingDown className="h-6 w-6 text-sage-600" />}
          color="green"
        />
        <MetricCard
          title="Total de Receitas no Mês"
          value="R$12.400,00"
          previousValue="R$13.800,00"
          trend="up"
          percentage="2.20%"
          icon={<DollarSign className="h-6 w-6 text-blue-600" />}
          color="blue"
        />
        <MetricCard
          title="Resultado do Mês"
          value="R$1.100,00"
          previousValue="R$2.750,00"
          trend="down"
          percentage="13.95%"
          icon={<TrendingUp className="h-6 w-6 text-red-600" />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Parcelas do Mês"
          value="R$11.060,54"
          previousValue="R$8.500,10"
          trend="down"
          percentage="8.20%"
          icon={<CreditCard className="h-6 w-6 text-sage-600" />}
          color="green"
        />
        <MetricCard
          title="Parcelas do Próximo Mês"
          value="R$12.400,00"
          previousValue="R$13.800,00"
          trend="up"
          percentage="2.20%"
          icon={<CreditCard className="h-6 w-6 text-blue-600" />}
          color="blue"
        />
        <MetricCard
          title="Total de Parcelas"
          value="R$1.100,00"
          previousValue="R$2.750,00"
          trend="down"
          percentage="13.92%"
          icon={<TrendingUp className="h-6 w-6 text-red-600" />}
          color="red"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button 
          onClick={() => handleAddTransaction("receita")}
          className="bg-sage-300 hover:bg-sage-400 text-white"
        >
          Adicionar Receita
        </Button>
        <Button 
          onClick={() => handleAddTransaction("despesa")}
          variant="outline"
        >
          Adicionar Despesa
        </Button>
      </div>

      {/* Transaction Table */}
      <TransactionTable 
        transactions={sampleTransactions}
        onAddTransaction={() => handleAddTransaction("receita")}
        showCategories={true}
      />
    </div>
  );

  const renderExtratos = () => (
    <UploadSection onUpload={() => setIsUploadModalOpen(true)} />
  );

  const renderConfiguracoes = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-600">Configurações em desenvolvimento...</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "visao-geral":
        return renderVisaoGeral();
      case "extratos":
        return renderExtratos();
      case "movimentacoes":
        return renderMovimentacoes();
      case "configuracoes":
        return renderConfiguracoes();
      default:
        return renderMovimentacoes();
    }
  };

  return (
    <div className="flex h-screen bg-neutral-bg">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <main className="flex-1 overflow-auto p-8">
        {renderContent()}
      </main>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleTransactionSubmit}
        type={modalType}
      />

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmit={handleUploadSubmit}
      />
    </div>
  );
};

export default Index;
