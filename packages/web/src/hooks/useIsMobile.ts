import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile screen size
 * Returns true for screens smaller than 640px (Tailwind's sm breakpoint)
 */
const useIsMobile = (breakpoint: number = 640): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Initial check
    checkIsMobile();

    // Add event listener
    window.addEventListener('resize', checkIsMobile);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, [breakpoint]);

  return isMobile;
};

export default useIsMobile;
