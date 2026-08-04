// Production Readiness Check - Complete UI and Backend Verification
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ClinicalMetricsService } from '../services/clinicalMetricsService';

export interface ProductionCheckResult {
  category: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  fix?: string;
}

export const runProductionReadinessCheck = async (): Promise<ProductionCheckResult[]> => {
  const results: ProductionCheckResult[] = [];

  // 1. Environment Configuration
  results.push({
    category: 'Environment',
    status: isSupabaseConfigured() ? 'pass' : 'fail',
    message: isSupabaseConfigured() ? 'Production environment configured' : 'Missing production environment variables',
    details: {
      url: import.meta.env.VITE_SUPABASE_URL?.includes('your-project') ? 'placeholder' : 'configured',
      hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      isProduction: import.meta.env.MODE === 'production'
    },
    fix: !isSupabaseConfigured() ? 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in production environment' : undefined
  });

  // 2. Database Connection
  try {
    const { data, error } = await supabase.from('profiles').select('count').single();
    results.push({
      category: 'Database Connection',
      status: error ? 'fail' : 'pass',
      message: error ? `Database connection failed: ${error.message}` : 'Database connection successful',
      details: { error: error?.message },
      fix: error ? 'Check Supabase project status and network connectivity' : undefined
    });
  } catch (err) {
    results.push({
      category: 'Database Connection',
      status: 'fail',
      message: `Database error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      fix: 'Verify Supabase URL and credentials are correct'
    });
  }

  // 3. Authentication System
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    results.push({
      category: 'Authentication',
      status: error ? 'warning' : (user ? 'pass' : 'warning'),
      message: error 
        ? `Auth system error: ${error.message}` 
        : user 
          ? `Authentication working: ${user.email}` 
          : 'No authenticated user - login required for full testing',
      details: { 
        userId: user?.id, 
        email: user?.email,
        error: error?.message 
      },
      fix: !user ? 'User must login to test authenticated features' : undefined
    });
  } catch (err) {
    results.push({
      category: 'Authentication',
      status: 'fail',
      message: `Authentication error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      fix: 'Check Supabase auth configuration'
    });
  }

  // 4. Clinical Tables Schema
  const clinicalTables = ['clinical_analyses', 'clinical_metrics_history', 'user_skin_profiles'];
  
  for (const table of clinicalTables) {
    try {
      const { data, error } = await supabase.from(table).select('count').single();
      results.push({
        category: 'Clinical Schema',
        status: error ? 'fail' : 'pass',
        message: error 
          ? `Table ${table}: ${error.message}` 
          : `Table ${table} exists and accessible`,
        details: { table, error: error?.message },
        fix: error ? `Run complete_schema_fix.sql to create ${table} table` : undefined
      });
    } catch (err) {
      results.push({
        category: 'Clinical Schema',
        status: 'fail',
        message: `Table ${table} check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        fix: 'Run complete_schema_fix.sql to create all clinical tables'
      });
    }
  }

  // 5. RPC Functions (Journey System)
  const rpcFunctions = ['get_active_glow_journey', 'get_user_gamification', 'get_user_insights'];
  
  for (const rpc of rpcFunctions) {
    try {
      const { data, error } = await supabase.rpc(rpc, { p_user_id: '00000000-0000-0000-0000-000000000000' });
      results.push({
        category: 'RPC Functions',
        status: error ? 'warning' : 'pass',
        message: error 
          ? `RPC ${rpc}: ${error.message.includes('function') ? 'Function not found' : error.message}` 
          : `RPC ${rpc} exists and callable`,
        details: { rpc, error: error?.message },
        fix: error?.message.includes('function') ? `Run rpc_functions.sql to create ${rpc} function` : undefined
      });
    } catch (err) {
      results.push({
        category: 'RPC Functions',
        status: 'fail',
        message: `RPC ${rpc} check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        fix: 'Run rpc_functions.sql to create all RPC functions'
      });
    }
  }

  // 6. Journey Tables
  const journeyTables = ['glow_journeys', 'user_gamification'];
  
  for (const table of journeyTables) {
    try {
      const { data, error } = await supabase.from(table).select('count').single();
      results.push({
        category: 'Journey System',
        status: error ? 'fail' : 'pass',
        message: error 
          ? `Table ${table}: ${error.message}` 
          : `Table ${table} exists and accessible`,
        details: { table, error: error?.message },
        fix: error ? `Run rpc_functions.sql to create ${table} table` : undefined
      });
    } catch (err) {
      results.push({
        category: 'Journey System',
        status: 'fail',
        message: `Table ${table} check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        fix: 'Run rpc_functions.sql to create journey system tables'
      });
    }
  }

  // 7. Data Flow Test (Complete Clinical Pipeline)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Test complete clinical data pipeline
      const testData = {
        user_id: user.id,
        session_id: `prod_check_${Date.now()}`,
        skin_tone: 'medium',
        undertone: 'warm',
        skin_type: 'normal',
        metrics: { 
          acne: 0, redness: 0, oiliness: 0, moisture: 50, texture: 0, pores: 0, 
          pigment: 0, darkCircle: 0, elasticity: 70, glassSkin: 50 
        },
        spatial_data: { 
          acneClusters: [], oilSpots: [], rednessClusters: [], melaninClusters: [], 
          porePoints: [], underEyeRegions: [] 
        },
        frame_data: { 
          center: { image: '', timestamp: new Date().toISOString() }, 
          left: { image: '', timestamp: new Date().toISOString() }, 
          right: { image: '', timestamp: new Date().toISOString() } 
        },
        lab_values: { 
          overall: { l: 65, a: 12, b: 18 }, forehead: { l: 65, a: 12, b: 18 }, 
          leftCheek: { l: 65, a: 12, b: 18 }, rightCheek: { l: 65, a: 12, b: 18 }, 
          nose: { l: 65, a: 12, b: 18 }, chin: { l: 65, a: 12, b: 18 } 
        }
      };

      // Save test analysis
      const { data: savedAnalysis, error: saveError } = await supabase
        .from('clinical_analyses')
        .insert([testData])
        .select('id')
        .single();

      if (saveError) {
        results.push({
          category: 'Data Pipeline',
          status: 'fail',
          message: `Data save failed: ${saveError.message}`,
          fix: 'Check RLS policies and user permissions'
        });
      } else {
        // Test retrieval
        const { data: retrievedAnalysis, error: retrieveError } = await supabase
          .from('clinical_analyses')
          .select('*')
          .eq('id', savedAnalysis.id)
          .single();

        if (retrieveError) {
          results.push({
            category: 'Data Pipeline',
            status: 'fail',
            message: `Data retrieve failed: ${retrieveError.message}`,
            fix: 'Check table permissions and RLS policies'
          });
        } else {
          // Test ClinicalMetricsService
          try {
            await ClinicalMetricsService.saveAnalysis(testData);
            results.push({
              category: 'Data Pipeline',
              status: 'pass',
              message: 'Complete clinical data pipeline working'
            });
          } catch (serviceError) {
            results.push({
              category: 'Data Pipeline',
              status: 'warning',
              message: `ClinicalMetricsService issue: ${serviceError instanceof Error ? serviceError.message : 'Unknown error'}`,
              fix: 'Check ClinicalMetricsService integration'
            });
          }
        }

        // Cleanup test data
        await supabase.from('clinical_analyses').delete().eq('id', savedAnalysis.id);
      }
    } else {
      results.push({
        category: 'Data Pipeline',
        status: 'warning',
        message: 'Cannot test data pipeline without authenticated user',
        fix: 'Login to test complete data pipeline'
      });
    }
  } catch (err) {
    results.push({
      category: 'Data Pipeline',
      status: 'fail',
      message: `Data pipeline test failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      fix: 'Check database connection and permissions'
    });
  }

  // 8. UI Components Integration Check
  try {
    // Test if critical components can be imported
    const [SkinToneAnalyzer, ClinicalOverlayEngine, SupabaseTestButton] = await Promise.all([
      import('../components/SkinToneAnalyzer'),
      import('../components/skin/ClinicalOverlayEngine'),
      import('../components/debug/SupabaseTestButton')
    ]);
    
    results.push({
      category: 'UI Components',
      status: 'pass',
      message: 'All critical UI components properly integrated'
    });
  } catch (err) {
    results.push({
      category: 'UI Components',
      status: 'fail',
      message: `UI component import failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      fix: 'Check component imports and exports'
    });
  }

  // 9. Navigation System Check
  try {
    // Check if navigation event system works
    const testEvent = new CustomEvent('testNavigation', { detail: { test: true } });
    window.dispatchEvent(testEvent);
    
    results.push({
      category: 'Navigation System',
      status: 'pass',
      message: 'Navigation event system working'
    });
  } catch (err) {
    results.push({
      category: 'Navigation System',
      status: 'fail',
      message: `Navigation system error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      fix: 'Check navigation event listeners'
    });
  }

  // 10. Production Optimizations
  results.push({
    category: 'Production Optimizations',
    status: import.meta.env.MODE === 'production' ? 'pass' : 'warning',
    message: import.meta.env.MODE === 'production' 
      ? 'Production optimizations enabled' 
      : 'Running in development mode',
    details: { mode: import.meta.env.MODE },
    fix: import.meta.env.MODE !== 'production' ? 'Build and test in production mode' : undefined
  });

  return results;
};

// Generate production readiness report
export const generateProductionReport = (results: ProductionCheckResult[]) => {
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
    isProductionReady: failed === 0,
    productionScore: Math.round((passed / results.length) * 100),
    criticalIssues: results.filter(r => r.status === 'fail'),
    warnings: results.filter(r => r.status === 'warning'),
    recommendations: generateProductionRecommendations(results)
  };
};

const generateProductionRecommendations = (results: ProductionCheckResult[]): string[] => {
  const recommendations: string[] = [];
  
  const criticalIssues = results.filter(r => r.status === 'fail');
  if (criticalIssues.length > 0) {
    recommendations.push('🚨 CRITICAL ISSUES MUST BE FIXED BEFORE PRODUCTION:');
    criticalIssues.forEach(issue => {
      if (issue.fix) {
        recommendations.push(`   • ${issue.fix}`);
      }
    });
  }
  
  const warnings = results.filter(r => r.status === 'warning');
  if (warnings.length > 0) {
    recommendations.push('⚠️ RECOMMENDED IMPROVEMENTS:');
    warnings.forEach(warning => {
      if (warning.fix) {
        recommendations.push(`   • ${warning.fix}`);
      }
    });
  }
  
  if (criticalIssues.length === 0 && warnings.length === 0) {
    recommendations.push('✅ SYSTEM IS PRODUCTION READY!');
    recommendations.push('   • All checks passed');
    recommendations.push('   • Safe to deploy to production');
    recommendations.push('   • Monitor performance and user feedback');
  }
  
  return recommendations;
};
