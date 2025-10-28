import * as fs from 'fs';
import * as path from 'path';

// Branding configuration interface
interface BrandingConfig {
  logoPath?: string;
  title?: string;
}

// Load branding configuration from JSON file
export const loadBrandingConfig = (): BrandingConfig => {
  const brandingPath = path.join(__dirname, 'branding.json');
  try {
    if (fs.existsSync(brandingPath)) {
      const brandingData = fs.readFileSync(brandingPath, 'utf8');
      return JSON.parse(brandingData);
    }
  } catch (error) {
    console.warn('Failed to load branding.json, using defaults:', error);
  }
  return {};
};
