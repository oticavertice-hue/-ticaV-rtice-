// Endereço e chave PÚBLICA do Supabase.
//
// Onde achar: Supabase → Project Settings → API.
//   SUPABASE_URL       → "Project URL"           (https://xxxxxxxx.supabase.co)
//   SUPABASE_ANON_KEY  → "anon / public"          (começa com eyJ...)
//
// A chave anon foi feita para ficar no navegador: quem protege os dados são as regras (RLS) do banco.
// NUNCA colocar aqui a chave service_role.
//
// Enquanto os dois estiverem vazios, o site roda em MODO DEMONSTRAÇÃO (dados de exemplo, guardados só
// no navegador de quem abriu). Serve para ver o design e testar o painel sem banco.
export const SUPABASE_URL = "https://yivugotnoduemjxzroqr.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_H9RbPS29EcD66x9_QB9OJg_2vWCfENv";

// Nome do bucket (Storage) onde ficam as fotos. Criado pelo script SQL 01.
export const BUCKET = "vertice";

// Endereço público do site, usado nos links de compartilhar. Vazio = usa o endereço aberto no momento.
export const SITE_URL = "";

export const DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;
