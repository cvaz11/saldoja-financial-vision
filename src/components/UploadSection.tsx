
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import PostUploadDialog from "./PostUploadDialog";

interface UploadSectionProps {
  onUpload: () => void;
  onNavigateToMovimentacoes?: () => void;
}

const UploadSection = ({ onUpload, onNavigateToMovimentacoes }: UploadSectionProps) => {
  const { user } = useAuth();
  const [showPostUploadDialog, setShowPostUploadDialog] = useState(false);
  const [recentUploadId, setRecentUploadId] = useState<string | null>(null);

  // Fetch user statements with realtime updates
  const { data: statements, isLoading, refetch } = useQuery({
    queryKey: ['statements', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      console.log('Fetching statements for user:', user.id);
      
      const { data, error } = await supabase
        .from('statements')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })
        .limit(6);
      
      if (error) {
        console.error('Error fetching statements:', error);
        throw error;
      }
      
      console.log('Fetched statements:', data);
      return data || [];
    },
    enabled: !!user
  });

  // Setup realtime subscription for statements
  useEffect(() => {
    if (!user) return;

    console.log('Setting up realtime subscription for user:', user.id);

    const channel = supabase
      .channel(`statements-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'statements',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Statement updated via realtime:', payload);
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'statements',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New statement via realtime:', payload);
          setRecentUploadId(payload.new.id);
          setShowPostUploadDialog(true);
          refetch();
        }
      )
      .subscribe((status) => {
        console.log('Realtime channel status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  const getStatusBadge = (status: string, parsedAt: string | null) => {
    if (status === 'processing') {
      return <Badge className="bg-orange-100 text-orange-700 animate-pulse">Processando...</Badge>;
    } else if (status === 'ready' && parsedAt) {
      return <Badge className="bg-sage-100 text-sage-700">Concluído</Badge>;
    } else if (status === 'error') {
      return <Badge className="bg-red-100 text-red-700">Erro</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700">Desconhecido</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleViewTransactions = () => {
    console.log('PostUploadDialog - View transactions clicked, calling onNavigateToMovimentacoes');
    setShowPostUploadDialog(false);
    if (onNavigateToMovimentacoes) {
      onNavigateToMovimentacoes();
    }
  };

  const handleManualProcess = async () => {
    console.log('Manually triggering process-statements function...');
    try {
      const { data, error } = await supabase.functions.invoke('process-statements');
      if (error) {
        console.error('Error invoking process-statements function:', error);
      } else {
        console.log('Process-statements function result:', data);
        refetch(); // Refresh the statements list
      }
    } catch (error) {
      console.error('Error calling process-statements function:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Extratos (upload)</h2>
        <p className="text-gray-600">
          Envie extratos de meses anteriores - nossa IA evita duplicatas automaticamente
        </p>
      </div>

      {/* Upload Section - Redesigned for better proportions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card - Takes 1 column on large screens */}
        <div className="lg:col-span-1 bg-gradient-to-br from-sage-100 to-sage-200 rounded-xl p-6 flex flex-col justify-center items-center text-center min-h-[250px] md:min-h-[300px]">
          <Upload className="h-12 w-12 md:h-16 md:w-16 text-sage-700 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2 text-lg">Enviar Extratos</h3>
          <p className="text-sm text-gray-600 mb-6">Faça upload dos seus extratos em PDF, CSV ou OFX</p>
          <div className="space-y-3 w-full">
            <Button 
              onClick={onUpload}
              className="bg-sage-600 hover:bg-sage-700 text-white shadow-md w-full py-3"
            >
              <Upload className="h-4 w-4 mr-2" />
              Selecionar Arquivo
            </Button>
            <Button 
              onClick={handleManualProcess}
              variant="outline"
              className="w-full py-2 text-sm"
            >
              🔄 Processar Manualmente
            </Button>
          </div>
        </div>

        {/* Transaction List - Takes 2 columns on large screens */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-sage-100 p-4">
            <div className="hidden md:grid md:grid-cols-4 gap-4 font-medium text-gray-700">
              <span>Descrição</span>
              <span>Banco</span>
              <span>Data</span>
              <span>Status</span>
            </div>
            <div className="md:hidden">
              <span className="font-medium text-gray-700">Extratos Recentes</span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Carregando...</div>
            ) : statements && statements.length > 0 ? (
              statements.map((statement) => (
                <div key={statement.id} className="p-4">
                  {/* Mobile Layout */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-sage-100 rounded-full flex items-center justify-center mr-3">
                          📄
                        </div>
                        <div>
                          <p className="font-medium text-sm">{statement.filename}</p>
                          <p className="text-xs text-gray-500">{formatDate(statement.uploaded_at!)}</p>
                        </div>
                      </div>
                      {getStatusBadge(statement.status!, statement.parsed_at)}
                    </div>
                    <p className="text-xs text-blue-600 ml-11">{statement.bank || 'Banco não identificado'}</p>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:grid md:grid-cols-4 gap-4 items-center">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-sage-100 rounded-full flex items-center justify-center mr-3">
                        📄
                      </div>
                      <span className="text-sm font-medium">{statement.filename}</span>
                    </div>
                    <span className="text-sm text-blue-600">{statement.bank || 'Não identificado'}</span>
                    <span className="text-sm">{formatDate(statement.uploaded_at!)}</span>
                    {getStatusBadge(statement.status!, statement.parsed_at)}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">Nenhum extrato encontrado</div>
            )}
          </div>
        </div>
      </div>

      {/* Post Upload Dialog */}
      <PostUploadDialog 
        isOpen={showPostUploadDialog}
        onClose={() => setShowPostUploadDialog(false)}
        onViewTransactions={handleViewTransactions}
      />
    </div>
  );
};

export default UploadSection;
