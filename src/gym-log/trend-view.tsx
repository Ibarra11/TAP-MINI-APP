import type { ExerciseDefinition } from "../../gym-log-schema";
import {
  H2,
  NativeSelect,
  NativeSelectOption,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@theaiplatform/miniapp-sdk/ui";
import { formatDayLabel } from "./dates";
import type { TrendPoint } from "./trend";

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function TrendChart({ points }: { points: readonly TrendPoint[] }) {
  const weighted = points.filter(
    (point): point is TrendPoint & { bestWeight: number } => point.bestWeight !== null,
  );
  if (weighted.length === 0) return <p>No weighted sets for this exercise yet.</p>;
  const weights = weighted.map((point) => point.bestWeight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const width = 320;
  const height = 120;
  const pad = 12;
  const span = max - min || 1;
  const coords = weighted.map((point, index) => {
    const x =
      weighted.length === 1
        ? width / 2
        : pad + (index * (width - pad * 2)) / (weighted.length - 1);
    const y = height - pad - ((point.bestWeight - min) / span) * (height - pad * 2);
    return { x, y };
  });
  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Heaviest set over time"
      style={{ width: "100%", maxWidth: 420, height: 140 }}
    >
      {coords.length > 1 ? (
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={line} />
      ) : null}
      {coords.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="3" fill="currentColor" />
      ))}
    </svg>
  );
}

export function TrendView({
  definitions,
  exerciseDefinitionId,
  points,
  onChangeExercise,
}: {
  definitions: readonly ExerciseDefinition[];
  exerciseDefinitionId: string;
  points: readonly TrendPoint[];
  onChangeExercise: (exerciseDefinitionId: string) => void;
}) {
  const selected = definitions.find((definition) => definition.id === exerciseDefinitionId);
  return (
    <div data-testid="trend-view" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <H2>Compare</H2>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        Exercise
        <NativeSelect
          value={exerciseDefinitionId}
          onChange={(event) => onChangeExercise(event.target.value)}
        >
          {definitions.map((definition) => (
            <NativeSelectOption key={definition.id} value={definition.id}>
              {definition.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
      <TrendChart points={points} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Best weight</TableHead>
            <TableHead>Reps</TableHead>
            <TableHead>Volume</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {points.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
                {selected ? `No ${selected.name} sessions yet.` : "No sessions yet."}
              </TableCell>
            </TableRow>
          ) : (
            points.map((point) => (
              <TableRow key={point.workoutId}>
                <TableCell>{formatDayLabel(point.localDate)}</TableCell>
                <TableCell>
                  {point.bestWeight === null || point.weightUnit === null
                    ? ""
                    : `${formatNumber(point.bestWeight)} ${point.weightUnit}`}
                </TableCell>
                <TableCell>{point.repsAtBestWeight ?? ""}</TableCell>
                <TableCell>
                  {point.volume === null || point.weightUnit === null
                    ? ""
                    : `${formatNumber(point.volume)} ${point.weightUnit}`}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
