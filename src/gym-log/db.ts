import { sdk, type MiniAppJsonValue } from "@theaiplatform/miniapp-sdk/sdk";
import {
  builtInExercises,
  initialGymLog,
  type ExerciseDefinition,
  type GymLog,
  type WeightUnit,
  type Workout,
} from "../../gym-log-schema";
import { localDate } from "./dates";
import { trendPoints, type TrendPoint, type TrendSession } from "./trend";
import {
  validateCustomExercise,
  validateExerciseDetails,
  validateWorkout,
} from "./validate";

export const DAY_PAGE_SIZE = 14;

const STORAGE_NAMESPACE = "gym-log";
const STORAGE_KEY = "log";

export type DaySummary = {
  localDate: string;
  sessionCount: number;
  exerciseNames: string[];
};

export type DayPage = {
  days: DaySummary[];
  hasOlder: boolean;
  hasNewer: boolean;
};

export type GymDatabase = {
  listDefinitions(): Promise<ExerciseDefinition[]>;
  preferredWeightUnit(): Promise<WeightUnit>;
  listDayPage(upperExclusive: string | null): Promise<DayPage>;
  upperExclusiveForNewerPage(newestOnPage: string): Promise<string | null>;
  pageUpperForDate(isoDate: string): Promise<string | null>;
  loadDay(isoDate: string): Promise<Workout[]>;
  listWorkouts(): Promise<Workout[]>;
  deleteWorkout(workoutId: string): Promise<void>;
  addExercise(name: string, targets: ExerciseDefinition["targets"]): Promise<void>;
  updateExercise(definition: ExerciseDefinition): Promise<void>;
  deleteExercise(exerciseDefinitionId: string): Promise<void>;
  saveWorkout(
    workout: Workout,
    newDefinitions: readonly ExerciseDefinition[],
  ): Promise<void>;
  trendForExercise(exerciseDefinitionId: string): Promise<TrendPoint[]>;
  close(): Promise<void>;
};

function isGymLog(value: MiniAppJsonValue | null): value is GymLog {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Partial<GymLog>;
  return (
    record.schemaVersion === 1 &&
    (record.preferredWeightUnit === "lb" ||
      record.preferredWeightUnit === "kg") &&
    Array.isArray(record.exerciseDefinitions) &&
    Array.isArray(record.workouts)
  );
}

function sortDefinitions(
  definitions: ExerciseDefinition[],
): ExerciseDefinition[] {
  const order = new Map(
    builtInExercises.map((exercise, index) => [exercise.id, index]),
  );
  return definitions.sort((left, right) => {
    const leftOrder = order.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.name.localeCompare(right.name);
  });
}

function datedWorkouts(log: GymLog): { localDate: string; workout: Workout }[] {
  return log.workouts.map((workout) => ({
    localDate: localDate(workout.startedAt, workout.timeZone),
    workout,
  }));
}

function datesDescending(log: GymLog): string[] {
  return [
    ...new Set(datedWorkouts(log).map((entry) => entry.localDate)),
  ].sort((left, right) => (left < right ? 1 : left > right ? -1 : 0));
}

function summarize(log: GymLog, dates: readonly string[]): DaySummary[] {
  const wanted = new Set(dates);
  const namesByDate = new Map<string, string[]>();
  const counts = new Map<string, number>();
  const definitions = new Map(
    log.exerciseDefinitions.map((definition) => [definition.id, definition.name]),
  );
  const ordered = datedWorkouts(log).sort((left, right) =>
    left.workout.startedAt < right.workout.startedAt ? -1 : 1,
  );
  for (const entry of ordered) {
    if (!wanted.has(entry.localDate)) continue;
    counts.set(entry.localDate, (counts.get(entry.localDate) ?? 0) + 1);
    const names = namesByDate.get(entry.localDate) ?? [];
    for (const exercise of entry.workout.exercises) {
      const name = definitions.get(exercise.exerciseDefinitionId);
      if (name && !names.includes(name)) names.push(name);
    }
    namesByDate.set(entry.localDate, names);
  }
  return dates.map((date) => ({
    localDate: date,
    sessionCount: counts.get(date) ?? 0,
    exerciseNames: namesByDate.get(date) ?? [],
  }));
}

