import type {
  EffortRating,
  ExerciseDefinition,
  ExerciseSet,
  MuscleGroup,
  Workout,
} from "../../gym-log-schema";

const MUSCLE_GROUP_SET: Record<MuscleGroup, true> = {
  chest: true,
  back: true,
  shoulders: true,
  biceps: true,
  triceps: true,
  forearms: true,
  quads: true,
  hamstrings: true,
  glutes: true,
  calves: true,
  core: true,
};

export const MUSCLE_GROUPS = Object.keys(MUSCLE_GROUP_SET) as MuscleGroup[];

export function isMuscleGroup(value: unknown): value is MuscleGroup {
  return typeof value === "string" && value in MUSCLE_GROUP_SET;
}

function isUtcTimestamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

function isIanaTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function duplicateIds(ids: readonly string[]): boolean {
  return new Set(ids).size !== ids.length;
}

function setIssues(set: ExerciseSet): string[] {
  const issues: string[] = [];
  if (set.reps === undefined && set.durationSeconds === undefined) {
    issues.push("A set needs reps.");
  }
  if (set.reps !== undefined && (!Number.isInteger(set.reps) || set.reps <= 0)) {
    issues.push("Reps must be a positive integer.");
  }
  if (
    set.durationSeconds !== undefined &&
    (!Number.isFinite(set.durationSeconds) || set.durationSeconds <= 0)
  ) {
    issues.push("Duration must be a positive number.");
  }
  if (
    set.restAfterSeconds !== undefined &&
    (!Number.isFinite(set.restAfterSeconds) || set.restAfterSeconds < 0)
  ) {
    issues.push("Rest must be a nonnegative number.");
  }
  if (set.weight !== undefined && (!Number.isFinite(set.weight) || set.weight < 0)) {
    issues.push("Weight must be a nonnegative number.");
  }
  if (
    set.effortRating !== undefined &&
    (!Number.isInteger(set.effortRating) || set.effortRating < 1 || set.effortRating > 10)
  ) {
    issues.push("Effort must be an integer from 1 through 10.");
  }
  return issues;
}

export function validateCustomExercise(
  exercise: ExerciseDefinition,
  existingIds: readonly string[],
): string[] {
  const issues: string[] = [];
  if (!exercise.isCustom) issues.push("Custom exercises must be marked custom.");
  if (exercise.id.trim() === "" || existingIds.includes(exercise.id)) {
    issues.push("Custom exercises must use a new id.");
  }
  if (exercise.name.trim() === "") issues.push("Exercise name must not be empty.");
  if (!exercise.targets.every(isMuscleGroup)) {
    issues.push("Exercise targets must be known muscle groups.");
  }
  return issues;
}

/** Name and targets rules shared by adding and editing an exercise. */
export function validateExerciseDetails(
  exercise: ExerciseDefinition,
  definitions: readonly ExerciseDefinition[],
): string[] {
  const issues: string[] = [];
  const name = exercise.name.trim().toLowerCase();
  if (name === "") {
    issues.push("Exercise name must not be empty.");
  } else if (
    definitions.some(
      (other) => other.id !== exercise.id && other.name.trim().toLowerCase() === name,
    )
  ) {
    issues.push("An exercise with that name already exists.");
  }
  if (!exercise.targets.every(isMuscleGroup)) {
    issues.push("Exercise targets must be known muscle groups.");
  }
  return issues;
}

export function validateWorkout(
  workout: Workout,
  definitions: readonly ExerciseDefinition[],
): string[] {
  const issues: string[] = [];
  if (workout.id.trim() === "") issues.push("Workout id must not be empty.");
  if (!isUtcTimestamp(workout.startedAt)) issues.push("Started time must be a UTC timestamp.");
  if (workout.endedAt !== undefined && !isUtcTimestamp(workout.endedAt)) {
    issues.push("Ended time must be a UTC timestamp.");
  }
  if (!isIanaTimeZone(workout.timeZone)) issues.push("Time zone must be a valid IANA name.");
  if (
    workout.endedAt !== undefined &&
    isUtcTimestamp(workout.startedAt) &&
    isUtcTimestamp(workout.endedAt) &&
    Date.parse(workout.endedAt) < Date.parse(workout.startedAt)
  ) {
    issues.push("Ended time must be at or after the start.");
  }
  if (duplicateIds(workout.exercises.map((exercise) => exercise.id))) {
    issues.push("Exercise ids must be unique.");
  }
  const setIds = workout.exercises.flatMap((exercise) => exercise.sets.map((set) => set.id));
  if (duplicateIds(setIds)) issues.push("Set ids must be unique.");
  const knownIds = new Set(definitions.map((definition) => definition.id));
  for (const exercise of workout.exercises) {
    if (!knownIds.has(exercise.exerciseDefinitionId)) {
      issues.push("Workout references an unknown exercise.");
    }
    if (
      exercise.durationSeconds !== undefined &&
      (!Number.isFinite(exercise.durationSeconds) || exercise.durationSeconds <= 0)
    ) {
      issues.push("Duration must be a positive number.");
    }
    for (const set of exercise.sets) issues.push(...setIssues(set));
  }
  return issues;
}

export function isEffortRating(value: number): value is EffortRating {
  return Number.isInteger(value) && value >= 1 && value <= 10;
}
