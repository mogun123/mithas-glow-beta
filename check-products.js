const { createClient } = require('@supabase/supabase-js');

// Read from .env.local
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseAnonKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

console.log('Testing with URL:', supabaseUrl);
console.log('Key starts with:', supabaseAnonKey?.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProducts() {
  try {
    const { data, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('status', 'active');
    
    console.log('Active products count:', count);
    console.log('Sample products:', data?.slice(0, 3));
    console.log('Error:', error);
  } catch (err) {
    console.error('Connection error:', err.message);
  }
}

checkProducts();
