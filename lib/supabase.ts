import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fbmdqgfifqiphwcommnq.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibWRxZ2ZpZnFpcGh3Y29tbW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMzI0NDMsImV4cCI6MjEwMjYwODQ0M30.bdzPfoW0vFZR3TZIV7DFASi07bl-LP0KiYUMIvnBf5c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
