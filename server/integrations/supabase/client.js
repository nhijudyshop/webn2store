const { createClient } = require('@supabase/supabase-js');

// NOTE: These are public keys, but in a production environment,
// you should use environment variables and the Service Role Key for server-side operations.
const SUPABASE_URL = "https://iutxzuwexyiggenuebxw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dHh6dXdleHlpZ2dlbnVlYnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MTUzNjIsImV4cCI6MjA3NzE5MTM2Mn0.i-eAiUQcHUE3quzTiOg7kJcehLkLl-DIiSUxPcFWBM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = { supabase };