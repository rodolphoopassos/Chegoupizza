
import { createClient } from '@supabase/supabase-js'

declare var process: any;

// Substitua pelas suas credenciais reais do painel do Supabase (Settings > API)
// Se estiver usando o ambiente do Project IDX, essas variáveis já podem estar injetadas
const supabaseUrl = process.env.SUPABASE_URL || 'https://zxcfxujdbdiclqmfpjsy.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_asAOe7uG0EnTktvIlFzv3g_JEnlZqI3'

export const supabase = createClient(supabaseUrl, supabaseKey)
