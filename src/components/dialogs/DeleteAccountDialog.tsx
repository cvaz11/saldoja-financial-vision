import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<boolean>;
}

export const DeleteAccountDialog = ({ open, onOpenChange, onConfirm }: DeleteAccountDialogProps) => {
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (confirmation !== 'EXCLUIR') return;
    
    setLoading(true);
    const success = await onConfirm();
    setLoading(false);
    
    if (success) {
      onOpenChange(false);
      setConfirmation('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-600">Excluir Conta</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Ao excluir sua conta, todos os seus dados serão permanentemente removidos,
              incluindo transações, extratos e configurações. Esta ação não pode ser desfeita.
            </AlertDescription>
          </Alert>
          
          <div>
            <Label htmlFor="confirmation">
              Digite "EXCLUIR" para confirmar:
            </Label>
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="EXCLUIR"
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirm}
              disabled={confirmation !== 'EXCLUIR' || loading}
            >
              {loading ? 'Excluindo...' : 'Excluir Conta'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};