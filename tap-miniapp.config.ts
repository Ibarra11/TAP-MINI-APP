import packageJson from './package.json' with { type: 'json' };
import {
  defineTapMiniapp,
  packageContributionProvider,
} from '@theaiplatform/miniapp-sdk/authoring';
import { commandTargetBuilder } from '@theaiplatform/miniapp-sdk/lifecycle';

export default defineTapMiniapp({
  versionLabel: packageJson.version,
  presentation: {
    name: "Hello Miniapp",
    slug: "hello-miniapp",
    description: "A capability-free desktop miniapp for The AI Platform.",
    categories: ['other'],
  },
  compatibility: { tapHost: '>=2.5.5' },
  targets: {
    desktop: {
      remoteName: "tap_hello_miniapp_desktop",
      exposes: {
        './tap/lifecycle': {
          source: './src/lifecycle.ts',
          runtime: 'webview',
        },
        './ui/desktop': {
          source: './src/surface.tsx',
          runtime: 'webview',
        },
      },
      builder: commandTargetBuilder({
        id: 'rslib',
        command: 'pnpm',
        args: ['run', 'build:target'],
      }),
    },
  },
  contributions: [
    {
      kind: 'ui.surface',
      id: "hello-miniapp-surface",
      apiVersion: 1,
      targets: {
        desktop: { expose: './ui/desktop', runtime: 'webview' },
      },
      lifecycleScope: 'mount',
      options: {
        displayName: "Hello Miniapp",
        description: "A capability-free desktop miniapp for The AI Platform.",
        placement: 'workspace-left',
        scope: 'workspace',
        instancePolicy: 'per-workspace',
        persistence: 'none',
      },
    },
    {
      kind: 'miniapp',
      id: "hello-miniapp",
      apiVersion: 1,
      options: { contributionIds: ["hello-miniapp-surface"] },
    },
    packageContributionProvider(),
  ],
  runtimePolicy: {
    checkpoint: 'none',
    lifecycleExpose: "./tap/lifecycle",
  },
});
