
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
      /* -------------------- 1. Upload -------------------- */
      const bucketName = "statements"; // bucket já existe; não criar pelo client
      const fileExt = data.file.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, data.file, {
          cacheControl: "3600",
        });

      if (uploadError) {
        toast({
          title: "Erro no upload",
          description: uploadError.message,
          variant: "destructive",
        });
        return { success: false } as const;
      }

      /* -------------------- 2. URL assinada opcional -------------------- */
      const { data: signed } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 300); // 5 min
      const signedUrl = signed?.signedUrl ?? "";

      /* -------------------- 3. Insert na tabela -------------------- */
      const now = new Date();
      const { error: dbError } = await supabase.from("statements").insert({
        user_id: user.id,
        filename: data.file.name,
        file_url: filePath, // salvamos somente o path, não URL pública
        bank: data.bankName,
        status: "processing",
        uploaded_at: now.toISOString(),
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });

      if (dbError) {
        toast({
          title: "Erro ao salvar no banco",
          description: dbError.message,
          variant: "destructive",
        });
        return { success: false } as const;
      }

      // Enhanced success toast with processing info
      toast({
        title: "🚀 Arquivo enviado! Analisando...",
        description: "Nossa IA está processando seu extrato (5-8 min). Você será redirecionado automaticamente.",
      });

      return { success: true, url: signedUrl } as const;
    } catch (err) {
      console.error(err);
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
