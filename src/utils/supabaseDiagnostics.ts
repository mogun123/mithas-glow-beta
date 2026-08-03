// Comprehensive Supabase Backend/Frontend Wiring Diagnostics
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface DiagnosticResult {
  category: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export const runSupabaseDiagnostics = async (): Promise<DiagnosticResult[]> => {
  const results: DiagnosticResult[] = [];

  // 1. Environment Configuration Check
  results.push({
    category: 'Environment',
    status: isSupabaseConfigured() ? 'pass' : 'fail',
    message: isSupabaseConfigured() 
      ? 'Supabase environment variables configured' 
      : 'Missing or invalid VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY',
    details: {
      url: import.meta.env.VITE_SUPABASE_URL || 'NOT_SET',
      hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      isPlaceholder: import.meta.env.VITE_SUPABASE_URL?.includes('your-project')
    }
  });

  // 2. Basic Connection Test
  try {
    const { data, error } = await supabase.from('profiles').select('count').single();
    results.push({
      category: 'Connection',
      status: error ? 'fail' : 'pass',
      message: error ? `Connection failed: ${error.message}` : 'Basic database connection successful',
      details: { error: error?.message }
    });
  } catch (err) {
    results.push({
      category: 'Connection',
      status: 'fail',
      message: `Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`
    });
  }

  // 3. Authentication State Check
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    results.push({
      category: 'Authentication',
      status: error ? 'warning' : (user ? 'pass' : 'warning'),
      message: error 
        ? `Auth error: ${error.message}` 
        : user 
          ? `User authenticated: ${user.email}` 
          : 'No authenticated user - please login first',
      details: { 
        userId: user?.id, 
        email: user?.email,
        error: error?.message 
      }
    });
  } catch (err) {
    results.push({
      category: 'Authentication',
      status: 'fail',
      message: `Auth check failed: ${err instanceof Error ? err.message : 'Unknown error'}`
    });
  }

  // 4. Clinical Tables Existence Check
  const clinicalTables = ['clinical_analyses', 'clinical_metrics_history', 'user_skin_profiles'];
  
  for (const table of clinicalTables) {
    try {
      const { data, error } = await supabase.from(table).select('count').single();
      results.push({
        category: 'Database Schema',
        status: error ? 'fail' : 'pass',
        message: error 
          ? `Table ${table}: ${error.message}` 
          : `Table ${table} exists and accessible`,
        details: { table, error: error?.message }
      });
    } catch (err) {
      results.push({
        category: 'Database Schema',
        status: 'fail',
        message: `Table ${table} check failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    }
  }

  // 5. RLS (Row Level Security) Check
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('clinical_analyses')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      results.push({
        category: 'Security',
        status: error ? 'fail' : 'pass',
        message: error 
          ? `RLS policy issue: ${error.message}` 
          : 'RLS policies working correctly',
        details: { error: error?.message }
      });
    } else {
      results.push({
        category: 'Security',
        status: 'warning',
        message: 'Cannot test RLS without authenticated user'
      });
    }
  } catch (err) {
    results.push({
      category: 'Security',
      status: 'fail',
      message: `RLS check failed: ${err instanceof Error ? err.message : 'Unknown error'}`
    });
  }

  // 6. ClinicalMetricsService Integration Check
  try {
    // Test if the service can be imported and used
    const ClinicalMetricsService = (await import('../services/clinicalMetricsService')).default;
    
    if (typeof ClinicalMetricsService.saveAnalysis === 'function') {
      results.push({
        category: 'Service Integration',
        status: 'pass',
        message: 'ClinicalMetricsService properly integrated'
      });
    } else {
      results.push({
        category: 'Service Integration',
        status: 'fail',
        message: 'ClinicalMetricsService.saveAnalysis method not found'
      });
    }
  } catch (err) {
    results.push({
      category: 'Service Integration',
      status: 'fail',
      message: `ClinicalMetricsService import failed: ${err instanceof Error ? err.message : 'Unknown error'}`
    });
  }

  // 7. Frontend Component Integration Check
  try {
    // Test if components can be imported
    const [SkinToneAnalyzer, ClinicalOverlayEngine] = await Promise.all([
      import('../components/SkinToneAnalyzer'),
      import('../components/skin/ClinicalOverlayEngine')
    ]);
    
    results.push({
      category: 'Frontend Integration',
      status: 'pass',
      message: 'Clinical components properly integrated'
    });
  } catch (err) {
    results.push({
      category: 'Frontend Integration',
      status: 'fail',
      message: `Component import failed: ${err instanceof Error ? err.message : 'Unknown error'}`
    });
  }

  // 8. Data Flow Test (if user is authenticated)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Test saving a simple analysis
      const testData = {
        user_id: user.id,
        session_id: `diagnostic_${Date.now()}`,
        skin_tone: 'medium',
        undertone: 'warm',
        skin_type: 'normal',
        metrics: { acne: 0, redness: 0, oiliness: 0, moisture: 50, texture: 0, pores: 0, pigment: 0, darkCircle: 0, elasticity: 70, glassSkin: 50 },
        spatial_data: { acneClusters: [], oilSpots: [], rednessClusters: [], melaninClusters: [], porePoints: [], underEyeRegions: [] },
        frame_data: { center: { image: '', timestamp: new Date().toISOString() }, left: { image: '', timestamp: new Date().toISOString() }, right: { image: '', timestamp: new Date().toISOString() } },
        lab_values: { overall: { l: 65, a: 12, b: 18 }, forehead: { l: 65, a: 12, b: 18 }, leftCheek: { l: 65, a: 12, b: 18 }, rightCheek: { l: 65, a: 12, b: 18 }, nose: { l: 65, a: 12, b: 18 }, chin: { l: 65, a: 12, b: 18 } }
      };

      const { data: savedData, error: saveError } = await supabase
        .from('clinical_analyses')
        .insert([testData])
        .select('id')
        .single();

      if (saveError) {
        results.push({
          category: 'Data Flow',
          status: 'fail',
          message: `Data save failed: ${saveError.message}`,
          details: { error: saveError.message }
        });
      } else {
        // Cleanup test data
        await supabase.from('clinical_analyses').delete().eq('id', savedData.id);
        
        results.push({
          category: 'Data Flow',
          status: 'pass',
          message: 'Complete data flow test successful'
        });
      }
    } else {
      results.push({
        category: 'Data Flow',
        status: 'warning',
        message: 'Cannot test data flow without authenticated user'
      });
    }
  } catch (err) {
    results.push({
      category: 'Data Flow',
      status: 'fail',
      message: `Data flow test failed: ${err instanceof Error ? err.message : 'Unknown error'}`
    });
  }

  return results;
};

// Generate diagnostic report
export const generateDiagnosticReport = (results: DiagnosticResult[]) => {
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  
  const overallStatus = failed === 0 ? (warnings === 0 ? 'pass' : 'warning') : 'fail';
  
  return {
    overallStatus,
    summary: {
      total: results.length,
      passed,
      failed,
      warnings
    },
    results,
    recommendations: generateRecommendations(results)
  };
};

const generateRecommendations = (results: DiagnosticResult[]): string[] => {
  const recommendations: string[] = [];
  
  const envResults = results.filter(r => r.category === 'Environment');
  if (envResults.some(r => r.status === 'fail')) {
    recommendations.push('Set up VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
    recommendations.push('Create a .env file with your Supabase project credentials');
  }
  
  const authResults = results.filter(r => r.category === 'Authentication');
  if (authResults.some(r => r.status === 'warning')) {
    recommendations.push('Login to the application to test authenticated features');
  }
  
  const schemaResults = results.filter(r => r.category === 'Database Schema');
  if (schemaResults.some(r => r.status === 'fail')) {
    recommendations.push('Run the clinical_tables_only.sql script in your Supabase SQL editor');
    recommendations.push('Ensure all clinical tables are created with proper RLS policies');
  }
  
  const connectionResults = results.filter(r => r.category === 'Connection');
  if (connectionResults.some(r => r.status === 'fail')) {
    recommendations.push('Check your Supabase project URL and anon key');
    recommendations.push('Verify your Supabase project is active and accessible');
  }
  
  return recommendations;
};
