import { createClient } from '@supabase/supabase-js'

export const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
export const supabase = configured ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }) : null
export type Mod = { id: string; slug: string; title: string; description: string; version: string; category: string; cover_url: string | null; nexus_url: string | null; created_at: string }
export type Feedback = { id: string; mod_id: string; user_id: string; author_name: string; rating: number; content: string; created_at: string; updated_at: string; kind: string; status: string; is_featured: boolean; admin_reply: string | null }
export const examples: Mod[] = [
  { id: 'demo-1', slug: 'automatic-loot', title: 'Automatic Loot', description: 'Colete itens de forma automática e deixe a exploração do Velho Oeste muito mais fluida.', version: 'v2.0', category: 'QUALIDADE DE VIDA', cover_url: null, nexus_url: null, created_at: '' },
  { id: 'demo-2', slug: 'fishing-assist', title: 'Fishing Assist', description: 'Mais praticidade nas pescarias, com ajustes que tornam a experiência mais confortável.', version: 'v1.0', category: 'GAMEPLAY', cover_url: null, nexus_url: null, created_at: '' },
  { id: 'demo-3', slug: 'frontier-tools', title: 'Frontier Tools', description: 'Um espaço para os próximos projetos e melhorias da comunidade.', version: 'Em breve', category: 'FERRAMENTAS', cover_url: null, nexus_url: null, created_at: '' }
]
export const errorMessage = (err: unknown) => err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.'
