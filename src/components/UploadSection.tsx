
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteStatement } from "@/hooks/useDeleteStatement";
import { useToast } from "@/hooks/use-toast";

interface UploadSectionProps {
  onUpload: () => void;
  onNavigateToMovimentacoes: () => void;
}

const UploadSection = ({ onUpload, onNavigateToMovimentacoes }: UploadSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { deleteStatement, isDeleting } = useDeleteStatement();
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);

  const { data: statements, isLoading, refetch } = useQuery({
    queryKey: ['statements', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('statements')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 0, // Always consider data stale for real-time updates
    refetchOnWindowFocus: true,
  });

  // Setup realtime subscription for statements
  useEffect(() => {
    if (!user) return;

    // Clean up previous channel if exists
    if (channelRef.current) {
      console.log('[STATEMENTS_REALTIME] Cleaning up previous channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('[STATEMENTS_REALTIME] Setting up realtime subscription for user:', user.id);
    
    const channel = supabase
      .channel(`statements-${user.id}-${Date.now()}`) // Unique channel name
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'statements',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[STATEMENTS_REALTIME] Realtime update received:', payload.eventType, payload);
          
          // Show toast for status updates
          if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
            const newStatus = payload.new.status;
            const oldStatus = payload.old.status;
            const filename = payload.new.filename;
            
            if (oldStatus === 'processing' && newStatus === 'ready') {
              toast({
                title: "✅ Extrato processado!",
                description: `${filename} foi analisado com sucesso pela IA.`,
                duration: 5000,
              });
            } else if (oldStatus === 'processing' && newStatus === 'error') {
              toast({
                title: "❌ Erro no processamento",
                description: `Houve um erro ao processar ${filename}.`,
                variant: "destructive",
                duration: 8000,
              });
            }
          }
          
          // Invalidate and refetch the statements query
          queryClient.invalidateQueries({ queryKey: ['statements', user.id] });
          
          // Force refetch after a small delay to ensure data is up to date
          setTimeout(() => {
            refetch();
          }, 500);
        }
      )
      .subscribe((status) => {
        console.log('[STATEMENTS_REALTIME] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('[STATEMENTS_REALTIME] Cleaning up realtime subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, queryClient, refetch, toast]);

  const handleDelete = async (statementId: string) => {
    const success = await deleteStatement(statementId);
    if (success) {
      refetch();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Pronto</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">⏳ Processando</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-200">❌ Erro</Badge>;
      case 'no_data':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⚠️ Sem dados</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Carregando extratos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card className="border-2 border-dashed border-sage-200 bg-sage-50/30">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-sage-100 rounded-full flex items-center justify-center mb-4">
            <Upload className="h-6 w-6 text-sage-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">Enviar Novo Extrato</CardTitle>
          <CardDescription className="text-gray-600">
            Faça upload dos seus extratos em formato OFX, CSV ou Excel. Nossa IA identificará automaticamente todos os gastos e categorizará de forma inteligente.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button 
            onClick={onUpload}
            size="lg"
            className="bg-sage-600 hover:bg-sage-700 text-white px-8 py-3 rounded-lg font-medium"
          >
            <Upload className="h-5 w-5 mr-2" />
            Selecionar Extrato
          </Button>
        </CardContent>
      </Card>

      {/* Statements List */}
      {statements && statements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Extratos Processados
            </CardTitle>
            <CardDescription>
              Histórico dos seus extratos com análise automática por IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statements.map((statement) => (
                <div key={statement.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">{statement.filename}</h3>
                      {getStatusBadge(statement.status)}
                    </div>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>Enviado em {new Date(statement.uploaded_at).toLocaleString('pt-BR')}</p>
                      {statement.status === 'ready' && (
                        <>
                          <p>Despesas: R$ {statement.total_debit?.toFixed(2) || '0,00'}</p>
                          {statement.total_credit && statement.total_credit > 0 && (
                            <p>Receitas: R$ {statement.total_credit.toFixed(2)}</p>
                          )}
                          <p className="text-xs text-sage-600">✨ Analisado e categorizado por IA</p>
                        </>
                      )}
                      {statement.status === 'processing' && (
                        <p className="text-xs text-blue-600">🔍 IA analisando todos os gastos...</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {statement.status === 'ready' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onNavigateToMovimentacoes}
                        className="hover:bg-sage-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Movimentações
                      </Button>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este extrato? Esta ação não pode ser desfeita e todas as transações relacionadas também serão excluídas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(statement.id)}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeleting}
                          >
                            {isDeleting ? "Excluindo..." : "Excluir"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UploadSection;
