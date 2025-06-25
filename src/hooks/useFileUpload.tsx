
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface UploadData {
  file: File;
  bankName: string;
  isInvoicePaid: boolean;
}

/**
 * Faz upload de um PDF para o bucket privado `statements`.
 * Cada usuário grava apenas dentro da pasta `${user.id}/…` (enforcement via RLS).
 * Depois insere um registro na tabela `public.statements` com status `processing`.
 */
export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadFile = async (data: UploadData) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return { success: false } as const;
    }

    setUploading(true);

    try {
      console.log('Starting file upload for user:', user.id);
      
      /* -------------------- 1. Upload -------------------- */
      const bucketName = "statements";
      const fileExt = data.file.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      console.log('Uploading file to path:', filePath);

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, data.file, {
          cacheControl: "3600",
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Erro no upload",
          description: uploadError.message,
          variant: "destructive",
        });
        return { success: false } as const;
      }

      console.log('File uploaded successfully');

      /* -------------------- 2. Insert na tabela -------------------- */
      const now = new Date();
      const insertData = {
        user_id: user.id,
        filename: data.file.name,
        file_url: filePath,
        bank: data.bankName,
        status: "processing",
        uploaded_at: now.toISOString(),
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      };

      console.log('Inserting statement record:', insertData);

      const { error: dbError } = await supabase
        .from("statements")
        .insert(insertData);

      if (dbError) {
        console.error('Database insert error:', dbError);
        toast({
          title: "Erro ao salvar no banco",
          description: dbError.message,
          variant: "destructive",
        });
        return { success: false } as const;
      }

      console.log('Statement record inserted successfully');

      // Enhanced success toast with processing info
      toast({
        title: "🚀 Arquivo enviado! Analisando...",
        description: "Nossa IA está processando seu extrato (5-8 min). Você será redirecionado automaticamente.",
      });

      // Trigger the processing function
      console.log('Triggering process-statements function...');
      try {
        const { error: functionError } = await supabase.functions.invoke('process-statements');
        if (functionError) {
          console.error('Error invoking process-statements function:', functionError);
        } else {
          console.log('Process-statements function invoked successfully');
        }
      } catch (funcError) {
        console.error('Error calling process-statements function:', funcError);
      }

      return { success: true } as const;
    } catch (err) {
      console.error('Unexpected error in file upload:', err);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro durante o upload.",
        variant: "destructive",
      });
      return { success: false } as const;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading } as const;
};
