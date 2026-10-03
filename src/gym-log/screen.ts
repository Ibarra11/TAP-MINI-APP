import type { Workout } from "../../gym-log-schema";

export type GymView = "days" | "workouts";

export type GymScreen =
  | { name: "days"; selectedDate: string | null }
  | { name: "workouts" }
  | { name: "exercises" }
  | {
      name: "editor";
      workout: Workout | null;
      date: string;
      returnTo: GymView;
    }
  | { name: "trend"; exerciseDefinitionId: string };
