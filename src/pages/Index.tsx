
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileMenuDrawer from "@/components/MobileMenuDrawer";
import MetricCard from "@/components/MetricCard";
import TransactionTable from "@/components/TransactionTable";
import AddTransactionModal from "@/components/AddTransactionModal";
import UploadModal from "@/components/UploadModal";
import UploadSection from "@/components/UploadSection";
import CashFlowChart from "@/components/CashFlowChart";
import CategoryChart from "@/components/CategoryChart";
import BankPieChart from "@/components/BankPieChart";
import ConfiguracoesSidebar from "@/components/ConfiguracoesSidebar";
import UserProfile from "@/components/UserProfile";
import { Button } from "@/components/ui/button";
import { TrendingDown, DollarSign, CreditCard, TrendingUp, Upload, User, Menu } from "lucide-react";

const Index = () => {
  const [activeSection, setActiveSection] = useState("visao-geral");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [modalType, setModalType] = useState<"receita" | "despesa">("receita");

  const sampleTransactions = [
    {
      id: "1",
      description: "Supermercado Pão de Açúcar",
      value: -328.50,
      installment: "À vista",
      category: "Mercado",
      bank: "Nubank",
      date: "15 de dezembro, 2024",
      status: "Pago" as const,
    },
    {
      id: "2", 
      description: "iFood - Burger King",
      value: -45.90,
      installment: "À vista",
      category: "Restaurante",
      bank: "Inter",
      date: "14 de dezembro, 2024",
      status: "Pago" as const,
    },
    {
      id: "3",
      description: "Salário - Empresa XYZ",
      value: 5500.00,
      installment: "",
      category: "Salário",
      bank: "Santander",
      date: "05 de dezembro, 2024",
      status: "Receita" as const,
    },
    {
      id: "4",
      description: "Netflix",
      value: -39.90,
      installment: "Mensal",
      category: "Assinaturas",
      bank: "C6 Bank",
      date: "10 de dezembro, 2024",
      status: "Pago" as const,
    },
    {
      id: "5",
      description: "Uber",
      value: -28.40,
      installment: "À vista",
      category: "Transporte",
      bank: "Nubank",
      date: "13 de dezembro, 2024",
      status: "Pago" as const,
    },
    {
      id: "6",
      description: "Amazon Prime",
      value: -14.90,
      installment: "Mensal",
      category: "Assinaturas",
      bank: "Inter",
      date: "08 de dezembro, 2024",
      status: "Pago" as const,
    },
    {
      id: "7",
      description: "Freelance - Design",
      value: 800.00,
      installment: "",
      category: "Freelance",
      bank: "Nubank",
      date: "12 de dezembro, 2024",
      status: "Receita" as const,
    },
    {
      id: "8",
      description: "iPhone 15 Pro",
      value: -612.50,
      installment: "10/12",
      category: "Eletrônicos",
      bank: "Santander",
      date: "01 de dezembro, 2024",
      status: "Não Pago" as const,
    },
  ];

  const handleAddTransaction = (type: "receita" | "despesa") => {
    setModalType(type);
    setIsAddModalOpen(true);
  };

  const handleTransactionSubmit = (data: any) => {
    console.log("Transaction submitted:", data);
    setIsAddModalOpen(false);
  };

  const handleUploadSubmit = (data: any) => {
    console.log("Upload submitted:", data);
    setIsUploadModalOpen(false);
  };

  const renderVisaoGeral = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Visão Geral</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="hover:bg-sage-50 hidden sm:flex">
            🔄 Atualizar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsProfileOpen(true)}
            className="hover:bg-sage-50"
          >
            <User className="h-4 w-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Perfil</span>
          </Button>
        </div>
      </div>

      {/* Layout - Mobile first, then responsive */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        {/* Fluxo de Caixa - Full width on mobile, 2 cols on desktop */}
        <div className="lg:col-span-2 order-1">
          <CashFlowChart />
        </div>
        
        {/* Enviar Extratos - Fixed height and proper proportions */}
        <div className="bg-gradient-to-br from-sage-100 to-sage-200 rounded-xl p-6 text-center shadow-sm flex flex-col justify-center min-h-[300px] lg:min-h-[400px] order-2">
          <Upload className="mx-auto h-12 w-12 lg:h-16 lg:w-16 text-sage-700 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2 text-lg lg:text-xl">Enviar Extratos</h3>
          <p className="text-sm text-gray-600 mb-6 lg:mb-8">Faça upload dos seus extratos em PDF</p>
          <Button 
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-sage-600 hover:bg-sage-700 text-white shadow-md w-full py-3"
          >
            Upload PDF
          </Button>
        </div>
      </div>

      {/* Segunda linha - Responsive grid */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        {/* Gastos por categoria - Full width on mobile, 2 cols on desktop */}
        <div className="lg:col-span-2 order-3 lg:order-1">
          <CategoryChart />
        </div>
        
        {/* Bancos - Full width on mobile, 1 col on desktop */}
        <div className="order-4 lg:order-2">
          <BankPieChart />
        </div>
      </div>
    </div>
  );

  const renderMovimentacoes = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Movimentações</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" className="hover:bg-sage-50 hidden sm:flex">
            🔄 Atualizar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsProfileOpen(true)}
            className="hover:bg-sage-50"
          >
            <User className="h-4 w-4 mr-0 sm:mr-2" />
            <span className="hidden sm:inline">Perfil</span>
          </Button>
        </div>
      </div>

      {/* Metrics Cards - Stack on mobile, grid on desktop - Using only project colors */}
      <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <MetricCard
          title="Total de Despesas no Mês"
          value="R$ 1.069,54"
          previousValue="R$ 985,30"
          trend="up"
          percentage="8.55%"
          icon={<TrendingDown className="h-6 w-6 text-sage-600" />}
          color="green"
        />
        <MetricCard
          title="Total de Receitas no Mês"
          value="R$ 6.300,00"
          previousValue="R$ 5.500,00"
          trend="up"
          percentage="14.55%"
          icon={<DollarSign className="h-6 w-6 text-sage-600" />}
          color="green"
        />
        <MetricCard
          title="Resultado do Mês"
          value="R$ 5.230,46"
          previousValue="R$ 4.514,70"
          trend="up"
          percentage="15.87%"
          icon={<TrendingUp className="h-6 w-6 text-sage-600" />}
          color="green"
        />
      </div>

      <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <MetricCard
          title="Parcelas do Mês"
          value="R$ 652,40"
          previousValue="R$ 612,50"
          trend="up"
          percentage="6.51%"
          icon={<CreditCard className="h-6 w-6 text-sage-600" />}
          color="green"
        />
        <MetricCard
          title="Parcelas do Próximo Mês"
          value="R$ 692,30"
          previousValue="R$ 652,40"
          trend="up"
          percentage="6.11%"
          icon={<CreditCard className="h-6 w-6 text-sage-600" />}
          color="green"
        />
        <MetricCard
          title="Total de Parcelas"
          value="R$ 7.236,80"
          previousValue="R$ 6.850,20"
          trend="up"
          percentage="5.64%"
          icon={<TrendingUp className="h-6 w-6 text-sage-600" />}
          color="green"
        />
      </div>

      {/* Action Buttons - Stack on mobile */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
        <Button 
          onClick={() => handleAddTransaction("receita")}
          className="bg-sage-600 hover:bg-sage-700 text-white shadow-md"
        >
          Adicionar Receita
        </Button>
        <Button 
          onClick={() => handleAddTransaction("despesa")}
          variant="outline"
          className="border-sage-300 text-sage-700 hover:bg-sage-50"
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Extratos</h1>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsProfileOpen(true)}
          className="hover:bg-sage-50"
        >
          <User className="h-4 w-4 mr-0 sm:mr-2" />
          <span className="hidden sm:inline">Perfil</span>
        </Button>
      </div>
      <UploadSection onUpload={() => setIsUploadModalOpen(true)} />
    </div>
  );

  const renderConfiguracoes = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Configurações</h1>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsProfileOpen(true)}
          className="hover:bg-sage-50"
        >
          <User className="h-4 w-4 mr-0 sm:mr-2" />
          <span className="hidden sm:inline">Perfil</span>
        </Button>
      </div>
      <ConfiguracoesSidebar />
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
        return renderVisaoGeral();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-bg">
      {/* Mobile hamburger menu */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(true)}
          className="bg-white shadow-md"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex w-full">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 pt-16 md:pt-8">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Menu Drawer */}
      <MobileMenuDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

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

      <UserProfile
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};

export default Index;
