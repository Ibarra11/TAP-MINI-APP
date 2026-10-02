import { expect, test } from '@theaiplatform/miniapp-sdk/testing/rstest';

const PACKAGE_ID = "hello-miniapp";
const SURFACE_TARGET_CELLS = new Set(["hello-miniapp-surface\u0000desktop"]);
const PROFILE_IDS = new Set(["hello-miniapp-surface-desktop-eaac7c3feb646fd2a61895cd"]);
const MATRIX_ENTRY_IDS = new Set(["hello-miniapp-surface-desktop-eaac7c3feb646fd2a61895cd"]);
const SHA256 = /^[a-f0-9]{64}$/u;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;

test('mounts visible content for the exact declared TAP cell with reproducible provenance', async ({ surface, tap }) => {
  expect(tap.packageId).toBe(PACKAGE_ID);
  expect(SURFACE_TARGET_CELLS.has(`${tap.surfaceId}\0${tap.target}`)).toBe(true);
  expect(PROFILE_IDS.has(tap.profileId)).toBe(true);
  expect(MATRIX_ENTRY_IDS.has(tap.matrixEntryId)).toBe(true);
  expect(tap.seed).toBe(tap.environment.seed);
  expect(tap.adapterVersion).toMatch(SEMVER);
  expect(tap.hostVersion).toMatch(SEMVER);
  expect(tap.hostContractVersion).toMatch(/^\d+$/u);
  expect(tap.runnerName).toBe('rstest');
  expect(tap.runnerVersion).toMatch(SEMVER);
  expect(tap.sourceDigest).toMatch(SHA256);
  expect(tap.testBundleDigest).toMatch(SHA256);
  expect(tap.descriptorDigest).toMatch(SHA256);
  expect(tap.policyDigest).toMatch(SHA256);
  if (tap.mode === 'surface') expect(tap.fixtureDigest).toMatch(SHA256);
  else expect(tap.fixtureDigest).toBeUndefined();

  // Surface reset restores one-shot descriptor fixtures before remounting.
  if (tap.mode === 'surface') await tap.control.reset();
  else await tap.control.remountSurface();
  const root = surface.locator('#tap-root');
  await expect(root).toBeVisible();
  await expect(root.locator(':scope > *').first()).toBeAttached();
  await expect(surface.locator('#tap-error')).toBeHidden();

  const scrollOwner = root.locator('.tap-surface-scroll-root').first();
  await expect(scrollOwner).toBeVisible();
  const scrollProbe = await scrollOwner.evaluate((element) => {
    const originalScrollTop = element.scrollTop;
    element.scrollTop = 0;
    const probe = document.createElement('div');
    const probeHeight = element.clientHeight + 1;
    probe.setAttribute('aria-hidden', 'true');
    probe.style.height = String(probeHeight) + 'px';
    probe.style.minHeight = String(probeHeight) + 'px';
    probe.style.flex = '0 0 ' + String(probeHeight) + 'px';
    probe.style.pointerEvents = 'none';
    element.append(probe);
    const overflowed = element.scrollHeight > element.clientHeight;
    element.scrollTop = 1;
    const moved = element.scrollTop > 0;
    const clientHeight = element.clientHeight;
    probe.remove();
    element.scrollTop = originalScrollTop;
    return { clientHeight, moved, overflowed };
  });
  expect(scrollProbe.clientHeight).toBeGreaterThan(0);
  expect(scrollProbe.overflowed).toBe(true);
  expect(scrollProbe.moved).toBe(true);

  // Add one app-specific loaded-state assertion so an app-owned error shell
  // cannot pass this structural smoke check or produce a misleading screenshot.
});
