// Script para fazer request manual à edge function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

console.log("🚀 TRIGGER MANUAL PARA EDGE FUNCTION");

const supabaseUrl = 'https://hicjqrnxlmbovctfwgya.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpY2pxcm54bG1ib3ZjdGZ3Z3lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTM3MDcsImV4cCI6MjA2NjI2OTcwN30.GwnAPx2jGt77j4ftt_0BPnVCkxy33DL0EsGlPTTap4I';

const supabase = createClient(supabaseUrl, anonKey);

try {
  console.log("📞 Chamando edge function process-statements...");
  
  const { data, error } = await supabase.functions.invoke('process-statements', {
    body: { trigger: 'manual-test' }
  });
  
  if (error) {
    console.log("❌ Erro na chamada:", error);
  } else {
    console.log("✅ Resposta da função:", data);
  }
  
} catch (e) {
  console.log("❌ Erro geral:", e.message);
}

console.log("🏁 TRIGGER CONCLUÍDO");