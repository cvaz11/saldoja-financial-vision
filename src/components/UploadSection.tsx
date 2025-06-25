
import React, { useState, useEffect, useRef } from "react";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Upload, Trash2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface UploadSectionProps {
  onUpload: () => void;
  onNavigateToMovimentacoes: () => void;
}

const UploadSection = ({ onUpload, onNavigateToMovimentacoes }: UploadSectionProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState("");
  const [isInvoicePaid, setIsInvoicePaid] = useState(false);
  const [statements, setStatements] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploading } = useFileUpload();
  const { user } = useAuth();
  const { toast } = useToast();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="default" className="bg-green-500 text-white">Concluído</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Processando</Badge>;
      case 'no_data':
        return <Badge variant="outline" className="border-orange-500 text-orange-600">Sem dados</Badge>;
      case 'error':
        return <Badge variant="destructive">Falha</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusMessage = (statement: any) => {
    switch (statement.status) {
      case 'ready':
        if (statement.total_debit > 0) {
          return `${statement.total_debit > 0 ? `Saídas: ${formatCurrency(statement.total_debit)}` : ''} ${statement.total_credit > 0 ? `Entradas: ${formatCurrency(statement.total_credit)}` : ''}`.trim();
        } else {
          return 'Nenhuma despesa identificada';
        }
      case 'processing':
        return 'Processando extrato... Isso pode levar alguns minutos.';
      case 'no_data':
        return 'Nenhuma despesa identificada – verifique se o extrato contém movimentações no período.';
      case 'error':
        return 'Erro no processamento. Clique para tentar novamente.';
      default:
        return '';
    }
  };

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

      setStatements(data);
    };

    fetchStatements();
  }, [user]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file || !bankName) {
      alert("Por favor, selecione um arquivo e insira o nome do banco.");
      return;
    }

    const result = await uploadFile({
      file: file,
      bankName: bankName,
      isInvoicePaid: isInvoicePaid,
    });

    if (result?.success) {
      onUpload();
      setFile(null);
      setBankName("");
      setIsInvoicePaid(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleManualProcess = async () => {
    console.log('Manual process triggered');
    try {
      const { error: functionError } = await supabase.functions.invoke('process-statements');
      if (functionError) {
        console.error('Error invoking process-statements function:', functionError);
        toast({
          title: "Erro",
          description: "Erro ao processar extratos",
          variant: "destructive",
        });
      } else {
        console.log('Process-statements function invoked successfully');
        toast({
          title: "Sucesso",
          description: "Processamento iniciado com sucesso",
        });
      }
    } catch (funcError) {
      console.error('Error calling process-statements function:', funcError);
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
        alert("Erro ao excluir o extrato.");
        return;
      }

      setStatements(statements.filter(statement => statement.id !== statementId));
      alert("Extrato excluído com sucesso!");
    } catch (err) {
      console.error("Unexpected error deleting statement:", err);
      alert("Ocorreu um erro inesperado ao excluir o extrato.");
    }
  };

  const handleStatementClick = (statement: any) => {
    if (statement.status === 'error') {
      toast({
        title: "Erro no processamento",
        description: "Não foi possível analisar este PDF. Tente fazer o upload novamente.",
        variant: "destructive",
      });
    } else if (statement.status === 'ready' && statement.total_debit > 0) {
      onNavigateToMovimentacoes();
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Enviar Novo Extrato</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bankName">Nome do Banco</Label>
            <Input
              type="text"
              id="bankName"
              placeholder="Ex: Nubank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fileUpload">Arquivo PDF</Label>
            <Input
              type="file"
              id="fileUpload"
              accept="application/pdf"
              onChange={handleFileChange}
              ref={fileInputRef}
            />
          </div>
        </div>
        
        <Button
          className="bg-sage-600 hover:bg-sage-700 text-white shadow-md w-full"
          onClick={handleSubmit}
          disabled={uploading || !file || !bankName}
        >
          {uploading ? "Enviando..." : "Enviar Extrato"}
        </Button>
      </div>

      {/* Statements List */}
      {statements && statements.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Extratos Enviados</h3>
          <div className="grid gap-4">
            {statements.map((statement: any) => (
              <div 
                key={statement.id} 
                className={`bg-white rounded-lg border p-4 transition-shadow ${
                  statement.status === 'error' || (statement.status === 'ready' && statement.total_debit > 0) ? 'cursor-pointer hover:shadow-sm' : ''
                } ${statement.status === 'error' ? 'hover:bg-red-50' : 'hover:bg-gray-50'}`}
                onClick={() => handleStatementClick(statement)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{statement.filename}</p>
                        <p className="text-xs text-gray-500">
                          Enviado em {format(new Date(statement.uploaded_at), 'dd/MM/yyyy às HH:mm', { locale: ptBR })}
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
                  {statement.status === 'no_data' && (
                    <div className="flex items-center space-x-2 text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>{getStatusMessage(statement)}</span>
                    </div>
                  )}
                  {statement.status !== 'no_data' && (
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
                          className="text-xs"
                        >
                          Ver Movimentações
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Manual Process Button */}
          {process.env.NODE_ENV === 'development' && (
            <Button 
              onClick={handleManualProcess}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              Processar Extratos (DEV ONLY)
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadSection;
