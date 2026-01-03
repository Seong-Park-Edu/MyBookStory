import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://agxdfmsrzmadnsmcjwmn.supabase.co' // 복사한 URL 넣기
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneGRmbXNyem1hZG5zbWNqd21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MjAwOTIsImV4cCI6MjA4Mjk5NjA5Mn0.58GTSWVmZ2NLaQPYyw2ZPxgSc7FxHCM2kOHEyPOiPcs' // 복사한 anon key 넣기

export const supabase = createClient(supabaseUrl, supabaseAnonKey)