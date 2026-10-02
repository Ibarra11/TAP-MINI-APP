import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import type { RsbuildPlugin } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';
import { tapLifecycleTarget } from '@theaiplatform/miniapp-sdk/rspack';

const require = createRequire(import.meta.url);
const reactPackageRoot = dirname(require.resolve('react/package.json'));
const reactDomPackageRoot = dirname(require.resolve('react-dom/package.json'));

const singleReactRuntimePlugin: RsbuildPlugin = {
  name: "hello-miniapp:single-react-runtime",
  setup(api) {
    api.modifyBundlerChain((chain) => {
      chain.resolve.alias
        .set('react', reactPackageRoot)
        .set('react-dom', reactDomPackageRoot);
    });
  },
};

const desktop = tapLifecycleTarget();
desktop.output = {
  ...desktop.output,
  assetPrefix: 'auto',
  sourceMap: false,
  minify: true,
};
desktop.plugins = [...(desktop.plugins ?? []), singleReactRuntimePlugin];

export default defineConfig({ plugins: [pluginReact()], lib: [desktop] });
