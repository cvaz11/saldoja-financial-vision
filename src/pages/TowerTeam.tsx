import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { TowerLayout } from '@/components/tower/TowerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TowerTeam() {
  const { isAdmin, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <TowerLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Equipe Admin</CardTitle>
            <CardDescription>
              Gerenciamento da equipe administrativa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Em desenvolvimento... Gestão de permissões e atividades da equipe.
            </p>
          </CardContent>
        </Card>
      </div>
    </TowerLayout>
  );
}