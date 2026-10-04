import { useState, type SVGProps } from "react";
import type {
  ExerciseDefinition,
  MuscleGroup,
  Workout,
} from "../../gym-log-schema";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Checkbox,
  Field,
  FieldLabel,
  Input,
  MiniAppIconButton,
} from "@theaiplatform/miniapp-sdk/ui";
import { MUSCLE_GROUPS, validateExerciseDetails } from "./validate";

const GRID_COLUMNS = "repeat(3, minmax(0, 1fr))";

function strokeIcon(paths: readonly string[]) {
  return function StrokeIcon({
    size,
    ...props
  }: SVGProps<SVGSVGElement> & { size?: string }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  };
}

const PencilIcon = strokeIcon([
  "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
  "m15 5 4 4",
]);

const TrashIcon = strokeIcon([
  "M10 11v6",
  "M14 11v6",
  "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
  "M3 6h18",
  "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
]);

function muscleLabel(group: MuscleGroup): string {
  return group.charAt(0).toUpperCase() + group.slice(1);
}

function TargetPicker({
  targets,
  onChange,
}: {
  targets: readonly MuscleGroup[];
  onChange: (targets: MuscleGroup[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">Targets</span>
      <div className="flex flex-wrap gap-2">
        {MUSCLE_GROUPS.map((group) => (
          <label key={group} className="flex items-center gap-1.5 text-sm">
            <Checkbox
              checked={targets.includes(group)}
              onCheckedChange={(checked) =>
                onChange(
                  checked === true
                    ? MUSCLE_GROUPS.filter(
                        (item) => item === group || targets.includes(item),
                      )
                    : targets.filter((item) => item !== group),
                )
              }
            />
            {muscleLabel(group)}
          </label>
        ))}
      </div>
    </div>
  );
}

function TargetBadges({ targets }: { targets: readonly MuscleGroup[] }) {
  if (targets.length === 0) {
    return <p className="m-0 text-sm text-muted-foreground">No targets</p>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">Targets</span>
      <div className="flex flex-wrap gap-1">
        {targets.map((group) => (
          <Badge key={group} variant="secondary">
            {muscleLabel(group)}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function Issues({ issues }: { issues: readonly string[] }) {
  if (issues.length === 0) return null;
  return (
    <ul
      role="alert"
      className="m-0 flex list-disc flex-col gap-1 text-sm"
      style={{ paddingLeft: "1.25rem" }}
    >
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
    for (const id of new Set(
      workout.exercises.map((exercise) => exercise.exerciseDefinitionId),
    )) {
      usage.set(id, (usage.get(id) ?? 0) + 1);
    }
  }

  return (
    <div data-testid="exercise-list" className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3"
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
      <ul
        className="m-0 grid gap-4 p-0"
        style={{ gridTemplateColumns: GRID_COLUMNS, listStyle: "none" }}
      >
        {definitions.map((definition) => {
          const count = usage.get(definition.id) ?? 0;
          const confirming = pendingDelete === definition.id;
          const isEditing = editing?.id === definition.id;
          return (
            <li
              key={definition.id}
              style={isEditing ? { gridColumn: "1 / -1" } : undefined}
            >
              <Card className="flex h-full flex-col gap-3 border border-border p-4">
                {isEditing && editing ? (
                  <div className="flex flex-col gap-3">
                    <Field>
                      <FieldLabel htmlFor={`${definition.id}-name`}>Name</FieldLabel>
                      <Input
                        id={`${definition.id}-name`}
                        value={editing.name}
                        onChange={(event) =>
                          setEditing({ ...editing, name: event.target.value })
                        }
                      />
                    </Field>
                    <TargetPicker
                      targets={editing.targets}
                      onChange={(targets) => setEditing({ ...editing, targets })}
                    />
                    <Issues issues={editIssues} />
                    <div className="flex gap-2">
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
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <CardTitle className="truncate text-base">
                            {definition.name}
                          </CardTitle>
                          {definition.isCustom ? (
                            <Badge variant="outline">Custom</Badge>
                          ) : null}
                        </div>
                        <CardDescription>
                          {count === 1 ? "Used in 1 workout" : `Used in ${count} workouts`}
                        </CardDescription>
                      </div>
                      {confirming ? null : (
                        <div className="flex shrink-0 gap-1">
                          <MiniAppIconButton
                            icon={PencilIcon}
                            label={`Edit ${definition.name}`}
                            onClick={() => {
                              setPendingDelete(null);
                              setEditing({
                                ...definition,
                                targets: [...definition.targets],
                              });
                              setEditIssues([]);
                            }}
                          />
                          <MiniAppIconButton
                            icon={TrashIcon}
                            label={
                              count > 0
                                ? `Remove ${definition.name} from its workouts before deleting.`
                                : `Delete ${definition.name}`
                            }
                            disabled={count > 0}
                            onClick={() => setPendingDelete(definition.id)}
                          />
                        </div>
                      )}
                    </div>
                    <TargetBadges targets={definition.targets} />
                    {confirming ? (
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <span className="text-sm">Delete this exercise?</span>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setPendingDelete(null)}
                          >
                            Keep
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setPendingDelete(null);
                              onDelete(definition);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
