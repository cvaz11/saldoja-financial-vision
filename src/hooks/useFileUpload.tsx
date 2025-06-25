
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface UploadData {
  file: File;
  bankName: string;
  isInvoicePaid: boolean;
}

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
      
      // Upload file to storage
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

      // Insert statement record
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

      // Show processing toast and navigate to movimentacoes
      toast({
        title: "🚀 Extrato enviado com sucesso!",
        description: "Estamos processando seu extrato – isso leva ~5-8 min. Você verá as movimentações assim que estiver pronto.",
        duration: 8000,
      });

      // Navigate to movimentacoes after showing toast
      setTimeout(() => {
        navigate('/movimentacoes');
      }, 1000);

      // Trigger the processing function
      console.log('Triggering process-statements function...');
      setTimeout(async () => {
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
      }, 1000);

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
