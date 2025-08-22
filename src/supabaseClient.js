// src/supabaseClient.js (The Final Unified Universe Edition)

import { createClient } from '@supabase/supabase-js'

// ✨✨✨ 決定性的、融合宇宙的、唯一的修正！✨✨✨
// 我們，要，從，我們的「本地宇宙」的「環境變量」中，讀取，地址和密鑰！
// 這些變量，是由 `npm start`，自動，為我們，注入的！
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)