
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface UploadData {
  file: File;
  bankName: string;
  isInvoicePaid: boolean;
}

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadFile = async (data: UploadData) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return { success: false };
    }

    setUploading(true);

    try {
      // First, let's check if the bucket exists, if not create it
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === 'documents');
      
      if (!bucketExists) {
        const { error: bucketError } = await supabase.storage.createBucket('documents', {
          public: false,
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: ['application/pdf', 'text/csv', 'application/vnd.ms-excel']
        });
        
        if (bucketError) {
          console.error('Error creating bucket:', bucketError);
          toast({
            title: "Erro ao criar bucket",
            description: "Não foi possível criar o espaço de armazenamento",
            variant: "destructive"
          });
          return { success: false };
        }
      }

      // Create unique file path
      const fileExt = data.file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, data.file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Erro no upload",
          description: uploadError.message,
          variant: "destructive"
        });
        return { success: false };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Save document info to statements table (using existing schema)
      const currentDate = new Date();
      const { error: dbError } = await supabase
        .from('statements')
        .insert({
          user_id: user.id,
          filename: data.file.name,
          file_url: publicUrl,
          bank: data.bankName,
          status: data.isInvoicePaid ? 'processed' : 'pending',
          uploaded_at: currentDate.toISOString(),
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear()
        });

      if (dbError) {
        console.error('Database error:', dbError);
        toast({
          title: "Erro ao salvar",
          description: dbError.message,
          variant: "destructive"
        });
        return { success: false };
      }

      toast({
        title: "Upload realizado com sucesso!",
        description: "Seu extrato foi enviado e está sendo processado."
      });

      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro durante o upload",
        variant: "destructive"
      });
      return { success: false };
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadFile,
    uploading
  };
};
