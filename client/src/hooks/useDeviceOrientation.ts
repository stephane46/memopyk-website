import { useState, useEffect } from 'react';

interface DeviceOrientationData {
  orientation: 'portrait' | 'landscape';
  angle: number;
  isSupported: boolean;
}

export function useDeviceOrientation(): DeviceOrientationData {
  const [orientation, setOrientation] = useState<DeviceOrientationData>({
    orientation: 'portrait',
    angle: 0,
    isSupported: typeof window !== 'undefined' && 'screen' in window && 'orientation' in window.screen
  });

  useEffect(() => {
    if (!orientation.isSupported) return;

    const updateOrientation = () => {
      const screen = window.screen as any;
      const angle = screen.orientation?.angle || window.orientation || 0;
      const isLandscape = Math.abs(angle) === 90;

      setOrientation(prev => ({
        ...prev,
        orientation: isLandscape ? 'landscape' : 'portrait',
        angle
      }));
    };

    // Initial check
    updateOrientation();

    // Listen for orientation changes
    window.addEventListener('orientationchange', updateOrientation);
    window.addEventListener('resize', updateOrientation);

    return () => {
      window.removeEventListener('orientationchange', updateOrientation);
      window.removeEventListener('resize', updateOrientation);
    };
  }, [orientation.isSupported]);

  return orientation;
}