import type { WeightUnit } from "../../gym-log-schema";

export type TrendSet = {
  weight?: number;
  weightUnit: WeightUnit;
  reps?: number;
};

export type TrendSession = {
  workoutId: string;
  localDate: string;
  sets: TrendSet[];
};

export type TrendPoint = {
  workoutId: string;
  localDate: string;
  bestWeight: number | null;
  weightUnit: WeightUnit | null;
  repsAtBestWeight: number | null;
  volume: number | null;
};

function weighted(set: TrendSet): set is TrendSet & { weight: number } {
  return set.weight !== undefined && Number.isFinite(set.weight);
}

/** Heaviest set in stored units. Volume sums weight times reps for that same unit. */
export function trendPoint(session: TrendSession): TrendPoint {
  let best: (TrendSet & { weight: number }) | null = null;
  for (const set of session.sets) {
    if (!weighted(set)) continue;
    if (best === null || set.weight > best.weight) best = set;
  }
  if (best === null) {
    return {
      workoutId: session.workoutId,
      localDate: session.localDate,
      bestWeight: null,
      weightUnit: null,
      repsAtBestWeight: null,
      volume: null,
    };
  }
  let volume = 0;
  let counted = false;
  for (const set of session.sets) {
    if (set.weightUnit !== best.weightUnit) continue;
    if (!weighted(set) || set.reps === undefined || !Number.isFinite(set.reps)) continue;
    volume += set.weight * set.reps;
    counted = true;
  }
  return {
    workoutId: session.workoutId,
    localDate: session.localDate,
    bestWeight: best.weight,
    weightUnit: best.weightUnit,
    repsAtBestWeight: best.reps ?? null,
    volume: counted ? volume : null,
  };
}

export function trendPoints(sessions: readonly TrendSession[]): TrendPoint[] {
  return sessions.map(trendPoint);
}
