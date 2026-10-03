import packageJson from "./package.json" with { type: "json" };
import {
  defineTapMiniapp,
  packageContributionProvider,
} from "@theaiplatform/miniapp-sdk/authoring";
import { commandTargetBuilder } from "@theaiplatform/miniapp-sdk/lifecycle";

export default defineTapMiniapp({
  versionLabel: packageJson.version,
  presentation: {
    name: "Gym Log",
    slug: "hello-miniapp",
    description:
      "Log workouts, review a day, and compare one exercise over time.",
    categories: ["other"],
  },
  compatibility: { tapHost: ">=2.5.5" },
  targets: {
    desktop: {
      remoteName: "tap_hello_miniapp_desktop",
      exposes: {
        "./tap/lifecycle": {
          source: "./src/lifecycle.ts",
          runtime: "webview",
        },
        "./ui/desktop": {
          source: "./src/surface.tsx",
          runtime: "webview",
        },
      },
      builder: commandTargetBuilder({
        id: "rslib",
        command: "pnpm",
        args: ["run", "build:target"],
      }),
    },
  },
  contributions: [
    {
      kind: "ui.surface",
      id: "hello-miniapp-surface",
      apiVersion: 1,
      targets: {
        desktop: { expose: "./ui/desktop", runtime: "webview" },
      },
      lifecycleScope: "mount",
      authorization: {
        effects: [{ kind: "storage", resources: ["gym-log"] }],
      },
      options: {
        displayName: "Gym Log",
        description:
          "Log workouts, review a day, and compare one exercise over time.",
        placement: "workspace-left",
        scope: "workspace",
        instancePolicy: "per-workspace",
        persistence: "none",
      },
    },
    {
      kind: "permission.catalog",
      id: "gym-log-permissions",
      apiVersion: 1,
      options: {
        actions: [
          {
            id: "storage.profile.files.read",
            resource: "profile-storage-files",
            scopes: ["user"],
            directActors: ["human"],
            delegatedActors: [],
            autonomyCeiling: "listen",
            consent: "reusable",
            risk: "read",
          },
          {
            id: "storage.profile.files.write",
            resource: "profile-storage-files",
            scopes: ["user"],
            directActors: ["human"],
            delegatedActors: [],
            autonomyCeiling: "do",
            consent: "reusable",
            risk: "write",
          },
          {
            id: "storage.profile.sqlite",
            resource: "profile-storage-sqlite",
            scopes: ["user"],
            directActors: ["human"],
            delegatedActors: [],
            autonomyCeiling: "do",
            consent: "reusable",
            risk: "write",
          },
        ],
      },
    },
    {
      kind: "miniapp",
      id: "hello-miniapp",
      apiVersion: 1,
      options: { contributionIds: ["hello-miniapp-surface"] },
    },
    packageContributionProvider(),
  ],
  runtimePolicy: {
    checkpoint: "none",
    lifecycleExpose: "./tap/lifecycle",
  },
});