export async function openGymDatabase(): Promise<GymDatabase | null> {
  const entry = await sdk.storage.get({
    namespace: STORAGE_NAMESPACE,
    key: STORAGE_KEY,
  });
  if (entry.value !== null && !isGymLog(entry.value)) {
    throw new Error("Saved gym log is invalid.");
  }
  const state: { log: GymLog; revision: number | null } = {
    log: entry.value === null ? structuredClone(initialGymLog) : entry.value,
    revision: entry.revision,
  };
  let closed = false;

  function requireOpen(): GymLog {
    if (closed) throw new Error("The gym log is closed.");
    return state.log;
  }

  async function persist(): Promise<void> {
    const result = await sdk.storage.set({
      namespace: STORAGE_NAMESPACE,
      key: STORAGE_KEY,
      value: state.log,
      expectedRevision: state.revision,
    });
    state.revision = result.revision;
  }

  async function commit(next: GymLog): Promise<void> {
    const previous = state.log;
    state.log = next;
    try {
      await persist();
    } catch (error) {
      state.log = previous;
      throw error;
    }
  }

  return {
    async listDefinitions() {
      return sortDefinitions([...requireOpen().exerciseDefinitions]);
    },
    async preferredWeightUnit() {
      return requireOpen().preferredWeightUnit;
    },
    async listDayPage(upperExclusive) {
      const dates = datesDescending(requireOpen()).filter(
        (date) => upperExclusive === null || date < upperExclusive,
      );
      const pageDates = dates.slice(0, DAY_PAGE_SIZE);
      return {
        days: summarize(requireOpen(), pageDates),
        hasOlder: dates.length > DAY_PAGE_SIZE,
        hasNewer: upperExclusive !== null,
      };
    },
    async upperExclusiveForNewerPage(newestOnPage) {
      const newer = datesDescending(requireOpen())
        .filter((date) => date > newestOnPage)
        .sort();
      if (newer.length <= DAY_PAGE_SIZE) return null;
      return newer[DAY_PAGE_SIZE] ?? null;
    },
    async pageUpperForDate(isoDate) {
      const newer = datesDescending(requireOpen())
        .filter((date) => date > isoDate)
        .sort();
      return newer[0] ?? null;
    },
    async loadDay(isoDate) {
      return datedWorkouts(requireOpen())
        .filter((entry) => entry.localDate === isoDate)
        .sort((left, right) =>
          left.workout.startedAt < right.workout.startedAt ? -1 : 1,
        )
        .map((entry) => entry.workout);
    },
    async listWorkouts() {
      return [...requireOpen().workouts].sort((left, right) =>
        left.startedAt < right.startedAt ? 1 : left.startedAt > right.startedAt ? -1 : 0,
      );
    },
    async deleteWorkout(workoutId) {
      const log = requireOpen();
      await commit({
        ...log,
        workouts: log.workouts.filter((workout) => workout.id !== workoutId),
      });
    },
    async addExercise(name, targets) {
      const log = requireOpen();
      const definition: ExerciseDefinition = {
        id: crypto.randomUUID(),
        name: name.trim(),
        targets,
        isCustom: true,
      };
      const issues = validateExerciseDetails(definition, log.exerciseDefinitions);
      if (issues.length > 0) throw new Error(issues.join("\n"));
      await commit({
        ...log,
        exerciseDefinitions: [...log.exerciseDefinitions, definition],
      });
    },
    async updateExercise(definition) {
      const log = requireOpen();
      const existing = log.exerciseDefinitions.find(
        (item) => item.id === definition.id,
      );
      if (!existing) throw new Error("That exercise no longer exists.");
      const next: ExerciseDefinition = {
        ...existing,
        name: definition.name.trim(),
        targets: definition.targets,
      };
      const issues = validateExerciseDetails(next, log.exerciseDefinitions);
      if (issues.length > 0) throw new Error(issues.join("\n"));
      await commit({
        ...log,
        exerciseDefinitions: log.exerciseDefinitions.map((item) =>
          item.id === next.id ? next : item,
        ),
      });
    },
    async deleteExercise(exerciseDefinitionId) {
      const log = requireOpen();
      const used = log.workouts.some((workout) =>
        workout.exercises.some(
          (exercise) => exercise.exerciseDefinitionId === exerciseDefinitionId,
        ),
      );
      if (used) {
        throw new Error(
          "This exercise is in a logged workout. Remove it from those workouts first.",
        );
      }
      await commit({
        ...log,
        exerciseDefinitions: log.exerciseDefinitions.filter(
          (item) => item.id !== exerciseDefinitionId,
        ),
      });
    },
    async saveWorkout(workout, newDefinitions) {
      const log = requireOpen();
      const issues = [
        ...newDefinitions.flatMap((definition, index) =>
          validateCustomExercise(definition, [
            ...log.exerciseDefinitions.map((item) => item.id),
            ...newDefinitions
              .filter((_, other) => other !== index)
              .map((item) => item.id),
          ]),
        ),
        ...validateWorkout(workout, [
          ...log.exerciseDefinitions,
          ...newDefinitions,
        ]),
      ];
      if (issues.length > 0) throw new Error(issues.join("\n"));
      await commit({
        ...log,
        exerciseDefinitions: [
          ...log.exerciseDefinitions,
          ...newDefinitions.map((definition) => ({
            ...definition,
            name: definition.name.trim(),
            isCustom: true,
          })),
        ],
        workouts: [
          ...log.workouts.filter((item) => item.id !== workout.id),
          workout,
        ],
      });
    },
    async trendForExercise(exerciseDefinitionId) {
      const log = requireOpen();
      const sessions: TrendSession[] = datedWorkouts(log)
        .filter((entry) =>
          entry.workout.exercises.some(
            (exercise) =>
              exercise.exerciseDefinitionId === exerciseDefinitionId,
          ),
        )
        .sort((left, right) =>
          left.workout.startedAt < right.workout.startedAt ? -1 : 1,
        )
        .map((entry) => ({
          workoutId: entry.workout.id,
          localDate: entry.localDate,
          sets: entry.workout.exercises
            .filter(
              (exercise) =>
                exercise.exerciseDefinitionId === exerciseDefinitionId,
            )
            .flatMap((exercise) => exercise.sets),
        }));
      return trendPoints(sessions);
    },
    async close() {
      closed = true;
    },
  };
}
