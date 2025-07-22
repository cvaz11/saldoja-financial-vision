import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AdminAuthResult {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  userRole: string | null;
}

export const useAdminAuth = (): AdminAuthResult => {
  const { user, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setUserRole(null);
      setIsLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setUserRole(null);
        } else {
          setUserRole(data?.role || 'user');
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [user, authLoading]);

  return {
    isAdmin: userRole === 'admin' || userRole === 'super_admin',
    isSuperAdmin: userRole === 'super_admin',
    isLoading: isLoading || authLoading,
    userRole,
  };
};