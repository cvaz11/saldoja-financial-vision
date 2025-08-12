import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";

interface InstallmentBadgeProps {
  installmentNumber?: number;
  installmentTotal?: number;
  isProjected?: boolean;
  paidBeforeStart?: boolean;
}

const InstallmentBadge = ({ 
  installmentNumber, 
  installmentTotal, 
  isProjected = false,
  paidBeforeStart = false,
}: InstallmentBadgeProps) => {
  if (!installmentNumber || !installmentTotal || installmentTotal <= 1) {
    return null;
  }

  return (
    <Badge 
      variant={isProjected ? "outline" : "secondary"}
      className={`
        inline-flex items-center gap-1 text-xs font-medium
        ${paidBeforeStart
          ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
          : isProjected 
            ? 'border-orange-200 text-orange-700 bg-orange-50' 
            : 'border-blue-200 text-blue-700 bg-blue-50'
        }
      `}
    >
      <CreditCard className="h-3 w-3" />
      {installmentNumber}/{installmentTotal}
      {isProjected && !paidBeforeStart && (
        <span className="ml-1 text-xs opacity-75">(pendente)</span>
      )}
      {paidBeforeStart && (
        <span className="ml-1 text-xs opacity-75">(paga antes de começar)</span>
      )}
    </Badge>
  );
};

export default InstallmentBadge;