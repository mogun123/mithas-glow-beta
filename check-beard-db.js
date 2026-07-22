const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqfbxyigvhfxwojfwzfg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZmJ4eWlndmhmeHdvamZ3emZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyOTgzODIsImV4cCI6MjA3ODg3NDM4Mn0.eHp39vPggCwGKYnivtM1MjfqNRrp01s4FP8_UikUgvU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBeardStyles() {
  try {
    // Check beard_styles table
    console.log('🔍 Checking beard_styles table...');
    const { data: beardData, error: beardError, count: beardCount } = await supabase
      .from('beard_styles')
      .select('*', { count: 'exact' });
    
    if (beardError) {
      console.error('❌ Error fetching beard_styles:', beardError.message);
    } else {
      console.log(`✅ beard_styles table found! Count: ${beardCount}`);
      
      if (beardData && beardData.length > 0) {
        console.log('\n� Sample Beard Styles (first 5):');
        beardData.slice(0, 5).forEach((p, i) => {
          console.log(`${i + 1}. ${p.name || p.style_name || 'N/A'}`);
          console.log(`   ID: ${p.id}`);
          console.log(`   Model URL: ${p.model_3d_url || p.model_url || p.ar_model_url || '❌'}`);
          console.log(`   Thumbnail: ${p.thumbnail_url || p.image_url || p.thumbnail || '❌'}`);
          console.log(`   Category: ${p.category || 'N/A'}`);
          console.log('');
        });
      }
    }
    
    // Check active_beard_styles view
    console.log('🔍 Checking active_beard_styles view...');
    const { data: activeData, error: activeError, count: activeCount } = await supabase
      .from('active_beard_styles')
      .select('*', { count: 'exact' });
    
    if (activeError) {
      console.error('❌ Error fetching active_beard_styles:', activeError.message);
    } else {
      console.log(`✅ active_beard_styles view found! Count: ${activeCount}`);
      
      if (activeData && activeData.length > 0) {
        console.log('\n📋 Sample Active Beard Styles (first 5):');
        activeData.slice(0, 5).forEach((p, i) => {
          console.log(`${i + 1}. ${p.name || p.style_name || 'N/A'}`);
          console.log(`   ID: ${p.id}`);
          console.log(`   Model URL: ${p.model_3d_url || p.model_url || p.ar_model_url || '❌'}`);
          console.log(`   Thumbnail: ${p.thumbnail_url || p.image_url || p.thumbnail || '❌'}`);
          console.log('');
        });
      }
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkBeardStyles();
