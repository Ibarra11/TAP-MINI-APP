import type { ExerciseDefinition, ExerciseSet, Workout } from "../../gym-log-schema";
import { Badge, Button, H2 } from "@theaiplatform/miniapp-sdk/ui";
import { formatClock, formatDayLabel } from "./dates";

function formatSet(set: ExerciseSet): string {
  const parts: string[] = [];
  if (set.weight !== undefined) parts.push(`${set.weight} ${set.weightUnit}`);
  if (set.reps !== undefined) parts.push(`${set.reps} reps`);
  if (set.notes) parts.push(set.notes);
  return parts.join(" · ");
}

export function DayDetail({
  localDate,
  workouts,
  definitions,
  onEdit,
}: {
  localDate: string;
  workouts: readonly Workout[];
  definitions: readonly ExerciseDefinition[];
  onEdit: (workout: Workout) => void;
}) {
  const names = new Map(definitions.map((definition) => [definition.id, definition.name]));
  return (
    <div data-testid="day-detail" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <H2>{formatDayLabel(localDate)}</H2>
      {workouts.length === 0 ? <p>No sessions on this day.</p> : null}
      {workouts.map((workout) => (
        <section key={workout.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <strong>{formatClock(workout.startedAt, workout.timeZone)}</strong>
            {workout.endedAt === undefined ? <Badge>In progress</Badge> : null}
            <Button type="button" variant="outline" onClick={() => onEdit(workout)}>
              Edit
            </Button>
          </div>
          {workout.notes ? <p>{workout.notes}</p> : null}
          {workout.exercises.map((exercise) => (
            <div key={exercise.id}>
              <div>{names.get(exercise.exerciseDefinitionId) ?? exercise.exerciseDefinitionId}</div>
              <ol>
                {exercise.sets.map((set, index) => (
                  <li key={set.id}>
                    Set {index + 1}. {formatSet(set)}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
