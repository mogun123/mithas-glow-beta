const { createClient } = require('@supabase/supabase-js');

// Read from .env.local
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseAnonKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'active');
    
    console.log('Products and their properties:');
    data?.forEach(p => {
      console.log(`- ${p.name}: gender="${p.gender}", floor="${p.floor}", category="${p.category}"`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
}

debugProducts();
