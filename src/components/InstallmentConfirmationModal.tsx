import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DetectedInstallment {
  current: number;
  total: number;
  baseDescription: string;
  amount: number;
  date: string;
}

interface FutureInstallment {
  number: number;
  date: string;
  amount: number;
}

interface InstallmentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectedInstallment: DetectedInstallment | null;
  futureInstallments: FutureInstallment[];
  onConfirm: () => void;
  onEdit: () => void;
  onIgnore: () => void;
  isProcessing?: boolean;
}

const InstallmentConfirmationModal = ({
  isOpen,
  onClose,
  detectedInstallment,
  futureInstallments,
  onConfirm,
  onEdit,
  onIgnore,
  isProcessing = false
}: InstallmentConfirmationModalProps) => {
  if (!detectedInstallment) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const totalFutureAmount = futureInstallments.reduce((sum, inst) => sum + inst.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <DialogTitle>Parcela Detectada</DialogTitle>
          </div>
          <DialogDescription>
            Encontramos uma parcela em seu extrato. Deseja criar automaticamente as parcelas futuras?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Parcela Detectada */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {detectedInstallment.baseDescription}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">
                      Parcela {detectedInstallment.current}/{detectedInstallment.total}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(detectedInstallment.date)}
                    </span>
                  </div>
                  <p className="font-bold text-green-600 mt-2">
                    {formatCurrency(detectedInstallment.amount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parcelas Futuras */}
          {futureInstallments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium text-sm">
                  Parcelas que serão criadas ({futureInstallments.length})
                </h4>
              </div>
              
              <div className="max-h-32 overflow-y-auto space-y-2">
                {futureInstallments.map((installment) => (
                  <div 
                    key={installment.number}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {installment.number}/{detectedInstallment.total}
                      </Badge>
                      <span>{formatDate(installment.date)}</span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(installment.amount)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Resumo Total */}
              <Card className="bg-muted/20 border-muted">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total das futuras:</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(totalFutureAmount)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={onIgnore}
            disabled={isProcessing}
          >
            ✕ Ignorar
          </Button>
          <Button
            variant="outline"
            onClick={onEdit}
            disabled={isProcessing}
          >
            ✏️ Editar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="bg-primary hover:bg-primary/90"
          >
            {isProcessing ? "Processando..." : "✓ Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InstallmentConfirmationModal;