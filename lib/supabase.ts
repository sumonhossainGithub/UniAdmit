import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qztxpsertvuluvhwdhee.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6dHhwc2VydHZ1bHV2aHdkaGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNzI5MDAsImV4cCI6MjEwNzc0ODkwMH0._XlC0D1I7HnpnE1VNUZI-9myrc6FcH8IYs4FgVM1HL8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
