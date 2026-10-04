import { createRoot } from "react-dom/client";
import { TooltipProvider } from "@theaiplatform/miniapp-sdk/ui";
import "@theaiplatform/miniapp-sdk/ui/styles.css";
import { builtInExercises, type Workout } from "../gym-log-schema";
import { ExerciseList } from "../src/gym-log/exercise-list";

const workouts: Workout[] = [
  {
    id: "w1",
    startedAt: "2026-10-01T15:00:00.000Z",
    timeZone: "America/Los_Angeles",
    exercises: [
      {
        id: "e1",
        exerciseDefinitionId: "bench_press",
        sets: [],
      },
    ],
  },
];

const definitions = [
  ...builtInExercises,
  {
    id: "face_pull",
    name: "Face Pull",
    targets: ["shoulders" as const, "back" as const],
    isCustom: true,
  },
];

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <div style={{ width: 960, padding: 16 }}>
      <ExerciseList
        definitions={definitions}
        workouts={workouts}
        onAdd={() => undefined}
        onUpdate={() => undefined}
        onDelete={() => undefined}
      />
    </div>
  </TooltipProvider>,
);
