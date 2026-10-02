import type {
  TapFederatedSurfaceMount,
  TapFederatedSurfaceMountContext,
} from "@theaiplatform/miniapp-sdk/surface";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  H1,
  SurfaceViewport,
} from "@theaiplatform/miniapp-sdk/ui";
import "@theaiplatform/miniapp-sdk/ui/styles.css";
import { installMiniAppAppearanceSync } from "@theaiplatform/miniapp-sdk/web";
import { createRoot } from "react-dom/client";

function StarterSurface({
  context,
}: Readonly<{ context: TapFederatedSurfaceMountContext }>) {
  return (
    <SurfaceViewport className="p-6">
      <Card data-component="StarterSurface" data-testid="starter-surface">
        <CardHeader>
          <Badge variant="secondary">Capability-free starter</Badge>
          <H1>{"Hello World"}</H1>
          <CardDescription>
            {"A capability-free desktop miniapp for The AI Platform."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CardTitle>Host-provided identity</CardTitle>
          <dl data-testid="starter-identity">
            <dt>Package</dt>
            <dd>{context.packageId}</dd>
            <dt>Contribution</dt>
            <dd>{context.contributionId}</dd>
            <dt>Release</dt>
            <dd>{context.releaseId}</dd>
          </dl>
        </CardContent>
      </Card>
    </SurfaceViewport>
  );
}

export function mount(
  container: HTMLElement,
  context: TapFederatedSurfaceMountContext,
): TapFederatedSurfaceMount {
  const stopAppearanceSync = installMiniAppAppearanceSync();
  const root = createRoot(container);
  root.render(<StarterSurface context={context} />);
  let mounted = true;
  return {
    unmount() {
      if (!mounted) return;
      mounted = false;
      stopAppearanceSync();
      root.unmount();
    },
  };
}

export default Object.freeze({ mount, surfaceTarget: "desktop" as const });
