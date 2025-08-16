import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import MobileMenuDrawer from "@/components/MobileMenuDrawer";
import AddTransactionModal from "@/components/AddTransactionModal";
import UploadModal from "@/components/UploadModal";
import UserProfile from "@/components/UserProfile";
import DashboardView from "@/components/views/DashboardView";
import TransactionsView from "@/components/views/TransactionsView";
import StatementsView from "@/components/views/StatementsView";
import SettingsView from "@/components/views/SettingsView";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

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

  const handleAddIncome = () => {
    handleAddTransaction("receita");
  };

  const handleAddExpense = () => {
    handleAddTransaction("despesa");
  };

  const handleTransactionSubmit = (data: any) => {
    console.log("Transaction submitted:", data);
    setIsAddModalOpen(false);
  };

  const handleUploadSubmit = (data: any) => {
    console.log("Upload submitted:", data);
    setIsUploadModalOpen(false);
  };

  const handleUploadClick = () => {
    console.log("[UPLOAD] Opening upload modal");
    setIsUploadModalOpen(true);
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

  const renderContent = () => {
    switch (activeSection) {
      case "visao-geral":
        return (
          <DashboardView 
            onUploadClick={handleUploadClick}
            onProfileClick={() => setIsProfileOpen(true)}
          />
        );
      case "extratos":
        return (
          <StatementsView 
            onUploadClick={handleUploadClick}
            onProfileClick={() => setIsProfileOpen(true)}
            onNavigateToMovimentacoes={handleNavigateToMovimentacoes}
          />
        );
      case "movimentacoes":
        return (
          <TransactionsView 
            onAddTransaction={handleAddIncome}
            onProfileClick={() => setIsProfileOpen(true)}
            onRefresh={() => window.location.reload()}
          />
        );
      case "configuracoes":
        return (
          <SettingsView 
            onProfileClick={() => setIsProfileOpen(true)}
          />
        );
      default:
        return (
          <DashboardView 
            onUploadClick={handleUploadClick}
            onProfileClick={() => setIsProfileOpen(true)}
          />
        );
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
        onClose={() => {
          console.log("[UPLOAD] Closing upload modal");
          setIsUploadModalOpen(false);
        }}
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
