/**
 * Device Detection Utility - Production-Grade Performance Optimization
 * Detects mobile vs desktop devices for performance tuning
 */

export interface DeviceCapabilities {
  isMobile: boolean;
  isDesktop: boolean;
  maxConcurrentSpots: number;
  animationInterval: number;
  blurReduction: number;
  enableComplexAnimations: boolean;
}

/**
 * Detect device type and return performance-optimized settings
 */
export const detectDeviceCapabilities = (): DeviceCapabilities => {
  // Mobile detection using multiple indicators for reliability
  const isMobile = (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    // Touch capability detection
    ('ontouchstart' in window) ||
    // Screen size detection (smaller screens are likely mobile)
    (window.innerWidth <= 768) ||
    // Memory and CPU indicators (if available)
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
  );

  const isDesktop = !isMobile;

  // Performance settings based on device type
  const settings: DeviceCapabilities = {
    isMobile,
    isDesktop,
    maxConcurrentSpots: isMobile ? 250 : 800,
    animationInterval: isMobile ? 200 : 50, // ms
    blurReduction: isMobile ? 0.4 : 1.0, // 40% blur on mobile vs full blur on desktop
    enableComplexAnimations: !isMobile, // Disable complex animations on mobile
  };

  console.log(`🔍 Device Detection: ${isMobile ? 'Mobile' : 'Desktop'} detected`);
  console.log(`📊 Performance Settings:`, settings);

  return settings;
};

/**
 * Get performance mode based on device capabilities and user preference
 */
export const getPerformanceMode = (
  userPreference: 'high' | 'eco' | 'auto' = 'auto',
  deviceCapabilities?: DeviceCapabilities
): 'high' | 'eco' => {
  const device = deviceCapabilities || detectDeviceCapabilities();
  
  if (userPreference === 'auto') {
    return device.isMobile ? 'eco' : 'high';
  }
  
  return userPreference;
};

/**
 * Check if device is under stress (thermal throttling detection)
 */
export const isDeviceUnderStress = (): boolean => {
  // Check for performance degradation indicators
  const hasLowFPS = false; // Could be implemented with FPS monitoring
  const hasHighCPUUsage = false; // Could be implemented with performance API
  
  return hasLowFPS || hasHighCPUUsage;
};

/**
 * Adaptive performance settings based on device stress
 */
export const getAdaptiveSettings = (baseSettings: DeviceCapabilities): DeviceCapabilities => {
  const isStressed = isDeviceUnderStress();
  
  if (isStressed) {
    console.warn('⚠️ Device under stress - applying conservative settings');
    return {
      ...baseSettings,
      maxConcurrentSpots: Math.floor(baseSettings.maxConcurrentSpots * 0.5),
      animationInterval: baseSettings.animationInterval * 2,
      blurReduction: baseSettings.blurReduction * 0.5,
      enableComplexAnimations: false,
    };
  }
  
  return baseSettings;
};
