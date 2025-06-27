
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

      return data as UserProfile;
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

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
  };
};
