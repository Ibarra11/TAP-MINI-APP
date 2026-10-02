# Hello Miniapp

A capability-free desktop miniapp for The AI Platform.

TAP assigns package and release identity when this source is imported into a workspace-owned package. This project keeps only local display metadata, build/runtime names, and contribution IDs.

## Add package contributions

Create a package-owned specialist without prompts:

```bash
pnpm exec tap-miniapp create specialist \
  --id query-expert \
  --purpose "Analyze query results and explain the important details." \
  --non-interactive \
  --json
```

Give that specialist a host-rendered report block:

```bash
pnpm exec tap-miniapp create chat-block \
  --id query-report \
  --specialist query-expert \
  --primitive report \
  --non-interactive \
  --json
```

Run `pnpm exec tap-miniapp --help` for the complete command contract. Create commands refuse to overwrite existing contributions or files.

## Develop

Run `pnpm dev`, then link the assembled `dist` directory once from Miniapps settings in The AI Platform. Subsequent successful builds refresh that linked-local package automatically.

The development command builds and assembles package generations. It does not install, approve, load, or activate the miniapp in The AI Platform.

## Surface layout

The generated surface document uses the host-provided height and disables body scrolling. The starter keeps `SurfaceViewport` as its one vertical scroll owner, so content beyond the visible frame remains reachable with mouse, trackpad, keyboard, and touch input.

Keep `SurfaceViewport` at the full-page root. Flex and grid wrappers between it and a nested scroll region need `min-height: 0` (or Tailwind `min-h-0`). Use `height: 100%`, not `100vh`, because the host owns the webview size. A wide table can use a nested `overflow-x-auto overscroll-x-contain` wrapper without taking vertical scrolling away from the surface.

## Test

Surface tests run in The AI Platform Miniapp Test Lab, which supplies the host session they mount against. `pnpm test` fails outside the Test Lab because no local runner can supply that session; this is expected and does not mean the project is broken.

These checks do run locally:

```bash
pnpm exec tap-miniapp check           # the descriptor validates
pnpm exec tap-miniapp-test doctor     # the manifest and test descriptor agree
pnpm exec tap-miniapp-test matrix     # every declared surface resolves to a profile
pnpm run typecheck:tap                # the tests compile
pnpm run typecheck                    # the project compiles
```

Run `tap-miniapp-test doctor` after renaming or removing a contribution. `tap.test.json` is generated and its profile IDs are derived from the contribution ID and target, so a rename leaves it pointing at a surface that no longer exists. Doctor reports that as `matrix.unknown-cell`.

## Publish

`presentation.categories` in `tap-miniapp.config.ts` starts as `['other']`. Choose up to three accurate categories from the published taxonomy before listing this miniapp; discovery quality depends on it.
# TAP-MINI-APP
