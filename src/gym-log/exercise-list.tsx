import { useState } from "react";
import type { ExerciseDefinition, MuscleGroup, Workout } from "../../gym-log-schema";
import { Badge, Button, Checkbox, Field, FieldLabel, Input } from "@theaiplatform/miniapp-sdk/ui";
import { MUSCLE_GROUPS, validateExerciseDetails } from "./validate";

function TargetPicker({
  targets,
  onChange,
}: {
  targets: readonly MuscleGroup[];
  onChange: (targets: MuscleGroup[]) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {MUSCLE_GROUPS.map((group) => (
        <label key={group} style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <Checkbox
            checked={targets.includes(group)}
            onCheckedChange={(checked) =>
              onChange(
                checked === true
                  ? MUSCLE_GROUPS.filter((item) => item === group || targets.includes(item))
                  : targets.filter((item) => item !== group),
              )
            }
          />
          {group}
        </label>
      ))}
    </div>
  );
}

function Issues({ issues }: { issues: readonly string[] }) {
  if (issues.length === 0) return null;
  return (
    <ul role="alert">
      {issues.map((issue) => (
        <li key={issue}>{issue}</li>
      ))}
    </ul>
  );
}

export function ExerciseList({
  definitions,
  workouts,
  onAdd,
  onUpdate,
  onDelete,
}: {
  definitions: readonly ExerciseDefinition[];
  workouts: readonly Workout[];
  onAdd: (name: string, targets: MuscleGroup[]) => void;
  onUpdate: (definition: ExerciseDefinition) => void;
  onDelete: (definition: ExerciseDefinition) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newTargets, setNewTargets] = useState<MuscleGroup[]>([]);
  const [addIssues, setAddIssues] = useState<string[]>([]);
  const [editing, setEditing] = useState<ExerciseDefinition | null>(null);
  const [editIssues, setEditIssues] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const usage = new Map<string, number>();
  for (const workout of workouts) {
    for (const id of new Set(workout.exercises.map((exercise) => exercise.exerciseDefinitionId))) {
      usage.set(id, (usage.get(id) ?? 0) + 1);
    }
  }

  return (
    <div data-testid="exercise-list" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <form
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
        onSubmit={(event) => {
          event.preventDefault();
          const issues = validateExerciseDetails(
            { id: "", name: newName, targets: newTargets, isCustom: true },
            definitions,
          );
          setAddIssues(issues);
          if (issues.length > 0) return;
          onAdd(newName.trim(), newTargets);
          setNewName("");
          setNewTargets([]);
        }}
      >
        <Field>
          <FieldLabel htmlFor="new-exercise-name">New exercise</FieldLabel>
          <Input
            id="new-exercise-name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
        </Field>
        <TargetPicker targets={newTargets} onChange={setNewTargets} />
        <Issues issues={addIssues} />
        <div>
          <Button type="submit">Add exercise</Button>
        </div>
      </form>
      {definitions.map((definition) => {
        const count = usage.get(definition.id) ?? 0;
        if (editing?.id === definition.id) {
          return (
            <section key={definition.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Field>
                <FieldLabel htmlFor={`${definition.id}-name`}>Name</FieldLabel>
                <Input
                  id={`${definition.id}-name`}
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                />
              </Field>
              <TargetPicker
                targets={editing.targets}
                onChange={(targets) => setEditing({ ...editing, targets })}
              />
              <Issues issues={editIssues} />
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  type="button"
                  onClick={() => {
                    const issues = validateExerciseDetails(editing, definitions);
                    setEditIssues(issues);
                    if (issues.length > 0) return;
                    onUpdate(editing);
                    setEditing(null);
                  }}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(null);
                    setEditIssues([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </section>
          );
        }
        return (
          <section key={definition.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <strong>{definition.name}</strong>
              {definition.isCustom ? <Badge>Custom</Badge> : null}
            </div>
            <div>{definition.targets.length > 0 ? definition.targets.join(", ") : "No targets"}</div>
            <div>{count === 1 ? "Used in 1 workout" : `Used in ${count} workouts`}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {pendingDelete === definition.id ? (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setPendingDelete(null);
                      onDelete(definition);
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing({ ...definition, targets: [...definition.targets] });
                      setEditIssues([]);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={count > 0}
                    title={count > 0 ? "Remove it from its workouts before deleting." : undefined}
                    onClick={() => setPendingDelete(definition.id)}
                  >
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
