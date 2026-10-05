import { useState } from "react";
import type {
  ExerciseDefinition,
  ExerciseSet,
  MuscleGroup,
  WeightUnit,
  Workout,
  WorkoutExercise,
} from "../../gym-log-schema";
import {
  Button,
  Checkbox,
  Field,
  FieldLabel,
  Input,
  NativeSelect,
  NativeSelectOption,
  Textarea,
} from "@theaiplatform/miniapp-sdk/ui";
import { datetimeLocalValue, todayLocalDate, zonedLocalToUtc } from "./dates";
import {
  MUSCLE_GROUPS,
  validateCustomExercise,
  validateWorkout,
} from "./validate";

type DraftSet = {
  id: string;
  weight: string;
  weightUnit: WeightUnit;
  reps: string;
  notes: string;
};

type DraftExercise = {
  id: string;
  exerciseDefinitionId: string;
  notes: string;
  sets: DraftSet[];
};

type Draft = {
  id: string;
  startedLocal: string;
  timeZone: string;
  notes: string;
  exercises: DraftExercise[];
};

function optionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  return Number(trimmed);
}

function optionalText(raw: string): string | undefined {
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

function blankSet(unit: WeightUnit): DraftSet {
  return {
    id: crypto.randomUUID(),
    weight: "",
    weightUnit: unit,
    reps: "",
    notes: "",
  };
}

function setFromDomain(set: ExerciseSet): DraftSet {
  return {
    id: set.id,
    weight: set.weight === undefined ? "" : String(set.weight),
    weightUnit: set.weightUnit,
    reps: set.reps === undefined ? "" : String(set.reps),
    notes: set.notes ?? "",
  };
}

function exerciseFromDomain(exercise: WorkoutExercise): DraftExercise {
  return {
    id: exercise.id,
    exerciseDefinitionId: exercise.exerciseDefinitionId,
    notes: exercise.notes ?? "",
    sets: exercise.sets.map(setFromDomain),
  };
}

function defaultDefinitionId(
  definitions: readonly ExerciseDefinition[],
): string {
  return (
    definitions.find((definition) => definition.id === "bench_press")?.id ??
    definitions[0]?.id ??
    ""
  );
}

function initialDraft(
  initial: Workout | null,
  date: string,
  definitions: readonly ExerciseDefinition[],
  unit: WeightUnit,
): Draft {
  if (initial) {
    return {
      id: initial.id,
      startedLocal: datetimeLocalValue(initial.startedAt, initial.timeZone),
      timeZone: initial.timeZone,
      notes: initial.notes ?? "",
      exercises: initial.exercises.map(exerciseFromDomain),
    };
  }
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const definitionId = defaultDefinitionId(definitions);
  return {
    id: crypto.randomUUID(),
    startedLocal:
      date === todayLocalDate(timeZone)
        ? datetimeLocalValue(new Date().toISOString(), timeZone)
        : `${date}T12:00`,
    timeZone,
    notes: "",
    exercises: definitionId
      ? [
          {
            id: crypto.randomUUID(),
            exerciseDefinitionId: definitionId,
            notes: "",
            sets: [blankSet(unit)],
          },
        ]
      : [],
  };
}

function withoutUndefined<T extends object>(record: T): T {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as T;
}

function toWorkout(draft: Draft, mode: "finish"): Workout {
  return withoutUndefined({
    id: draft.id,
    startedAt: zonedLocalToUtc(draft.startedLocal, draft.timeZone),
    endedAt: zonedLocalToUtc(new Date().toISOString(), draft.timeZone),
    timeZone: draft.timeZone,
    notes: optionalText(draft.notes),
    exercises: draft.exercises.map((exercise) =>
      withoutUndefined({
        id: exercise.id,
        exerciseDefinitionId: exercise.exerciseDefinitionId,
        notes: optionalText(exercise.notes),
        sets: exercise.sets.map((set) =>
          withoutUndefined({
            id: set.id,
            weight: optionalNumber(set.weight),
            weightUnit: set.weightUnit,
            reps: optionalNumber(set.reps),
            notes: optionalText(set.notes),
          }),
        ),
      }),
    ),
  });
}

export function WorkoutForm({
  initial,
  date,
  definitions,
  preferredWeightUnit,
  onCancel,
  onSave,
}: {
  initial: Workout | null;
  date: string;
  definitions: readonly ExerciseDefinition[];
  preferredWeightUnit: WeightUnit;
  onCancel: () => void;
  onSave: (
    workout: Workout,
    newDefinitions: readonly ExerciseDefinition[],
  ) => void;
}) {
  const [draft, setDraft] = useState(() =>
    initialDraft(initial, date, definitions, preferredWeightUnit),
  );
  const [extras, setExtras] = useState<ExerciseDefinition[]>([]);
  const [customName, setCustomName] = useState("");
  const [customTargets, setCustomTargets] = useState<MuscleGroup[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const choices = [...definitions, ...extras];

  function updateExercise(exerciseId: string, next: DraftExercise) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId ? next : exercise,
      ),
    }));
  }

  function addCustomExercise() {
    const exercise: ExerciseDefinition = {
      id: crypto.randomUUID(),
      name: customName.trim(),
      targets: customTargets,
      isCustom: true,
    };
    const customIssues = validateCustomExercise(
      exercise,
      choices.map((definition) => definition.id),
    );
    if (customIssues.length > 0) {
      setIssues(customIssues);
      return;
    }
    setExtras((current) => [...current, exercise]);
    setDraft((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        {
          id: crypto.randomUUID(),
          exerciseDefinitionId: exercise.id,
          notes: "",
          sets: [blankSet(preferredWeightUnit)],
        },
      ],
    }));
    setCustomName("");
    setCustomTargets([]);
    setIssues([]);
  }

  function submit(mode: "finish") {
    let workout: Workout;
    try {
      workout = toWorkout(draft, mode);
    } catch (error) {
      setIssues([
        error instanceof Error ? error.message : "Start time is incomplete.",
      ]);
      return;
    }
    const nextIssues = validateWorkout(workout, choices);
    if (nextIssues.length > 0) {
      setIssues(nextIssues);
      return;
    }
    const used = new Set(
      workout.exercises.map((exercise) => exercise.exerciseDefinitionId),
    );
    onSave(
      workout,
      extras.filter((definition) => used.has(definition.id)),
    );
  }

  return (
    <form
      data-testid="workout-form"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
      onSubmit={(event) => {
        event.preventDefault();
        submit("finish");
      }}
    >
      {issues.length > 0 ? (
        <ul>
          {issues.map((issue, index) => (
            <li key={`${issue}-${index}`}>{issue}</li>
          ))}
        </ul>
      ) : null}
      <Field>
        <FieldLabel htmlFor="workout-start">Start</FieldLabel>
        <Input
          id="workout-start"
          type="datetime-local"
          value={draft.startedLocal}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              startedLocal: event.target.value,
            }))
          }
        />
      </Field>
      <p>{draft.timeZone}</p>
      <Field>
        <FieldLabel htmlFor="workout-notes">Notes</FieldLabel>
        <Textarea
          id="workout-notes"
          value={draft.notes}
          onChange={(event) =>
            setDraft((current) => ({ ...current, notes: event.target.value }))
          }
        />
      </Field>
      {draft.exercises.map((exercise, exerciseIndex) => (
        <section
          key={exercise.id}
          aria-label={`Exercise ${exerciseIndex + 1}`}
          className="flex flex-col gap-4 rounded-xl border border-border p-4"
        >
          <div className="flex flex-col gap-2">
            <p className="m-0 text-base font-medium">
              Exercise {exerciseIndex + 1}
            </p>
            <NativeSelect
              aria-label={`Exercise ${exerciseIndex + 1}`}
              value={exercise.exerciseDefinitionId}
              onChange={(event) =>
                updateExercise(exercise.id, {
                  ...exercise,
                  exerciseDefinitionId: event.target.value,
                })
              }
            >
              {choices.map((definition) => (
                <NativeSelectOption key={definition.id} value={definition.id}>
                  {definition.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-3">
            {exercise.sets.map((set, setIndex) => (
              <div
                key={set.id}
                className="flex flex-col gap-3 rounded-lg bg-muted p-3"
              >
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    gridTemplateColumns: "1fr 1fr 1fr",
                  }}
                >
                  <Field>
                    <FieldLabel htmlFor={`${set.id}-weight`}>
                      Set {setIndex + 1} weight
                    </FieldLabel>
                    <Input
                      id={`${set.id}-weight`}
                      inputMode="decimal"
                      value={set.weight}
                      onChange={(event) =>
                        updateExercise(exercise.id, {
                          ...exercise,
                          sets: exercise.sets.map((item) =>
                            item.id === set.id
                              ? { ...item, weight: event.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${set.id}-unit`}>Unit</FieldLabel>
                    <NativeSelect
                      id={`${set.id}-unit`}
                      value={set.weightUnit}
                      onChange={(event) =>
                        updateExercise(exercise.id, {
                          ...exercise,
                          sets: exercise.sets.map((item) =>
                            item.id === set.id
                              ? {
                                  ...item,
                                  weightUnit:
                                    event.target.value === "kg" ? "kg" : "lb",
                                }
                              : item,
                          ),
                        })
                      }
                    >
                      <NativeSelectOption value="lb">lb</NativeSelectOption>
                      <NativeSelectOption value="kg">kg</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${set.id}-reps`}>Reps</FieldLabel>
                    <Input
                      id={`${set.id}-reps`}
                      inputMode="numeric"
                      value={set.reps}
                      onChange={(event) =>
                        updateExercise(exercise.id, {
                          ...exercise,
                          sets: exercise.sets.map((item) =>
                            item.id === set.id
                              ? { ...item, reps: event.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                  </Field>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    updateExercise(exercise.id, {
                      ...exercise,
                      sets: exercise.sets.filter((item) => item.id !== set.id),
                    })
                  }
                >
                  Remove set
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              updateExercise(exercise.id, {
                ...exercise,
                sets: [...exercise.sets, blankSet(preferredWeightUnit)],
              })
            }
          >
            Add set
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                exercises: current.exercises.filter(
                  (item) => item.id !== exercise.id,
                ),
              }))
            }
          >
            Remove exercise
          </Button>
        </section>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const definitionId = defaultDefinitionId(choices);
          if (!definitionId) {
            setIssues(["Add a custom exercise first."]);
            return;
          }
          setDraft((current) => ({
            ...current,
            exercises: [
              ...current.exercises,
              {
                id: crypto.randomUUID(),
                exerciseDefinitionId: definitionId,
                notes: "",
                sets: [blankSet(preferredWeightUnit)],
              },
            ],
          }));
        }}
      >
        Add exercise
      </Button>
      <div style={{ display: "flex", gap: 8 }}>
        <Button type="submit" variant="secondary">
          Save
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
