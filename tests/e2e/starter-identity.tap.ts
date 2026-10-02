import { expect, test } from '@theaiplatform/miniapp-sdk/testing/rstest';

test('shows host-provided runtime context', async ({ surface }) => {
  await expect(surface.getByTestId('starter-surface')).toBeVisible();
  await expect(surface.getByTestId('starter-identity')).toContainText("hello-miniapp-surface");
});
