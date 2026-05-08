import { useMemo } from 'react';

interface BrandingConfig {
  logoPath: string;
  title: string;
}

const useBranding = (): BrandingConfig => {
  const brandingConfig = useMemo(() => {
    const logoPath = import.meta.env.VITE_APP_BRANDING_LOGO_PATH;
    const title = import.meta.env.VITE_APP_BRANDING_TITLE;

    return {
      logoPath: logoPath || '',
      title: title || '',
    };
  }, []);

  return brandingConfig;
};

export default useBranding;
