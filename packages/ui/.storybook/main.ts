import type { StorybookConfig } from '@storybook/react-vite'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  refs: {
    'frame-ui-components': {
      title: 'Frame UI Components',
      url: 'http://localhost:6007',
    },
    'cv-builder': {
      title: 'CV Builder',
      url: 'http://localhost:6008',
    },
    'blogengine': {
      title: 'BlogEngine',
      url: 'http://localhost:6009',
    },
    'tripplanner': {
      title: 'TripPlanner',
      url: 'http://localhost:6010',
    },
  },
  viteFinal: async (config) =>
    mergeConfig(config, {
      resolve: {
        dedupe: ['react', 'react-dom', 'storybook', '@storybook/core'],
      },
    }),
}

export default config
