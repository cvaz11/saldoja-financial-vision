
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface UserProfile {
  user_id: string;
  invoice_closing_day: number;
  plan: string;
  pdf_uploads_this_month: number;
  created_at: string;
  full_name?: string;
  email?: string;
  phone?: string;
  notifications_email?: boolean;
  email_marketing?: boolean;
  installment_alerts?: boolean;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // Se o perfil não existe, criar um novo
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                user_id: user.id,
                invoice_closing_day: 5,
                plan: 'free',
                pdf_uploads_this_month: 0
              }
            ])
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            throw createError;
          }
          
          return newProfile as UserProfile;
        }
        
        console.error('Error fetching profile:', error);
        throw error;
      }

      return {
        ...data,
        full_name: user.user_metadata?.name || (data as any).full_name,
        email: user.email || (data as any).email,
      } as UserProfile;
    },
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] });
      toast({
        title: "Perfil atualizado",
        description: "Suas configurações foram salvas com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteAccount = async () => {
    try {
      if (!user) return false;

      // Delete profile first
      await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      // Delete all user transactions
      await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id);

      // Delete all user statements
      await supabase
        .from('statements')
        .delete()
        .eq('user_id', user.id);

      // Sign out the user
      await supabase.auth.signOut();

      toast({
        title: "Conta excluída",
        description: "Sua conta foi excluída com sucesso",
      });
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir conta",
        variant: "destructive",
      });
      return false;
    }
  };

  const exportData = async () => {
    try {
      if (!user) return;

      // Fetch all user data
      const [transactionsRes, statementsRes, profileRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id),
        supabase.from('statements').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('*').eq('user_id', user.id).single()
      ]);

      const exportData = {
        profile: profileRes.data,
        transactions: transactionsRes.data,
        statements: statementsRes.data,
        exported_at: new Date().toISOString()
      };

      // Create download link
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus_dados_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Dados exportados",
        description: "Seus dados foram exportados com sucesso",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar dados",
        variant: "destructive",
      });
    }
  };

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
    deleteAccount,
    exportData,
  };
};
