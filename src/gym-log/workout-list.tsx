import { useState } from "react";
import type { ExerciseDefinition, Workout } from "../../gym-log-schema";
import { Badge, Button, MiniAppPageState } from "@theaiplatform/miniapp-sdk/ui";
import { formatClock, formatDayLabel, localDate } from "./dates";

export function WorkoutList({
  workouts,
  definitions,
  onAdd,
  onEdit,
  onDelete,
}: {
  workouts: readonly Workout[];
  definitions: readonly ExerciseDefinition[];
  onAdd: () => void;
  onEdit: (workout: Workout) => void;
  onDelete: (workout: Workout) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const names = new Map(definitions.map((definition) => [definition.id, definition.name]));

  if (workouts.length === 0) {
    return (
      <MiniAppPageState
        kind="empty"
        title="No workouts yet"
        description="Add a workout to see it here."
        action={
          <Button type="button" onClick={onAdd}>
            Add workout
          </Button>
        }
      />
    );
  }

  return (
    <div data-testid="workout-list" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Button type="button" onClick={onAdd}>
          Add workout
        </Button>
      </div>
      {workouts.map((workout) => {
        const exerciseNames = [
          ...new Set(
            workout.exercises.map(
              (exercise) => names.get(exercise.exerciseDefinitionId) ?? exercise.exerciseDefinitionId,
            ),
          ),
        ];
        const setCount = workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
        return (
          <section key={workout.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <strong>
                {formatDayLabel(localDate(workout.startedAt, workout.timeZone))} ·{" "}
                {formatClock(workout.startedAt, workout.timeZone)}
              </strong>
              {workout.endedAt === undefined ? <Badge>In progress</Badge> : null}
            </div>
            <div>{exerciseNames.length > 0 ? exerciseNames.join(", ") : "No exercises"}</div>
            <div>{setCount === 1 ? "1 set" : `${setCount} sets`}</div>
            {workout.notes ? <p>{workout.notes}</p> : null}
            <div style={{ display: "flex", gap: 8 }}>
              {pendingDelete === workout.id ? (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setPendingDelete(null);
                      onDelete(workout);
                    }}
                  >
                    Confirm delete
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setPendingDelete(null)}>
                    Keep
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => onEdit(workout)}>
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setPendingDelete(workout.id)}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
