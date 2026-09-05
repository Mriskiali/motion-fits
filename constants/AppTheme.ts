/**
 * Bionic Health & Warm Wellness Design Tokens
 * Modern, Minimalist Fitness Architecture
 */

export const AppTheme = {
  colors: {
    // Canvas & Surfaces
    canvas: '#F4F6F2', // Soft warm sage-tinted paper white
    surfaceCard: '#FFFFFF', // Clean elevated white
    heroBackground: '#132A1E', // Deep Forest Base
    heroGradientEnd: '#1B3B2B', // Deep Forest Highlight
    dateBadgeSelected: '#EAE5D9', // Warm beige / cream indicator

    // Accents & Actions
    accentPrimary: '#B7F34D', // Vibrant Lime (High energy CTA)
    accentLimeAlt: '#9EE837',
    accentSecondary: '#1B4D3E', // Forest Emerald
    accentMint: '#A7F3D0', // Recovery status mint tint

    // Neutrals & Typography
    textPrimary: '#111827', // Deep Charcoal
    textSecondary: '#6B7280', // Muted Slate Gray
    textMuted: '#9CA3AF', // Labels, Dates
    textWhite: '#FFFFFF',

    // Bento Tile Pastels
    bentoSteps: '#FDF3E7', // Warm peach/cream tint
    bentoCalories: '#EBF7EE', // Soft mint tint
    bentoActiveTime: '#FEF9E7', // Soft buttery warm tint
    bentoDistance: '#E8F8F5', // Soft teal/ice tint

    // Borders & Overlays
    borderSubtle: 'rgba(27, 77, 62, 0.08)',
    borderCard: '#EAE8E0',
    overlay: 'rgba(19, 42, 30, 0.4)',
  },

  radius: {
    bentoCard: 24,
    majorCard: 24,
    button: 20,
    input: 14,
    module: 14,
    floatingNav: 36,
    capsule: 9999,
  },

  shadows: {
    warmCard: {
      shadowColor: '#1A2E20',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
    floatingBar: {
      shadowColor: '#1A2E20',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 8,
    },
    heroGlow: {
      shadowColor: '#132A1E',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 4,
    },
    ctaGlow: {
      shadowColor: '#B7F34D',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 3,
    },
  },

  typography: {
    weights: {
      heavy: '800' as const,
      bold: '700' as const,
      semiBold: '600' as const,
      medium: '500' as const,
      regular: '400' as const,
    },
  },
};

export type AppThemeType = typeof AppTheme;
export default AppTheme;
