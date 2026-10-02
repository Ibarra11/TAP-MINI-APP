/**
 * Gym log — single-user toy app schema.
 *
 * Structure:
 * GymLog -> Workout[] -> WorkoutExercise[] -> ExerciseSet[]
 * WorkoutExercise.exerciseDefinitionId references ExerciseDefinition.id.
 *
 * Group workout sessions by the date of startedAt in the saved timeZone.
 * Multiple sessions may occur on the same day. Array order preserves the
 * order of exercises and sets. Nested records do not need parent IDs;
 * add foreign keys if migrating them to separate relational tables.
 *
 * Runtime validation rules (TypeScript alone does not enforce these):
 * - IDs must be unique within their record type.
 * - Exercise names must be nonempty after trimming.
 * - Exercise references must point to an existing definition.
 * - Each completed set needs reps, durationSeconds, or both.
 * - Reps must be a positive integer; durations must be positive.
 * - Weight and rest must be nonnegative; all numeric values must be finite.
 * - Effort ratings must be integers from 1 through 10.
 * - Timestamps must be valid ISO 8601 UTC timestamps.
 * - timeZone must be a valid IANA time zone.
 * - endedAt must be at or after startedAt.
 * - New custom exercises receive a unique ID and isCustom: true.
 * - Keep definitions referenced by workout history when removing exercises
 *   from the picker, or prevent deletion while they are referenced.
 *
 * AI recaps and comparisons can be generated from the stored history.
 * No separate AI data model is required for the initial version.
 */

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

export type WeightUnit = "lb" | "kg";

export type EffortRating = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Reusable entry in the exercise picker, built-in or custom. */
export type ExerciseDefinition = {
  id: string;
  name: string;
  targets: MuscleGroup[];
  isCustom: boolean;
};

/** One set performed during a workout. */
export type ExerciseSet = {
  id: string;
  weight?: number; // Omit for unweighted exercises.
  weightUnit: WeightUnit;
  reps?: number;
  durationSeconds?: number; // Active set time, excluding rest.
  restAfterSeconds?: number;
  effortRating?: EffortRating;
  notes?: string;
};

/** One exercise performed within a particular workout session. */
export type WorkoutExercise = {
  id: string;
  exerciseDefinitionId: string;
  durationSeconds?: number; // Total exercise time, including rest.
  sets: ExerciseSet[]; // Ordered by performance.
  notes?: string;
};

/** One workout session; multiple sessions may occur on the same day. */
export type Workout = {
  id: string;
  startedAt: string; // ISO 8601 UTC timestamp.
  endedAt?: string; // Omitted while the workout is in progress.
  timeZone: string; // IANA name, e.g. "America/Los_Angeles".
  exercises: WorkoutExercise[];
  notes?: string;
};

/** Top-level storage for the single-user app. */
export type GymLog = {
  schemaVersion: 1;
  preferredWeightUnit: WeightUnit;
  exerciseDefinitions: ExerciseDefinition[];
  workouts: Workout[];
};

/** Default targets can be edited to reflect the exercise variation. */
export const builtInExercises: ExerciseDefinition[] = [
  {
    id: "bench_press",
    name: "Bench Press",
    targets: ["chest", "triceps", "shoulders"],
    isCustom: false,
  },
  {
    id: "chest_fly",
    name: "Chest Fly",
    targets: ["chest"],
    isCustom: false,
  },
  {
    id: "lat_pulldown",
    name: "Lat Pulldown",
    targets: ["back", "biceps"],
    isCustom: false,
  },
  {
    id: "squat",
    name: "Squat",
    targets: ["quads", "glutes"],
    isCustom: false,
  },
  {
    id: "leg_press",
    name: "Leg Press",
    targets: ["quads", "glutes"],
    isCustom: false,
  },
  {
    id: "calf_raise",
    name: "Calf Raise",
    targets: ["calves"],
    isCustom: false,
  },
  {
    id: "bicep_curl",
    name: "Bicep Curl",
    targets: ["biceps"],
    isCustom: false,
  },
  {
    id: "hammer_curl",
    name: "Hammer Curl",
    targets: ["biceps", "forearms"],
    isCustom: false,
  },
];

export const initialGymLog: GymLog = {
  schemaVersion: 1,
  preferredWeightUnit: "lb",
  exerciseDefinitions: builtInExercises,
  workouts: [],
};
