import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import MobileMenuDrawer from "@/components/MobileMenuDrawer";
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
import { Upload, User, Menu } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("visao-geral");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [modalType, setModalType] = useState<"receita" | "despesa">("receita");

  // Set active section based on current route or state
  useEffect(() => {
    // Check if we have a specific section from navigation state
    if (location.state?.activeSection) {
      setActiveSection(location.state.activeSection);
      // Clear the location state to prevent staying on extratos
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.pathname === '/movimentacoes') {
      setActiveSection('movimentacoes');
    } else if (location.pathname === '/dashboard') {
      setActiveSection('visao-geral');
    }
  }, [location.pathname, location.state, navigate]);

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

  const handleNavigateToMovimentacoes = () => {
    console.log("Navigating to movimentacoes...");
    navigate('/movimentacoes');
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    if (section === 'movimentacoes') {
      navigate('/movimentacoes');
    } else if (section === 'visao-geral') {
      navigate('/dashboard');
    }
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
        
        {/* Enviar Extratos - Updated text and formats */}
        <div className="bg-gradient-to-br from-sage-100 to-sage-200 rounded-xl p-6 text-center shadow-sm flex flex-col justify-center min-h-[300px] lg:min-h-[400px] order-2">
          <Upload className="mx-auto h-12 w-12 lg:h-16 lg:w-16 text-sage-700 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2 text-lg lg:text-xl">Enviar Extratos</h3>
          <p className="text-sm text-gray-600 mb-6 lg:mb-8">Faça upload dos seus extratos em OFX, CSV ou Excel</p>
          <Button 
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-sage-600 hover:bg-sage-700 text-white shadow-md w-full py-3"
          >
            Upload Extrato
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
      {/* Transaction Table with DateRangePicker integrated */}
      <TransactionTable 
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
      <UploadSection onUpload={() => setIsUploadModalOpen(true)} onNavigateToMovimentacoes={handleNavigateToMovimentacoes} />
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
          <Sidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
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
        onSectionChange={handleSectionChange}
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
        onNavigateToMovimentacoes={handleNavigateToMovimentacoes}
      />

      <UserProfile
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};

export default Index;
