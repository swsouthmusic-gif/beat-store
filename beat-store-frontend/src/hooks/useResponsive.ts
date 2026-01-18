import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive breakpoints
 * Provides a single source of truth for screen size breakpoints
 */
export const useResponsive = () => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isVerySmallScreen, setIsVerySmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsSmallScreen(width <= 1024);
      setIsVerySmallScreen(width <= 480);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return {
    isSmallScreen,
    isVerySmallScreen,
  };
};
