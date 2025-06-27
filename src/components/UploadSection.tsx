import React, { useState, useEffect, useRef } from "react";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Upload, Trash2, AlertCircle, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

interface UploadSectionProps {
  onUpload: () => void;
  onNavigateToMovimentacoes: () => void;
}

interface Statement {
  id: string;
  status: string;
  total_debit: number;
  total_credit: number;
  filename: string;
  uploaded_at: string;
  user_id: string;
}

const UploadSection = ({ onUpload, onNavigateToMovimentacoes }: UploadSectionProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState("Nubank");
  const [statements, setStatements] = useState<Statement[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploading } = useFileUpload();
  const { user } = useAuth();
  const { profile, updateProfile } = useUserProfile();
  const { toast } = useToast();
  const [closingDay, setClosingDay] = useState<string>(profile?.invoice_closing_day?.toString() || "5");

  // Atualizar closingDay quando o perfil carregar
  useEffect(() => {
    if (profile?.invoice_closing_day) {
      setClosingDay(profile.invoice_closing_day.toString());
    }
  }, [profile]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <Badge variant="default" className="bg-green-500 text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Pronto
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="secondary" className="bg-yellow-500 text-white">
            <div className="animate-spin h-3 w-3 mr-1 border border-white border-t-transparent rounded-full" />
            Processando
          </Badge>
        );
      case 'no_data':
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Sem dados
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusMessage = (statement: Statement) => {
    switch (statement.status) {
      case 'ready':
        if (statement.total_debit > 0) {
          return `${statement.total_debit > 0 ? `Despesas: ${formatCurrency(statement.total_debit)}` : ''} ${statement.total_credit > 0 ? `Receitas: ${formatCurrency(statement.total_credit)}` : ''}`.trim();
        } else {
          return 'Processado - Nenhuma despesa identificada';
        }
      case 'processing':
        return 'Analisando extrato Nubank... Aguarde alguns minutos.';
      case 'no_data':
        return 'Extrato processado - Nenhuma despesa encontrada no período.';
      case 'error':
        return 'Falha no processamento. Tente fazer upload novamente.';
      default:
        return '';
    }
  };

  // Buscar extratos do usuário
  useEffect(() => {
    const fetchStatements = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('statements')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error("Error fetching statements:", error);
        return;
      }

      setStatements(data as Statement[]);
    };

    fetchStatements();
  }, [user]);

  // Escutar atualizações realtime dos extratos
  useEffect(() => {
    if (!user) return;

    console.log('[UPLOAD] Setting up realtime subscription for statements');
    
    const channel = supabase
      .channel('statements-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'statements',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[UPLOAD] Statement realtime update:', payload);
          
          // Atualizar lista de extratos
          setStatements(current => {
            const updated = [...current];
            const newRecord = payload.new as Statement;
            const oldRecord = payload.old as Statement;
            const index = updated.findIndex(s => s.id === newRecord?.id || s.id === oldRecord?.id);
            
            if (payload.eventType === 'INSERT' && newRecord) {
              updated.unshift(newRecord);
            } else if (payload.eventType === 'UPDATE' && newRecord) {
              if (index >= 0) {
                updated[index] = newRecord;
              }
              
              // Se extrato ficou pronto com transações, mostrar toast
              if (newRecord.status === 'ready' && newRecord.total_debit > 0) {
                toast({
                  title: "🎉 Extrato processado!",
                  description: `${newRecord.total_debit > 0 ? `${formatCurrency(newRecord.total_debit)} em despesas encontradas.` : ''} Clique para ver as movimentações.`,
                  duration: 8000,
                  action: (
                    <ToastAction 
                      altText="Ver movimentações"
                      onClick={onNavigateToMovimentacoes}
                    >
                      Ver movimentações
                    </ToastAction>
                  )
                });
              }
            } else if (payload.eventType === 'DELETE' && index >= 0) {
              updated.splice(index, 1);
            }
            
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      console.log('[UPLOAD] Cleaning up statements realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast, onNavigateToMovimentacoes]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      
      // Auto-detectar banco baseado no nome do arquivo
      if (selectedFile.name.toLowerCase().includes('nubank')) {
        setBankName('Nubank');
      }
    }
  };

  const handleSubmit = async () => {
    if (!file || !bankName) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo PDF e confirme o banco.",
        variant: "destructive",
      });
      return;
    }

    // Atualizar dia de fechamento se foi alterado
    const newClosingDay = parseInt(closingDay);
    if (profile && profile.invoice_closing_day !== newClosingDay) {
      updateProfile({ invoice_closing_day: newClosingDay });
    }

    const result = await uploadFile({
      file: file,
      bankName: bankName,
      isInvoicePaid: true, // Sempre true agora
    });

    if (result?.success) {
      onUpload();
      setFile(null);
      setBankName("Nubank");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (statementId: string) => {
    const confirmDelete = window.confirm("Tem certeza que deseja excluir este extrato?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('statements')
        .delete()
        .eq('id', statementId);

      if (error) {
        console.error("Error deleting statement:", error);
        toast({
          title: "Erro",
          description: "Erro ao excluir o extrato.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Extrato excluído com sucesso!",
      });
    } catch (err) {
      console.error("Unexpected error deleting statement:", err);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado ao excluir o extrato.",
        variant: "destructive",
      });
    }
  };

  const handleStatementClick = (statement: Statement) => {
    if (statement.status === 'error') {
      toast({
        title: "Erro no processamento",
        description: "Não foi possível analisar este extrato. Tente fazer o upload novamente.",
        variant: "destructive",
      });
    } else if (statement.status === 'ready' && statement.total_debit > 0) {
      onNavigateToMovimentacoes();
    } else if (statement.status === 'processing') {
      toast({
        title: "Processamento em andamento",
        description: "Seu extrato está sendo analisado. Aguarde alguns minutos.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Enviar Extrato</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bankName">Banco</Label>
            <Input
              type="text"
              id="bankName"
              placeholder="Ex: Nubank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fileUpload">Extrato (OFX, CSV, XLS)</Label>
            <Input
              type="file"
              id="fileUpload"
              accept=".ofx,.csv,.xls,.xlsx"
              onChange={handleFileChange}
              ref={fileInputRef}
            />
            <p className="text-xs text-gray-500 mt-1">
              Formatos aceitos: OFX, CSV, XLS, XLSX
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="closingDay">Dia de Fechamento da Fatura</Label>
          <Select value={closingDay} onValueChange={setClosingDay}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione o dia" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  Dia {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500 mt-1">
            Dia do mês em que sua fatura de cartão fecha
          </p>
        </div>
        
        <Button
          className="bg-sage-600 hover:bg-sage-700 text-white shadow-md w-full"
          onClick={handleSubmit}
          disabled={uploading || !file || !bankName}
        >
          {uploading ? (
            <>
              <div className="animate-spin h-4 w-4 mr-2 border border-white border-t-transparent rounded-full" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Enviar Extrato
            </>
          )}
        </Button>
      </div>

      {/* Statements List */}
      {statements && statements.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Extratos Enviados</h3>
          <div className="grid gap-4">
            {statements.map((statement: Statement) => (
              <div 
                key={statement.id} 
                className={`bg-white rounded-lg border p-4 transition-all ${
                  statement.status === 'ready' && statement.total_debit > 0 ? 'cursor-pointer hover:shadow-md hover:border-sage-300' : ''
                } ${statement.status === 'error' ? 'cursor-pointer hover:bg-red-50' : ''}`}
                onClick={() => handleStatementClick(statement)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{statement.filename}</p>
                        <p className="text-xs text-gray-500">
                          Enviado em {format(parseISO(statement.uploaded_at), 'dd/MM/yyyy às HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(statement.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(statement.id);
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-3 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>{getStatusMessage(statement)}</span>
                    {statement.status === 'ready' && statement.total_debit > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToMovimentacoes();
                        }}
                        className="text-xs ml-2"
                      >
                        Ver Movimentações
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadSection;
