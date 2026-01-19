import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive breakpoints
 * Provides a single source of truth for screen size breakpoints
 */
export const useResponsive = () => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isVerySmallScreen, setIsVerySmallScreen] = useState(false);
  const [isMediumScreen, setIsMediumScreen] = useState(false);
  const [isTabletOrSmaller, setIsTabletOrSmaller] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsSmallScreen(width < 769);
      setIsMediumScreen(width >= 769 && width <= 1024);
      setIsVerySmallScreen(width <= 480);
      setIsTabletOrSmaller(width <= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return {
    isSmallScreen,
    isVerySmallScreen,
    isMediumScreen,
    isTabletOrSmaller,
  };
};
