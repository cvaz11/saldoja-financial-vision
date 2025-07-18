import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TwoFactorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TwoFactorDialog = ({ open, onOpenChange }: TwoFactorDialogProps) => {
  const [enabled, setEnabled] = useState(false);
  const { toast } = useToast();

  const handleEnable = () => {
    // Simulação - em uma implementação real, você configuraria 2FA
    setEnabled(true);
    toast({
      title: "2FA Configurado",
      description: "Autenticação de dois fatores foi habilitada",
    });
  };

  const handleDisable = () => {
    setEnabled(false);
    toast({
      title: "2FA Desabilitado",
      description: "Autenticação de dois fatores foi desabilitada",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Autenticação de Dois Fatores</DialogTitle>
          <DialogDescription>
            Adicione uma camada extra de segurança à sua conta
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              A autenticação de dois fatores adiciona uma camada extra de segurança
              à sua conta, exigindo um código adicional além da sua senha.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {enabled ? (
              <Button variant="destructive" onClick={handleDisable}>
                Desabilitar 2FA
              </Button>
            ) : (
              <Button onClick={handleEnable}>
                Habilitar 2FA
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};