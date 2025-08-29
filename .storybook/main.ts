import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest"
  ],
  "framework": {
    "name": "@storybook/react-vite",
    "options": {}
  },
  async viteFinal(config) {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../src'),
      };
    }

    // Workaround for lucide-react ESM resolution issues in Storybook/Chromatic
    // Ensure Vite doesn't pre-bundle it oddly and that SSR bundling treats it as internal
    config.optimizeDeps = {
      ...(config.optimizeDeps || {}),
      exclude: [
        ...((config.optimizeDeps && config.optimizeDeps.exclude) || []),
        'lucide-react',
      ],
    };

    // In SSR, ensure lucide-react is bundled (not externalized) to avoid missing icon files
    // See: https://vitejs.dev/guide/ssr.html#ssr-externals
    // Storybook runs Vite in a way where this may be relevant during Chromatic builds
    // noExternal can be array or boolean; normalize it for safe extension
    const ssrConfig = (config as any).ssr;
    const noExternal = ssrConfig?.noExternal;
    const currentNoExternal = Array.isArray(noExternal) ? noExternal : noExternal ? [noExternal] : [];

    (config as any).ssr = {
      ...((config as any).ssr || {}),
      noExternal: [...currentNoExternal, 'lucide-react'],
    };
    return config;
  },
};
export default config;