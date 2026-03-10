import type { Preview } from '@storybook/react'
// Carbon styles — import from shell-app's node_modules via the workspace
import '@carbon/styles/css/styles.css'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f4f4f4' },
        { name: 'dark', value: '#161616' },
      ],
    },
  },
}

export default preview
