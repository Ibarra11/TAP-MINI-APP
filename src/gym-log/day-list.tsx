import type { DaySummary } from "./db";
import { formatDayLabel } from "./dates";
import { Button } from "@theaiplatform/miniapp-sdk/ui";

export function DayList({
  days,
  selectedDate,
  hasOlder,
  hasNewer,
  onSelect,
  onOlder,
  onNewer,
}: {
  days: readonly DaySummary[];
  selectedDate: string | null;
  hasOlder: boolean;
  hasNewer: boolean;
  onSelect: (localDate: string) => void;
  onOlder: () => void;
  onNewer: () => void;
}) {
  return (
    <div data-testid="day-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Button type="button" variant="outline" disabled={!hasNewer} onClick={onNewer}>
          Newer
        </Button>
        <Button type="button" variant="outline" disabled={!hasOlder} onClick={onOlder}>
          Older
        </Button>
      </div>
      {days.map((day) => (
        <Button
          key={day.localDate}
          type="button"
          variant={day.localDate === selectedDate ? "default" : "outline"}
          aria-current={day.localDate === selectedDate ? "date" : undefined}
          onClick={() => onSelect(day.localDate)}
          style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
        >
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span>{formatDayLabel(day.localDate)}</span>
            <span>
              {day.sessionCount === 1 ? "1 session" : `${day.sessionCount} sessions`}
            </span>
            <span>{day.exerciseNames.join(", ")}</span>
          </span>
        </Button>
      ))}
    </div>
  );
}
