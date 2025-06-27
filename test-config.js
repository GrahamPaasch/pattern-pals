// Test configuration - loads from environment variables
// This ensures test scripts don't have hardcoded credentials

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get credentials from environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials!');
  console.log('💡 Make sure you have a .env file with:');
  console.log('   EXPO_PUBLIC_SUPABASE_URL=your-project-url');
  console.log('   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  console.log('');
  console.log('📋 Copy .env.example to .env and fill in your credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = { supabase, SUPABASE_URL, SUPABASE_ANON_KEY };
