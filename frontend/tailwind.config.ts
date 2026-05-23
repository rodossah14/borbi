import type { Config } from 'tailwindcss';

/**
 * Design system Bor-Bi Tech (issu des maquettes Stitch).
 * Toutes les couleurs, polices et utilitaires glassmorphiques
 * de l'app passent par ces tokens — pas de hex à la volée dans le code.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette Bor-Bi — voir brief produit
        fond: '#0b1326',
        surface: '#171f33',
        primaire: '#d0bcff',     // violet
        secondaire: '#4cd7f6',   // cyan
        urgence: '#ffb4ab',      // rouge SOS
        texte: '#dae2fd',
        // Variantes utiles
        'surface-haute': '#1e2740',
        'texte-doux': 'rgba(218,226,253,0.7)',
      },
      fontFamily: {
        titre: ['"Sora"', 'system-ui', 'sans-serif'],
        corps: ['"Geist"', 'system-ui', 'sans-serif'],
        montant: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      backdropBlur: {
        glass: '12px',
      },
      maxWidth: {
        // Mobile-first : la grille principale ne dépasse pas 28rem
        // sauf en desktop (md+) où on passe en 4 colonnes
        mobile: '28rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
