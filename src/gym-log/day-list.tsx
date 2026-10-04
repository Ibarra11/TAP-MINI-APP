import { useState, type SVGProps } from "react";
import type { DaySummary } from "./db";
import { formatDayLabel } from "./dates";
import {
  Button,
  Card,
  CardDescription,
  CardTitle,
  MiniAppIconButton,
} from "@theaiplatform/miniapp-sdk/ui";

const VISIBLE_EXERCISES = 4;

// Caps the grid at three columns while letting it drop to two or one when a card would go below 15rem.
const GRID_COLUMNS =
  "repeat(auto-fill, minmax(max(15rem, calc((100% - 2rem) / 3)), 1fr))";

// lucide-react is only a transitive dependency here, so these copy its pencil and trash paths.
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

const PlusIcon = strokeIcon(["M5 12h14", "M12 5v14"]);

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function DayList({
  days,
  hasOlder,
  hasNewer,
  onAdd,
  onSelect,
  onEdit,
  onDelete,
  onOlder,
  onNewer,
}: {
  days: readonly DaySummary[];
  hasOlder: boolean;
  hasNewer: boolean;
  onAdd: () => void;
  onSelect: (localDate: string) => void;
  onEdit: (localDate: string) => void;
  onDelete: (localDate: string) => void;
  onOlder: () => void;
  onNewer: () => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  return (
    <div data-testid="day-list" className="flex flex-col gap-4">
      {hasNewer || hasOlder ? (
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={!hasNewer} onClick={onNewer}>
            Newer
          </Button>
          <Button type="button" variant="outline" disabled={!hasOlder} onClick={onOlder}>
            Older
          </Button>
        </div>
      ) : null}
      <ul
        className="m-0 grid gap-4 p-0"
        style={{ gridTemplateColumns: GRID_COLUMNS, listStyle: "none" }}
      >
        <li>
          <Card className="flex h-full flex-col items-center justify-center gap-3 border border-border p-4 text-center">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-base">Add Log</CardTitle>
              <CardDescription>Record a workout and the sets you did</CardDescription>
            </div>
            <Button type="button" style={{ width: "75%" }} onClick={onAdd}>
              <PlusIcon aria-hidden="true" />
              Add
            </Button>
          </Card>
        </li>
        {days.map((day) => {
          const label = formatDayLabel(day.localDate);
          const setCount = day.exercises.reduce(
            (total, exercise) => total + exercise.setCount,
            0,
          );
          const hidden = day.exercises.length - VISIBLE_EXERCISES;
          const confirming = pendingDelete === day.localDate;
          return (
            <li key={day.localDate}>
              <Card className="relative flex h-full flex-col gap-3 border border-border p-4">
                <button
                  type="button"
                  aria-label={`Open ${label}`}
                  className="absolute inset-0 cursor-pointer rounded-2xl transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onSelect(day.localDate)}
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <CardTitle className="truncate text-base">{label}</CardTitle>
                    <CardDescription>
                      {plural(day.sessionCount, "session")} · {plural(setCount, "set")}
                    </CardDescription>
                  </div>
                  {confirming ? null : (
                    <div className="relative z-10 flex shrink-0 gap-1">
                      <MiniAppIconButton
                        icon={PencilIcon}
                        label={day.sessionCount === 1 ? `Edit ${label}` : `Edit sessions on ${label}`}
                        onClick={() => onEdit(day.localDate)}
                      />
                      <MiniAppIconButton
                        icon={TrashIcon}
                        label={`Delete ${label}`}
                        onClick={() => setPendingDelete(day.localDate)}
                      />
                    </div>
                  )}
                </div>
                {day.exercises.length === 0 ? (
                  <p className="m-0 text-sm text-muted-foreground">No exercises logged</p>
                ) : (
                  <ul className="m-0 flex flex-col gap-1 p-0 text-sm" style={{ listStyle: "none" }}>
                    {day.exercises.slice(0, VISIBLE_EXERCISES).map((exercise) => (
                      <li key={exercise.name} className="flex justify-between gap-2">
                        <span className="truncate">{exercise.name}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {plural(exercise.setCount, "set")}
                        </span>
                      </li>
                    ))}
                    {hidden > 0 ? (
                      <li className="text-muted-foreground">+{hidden} more</li>
                    ) : null}
                  </ul>
                )}
                {confirming ? (
                  <div className="relative z-10 mt-auto flex items-center justify-between gap-2">
                    <span className="text-sm">
                      Delete {plural(day.sessionCount, "session")}?
                    </span>
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setPendingDelete(null)}>
                        Keep
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setPendingDelete(null);
                          onDelete(day.localDate);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
