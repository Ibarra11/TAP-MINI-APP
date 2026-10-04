import { useEffect, useRef, useState } from "react";
import type {
  TapFederatedSurfaceMount,
  TapFederatedSurfaceMountContext,
} from "@theaiplatform/miniapp-sdk/surface";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  MiniAppBackButton,
  MiniAppPage,
  MiniAppPageHeader,
  MiniAppPageHeaderActions,
  MiniAppPageHeaderContent,
  MiniAppPageHeaderTitle,
  MiniAppPageState,
  MiniAppToolbar,
  SurfaceViewport,
  TooltipProvider,
} from "@theaiplatform/miniapp-sdk/ui";
import "@theaiplatform/miniapp-sdk/ui/styles.css";
import { isMiniAppHostActionError } from "@theaiplatform/miniapp-sdk/sdk";
import { installMiniAppAppearanceSync } from "@theaiplatform/miniapp-sdk/web";
import { createRoot } from "react-dom/client";
import type {
  ExerciseDefinition,
  WeightUnit,
  Workout,
} from "../gym-log-schema";
import { localDate, todayLocalDate } from "./gym-log/dates";
import { DayDetail } from "./gym-log/day-detail";
import { DayList } from "./gym-log/day-list";
import { ExerciseList } from "./gym-log/exercise-list";
import { openGymDatabase, type DayPage, type GymDatabase } from "./gym-log/db";
import type { GymScreen, GymView } from "./gym-log/screen";
import { TrendView } from "./gym-log/trend-view";
import type { TrendPoint } from "./gym-log/trend";
import { WorkoutForm } from "./gym-log/workout-form";
import { WorkoutList } from "./gym-log/workout-list";

type Ready = {
  kind: "ready";
  screen: GymScreen;
  listDate: string | null;
  definitions: ExerciseDefinition[];
  preferredWeightUnit: WeightUnit;
  pageUpper: string | null;
  page: DayPage;
  day: Workout[] | null;
  workouts: Workout[];
  trendPoints: TrendPoint[];
  notice: string | null;
};

type Phase =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "error"; message: string }
  | Ready;

function failureText(error: unknown, fallback: string): string {
  if (isMiniAppHostActionError(error)) return `${error.code}: ${error.message}`;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function today(): string {
  return todayLocalDate(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

function viewScreen(view: GymView, listDate: string | null): GymScreen {
  return view === "workouts"
    ? { name: "workouts" }
    : { name: "days", selectedDate: listDate };
}

/**
 * Reloads every list after a write. The days view pages to `focusDate` and, if a day was open, opens
 * `focusDate` instead; the workouts view keeps the open day.
 */
async function reloaded(
  database: GymDatabase,
  current: Ready,
  view: GymView,
  focusDate: string | null,
): Promise<Ready> {
  const pageDate = view === "days" ? focusDate : current.listDate;
  const listDate =
    view === "days" && current.listDate === null ? null : pageDate;
  const pageUpper = pageDate
    ? await database.pageUpperForDate(pageDate)
    : current.pageUpper;
  const [definitions, workouts, page, day] = await Promise.all([
    database.listDefinitions(),
    database.listWorkouts(),
    database.listDayPage(pageUpper),
    listDate ? database.loadDay(listDate) : Promise.resolve(null),
  ]);
  return {
    ...current,
    definitions,
    workouts,
    pageUpper,
    page,
    day,
    listDate,
    notice: null,
    screen: viewScreen(view, listDate),
  };
}

function GymSurface() {
  const databaseRef = useRef<GymDatabase | null>(null);
  const requestRef = useRef(0);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  function show(next: Ready) {
    requestRef.current += 1;
    setPhase(next);
  }

  useEffect(() => {
    let cancelled = false;
    void openGymDatabase()
      .then(async (database) => {
        if (cancelled || !database) {
          await database?.close();
          if (!cancelled) setPhase({ kind: "unavailable" });
          return;
        }
        databaseRef.current = database;
        const [definitions, preferredWeightUnit, page, workouts] =
          await Promise.all([
            database.listDefinitions(),
            database.preferredWeightUnit(),
            database.listDayPage(null),
            database.listWorkouts(),
          ]);
        if (cancelled) return;
        setPhase({
          kind: "ready",
          screen: { name: "days", selectedDate: null },
          listDate: null,
          definitions,
          preferredWeightUnit,
          pageUpper: null,
          page,
          day: null,
          workouts,
          trendPoints: [],
          notice: null,
        });
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) {
          setPhase({
            kind: "error",
            message: failureText(error, "Could not open the gym log."),
          });
        }
      });
    return () => {
      cancelled = true;
      void databaseRef.current?.close();
      databaseRef.current = null;
    };
  }, []);

  async function withDatabase(
    run: (database: GymDatabase, ready: Ready) => Promise<Ready>,
  ) {
    const database = databaseRef.current;
    if (!database || phase.kind !== "ready") return;
    const request = ++requestRef.current;
    const ready = phase;
    try {
      const next = await run(database, ready);
      if (requestRef.current !== request) return;
      setPhase(next);
    } catch (error) {
      if (requestRef.current !== request) return;
      setPhase({
        ...ready,
        notice: failureText(error, "Could not update the gym log."),
      });
    }
  }

  function currentView(ready: Ready): GymView | "exercises" | "trend" {
    if (ready.screen.name === "editor") return ready.screen.returnTo;
    if (ready.screen.name === "trend") return "trend";
    return ready.screen.name;
  }

  function openEditor(
    workout: Workout | null,
    date: string,
    returnTo: GymView,
  ) {
    if (phase.kind !== "ready") return;
    show({
      ...phase,
      notice: null,
      screen: { name: "editor", workout, date, returnTo },
    });
  }

  function closeEditor() {
    const current = phaseRef.current;
    if (current.kind !== "ready" || current.screen.name !== "editor") return;
    show({
      ...current,
      screen: viewScreen(current.screen.returnTo, current.listDate),
    });
  }

  function openTrend() {
    if (phase.kind !== "ready") return;
    const exerciseDefinitionId =
      phase.definitions.find((definition) => definition.id === "bench_press")
        ?.id ??
      phase.definitions[0]?.id ??
      "bench_press";
    void withDatabase(async (database, ready) => {
      const trendPoints = await database.trendForExercise(exerciseDefinitionId);
      return {
        ...ready,
        notice: null,
        trendPoints,
        screen: { name: "trend", exerciseDefinitionId },
      };
    });
  }

  const view = phase.kind === "ready" ? currentView(phase) : null;

  const toolbar = (
    <MiniAppToolbar>
      <MiniAppPageHeader>
        <MiniAppPageHeaderContent>
          <MiniAppPageHeaderTitle>Gym Log</MiniAppPageHeaderTitle>
        </MiniAppPageHeaderContent>
        <MiniAppPageHeaderActions>
          <Button
            type="button"
            variant={view === "days" ? "secondary" : "ghost"}
            aria-current={view === "days" ? "page" : undefined}
            onClick={() => {
              if (phase.kind !== "ready") return;
              show({
                ...phase,
                notice: null,
                screen: viewScreen("days", phase.listDate),
              });
            }}
          >
            Logs
          </Button>
          <Button
            type="button"
            variant={view === "workouts" ? "secondary" : "ghost"}
            aria-current={view === "workouts" ? "page" : undefined}
            onClick={() => {
              if (phase.kind !== "ready") return;
              show({ ...phase, notice: null, screen: { name: "workouts" } });
            }}
          >
            Workouts
          </Button>
          <Button
            type="button"
            variant={view === "exercises" ? "secondary" : "ghost"}
            aria-current={view === "exercises" ? "page" : undefined}
            onClick={() => {
              if (phase.kind !== "ready") return;
              show({ ...phase, notice: null, screen: { name: "exercises" } });
            }}
          >
            Exercises
          </Button>
          <Button
            type="button"
            variant={view === "trend" ? "secondary" : "ghost"}
            aria-current={view === "trend" ? "page" : undefined}
            onClick={openTrend}
          >
            Compare
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (phase.kind !== "ready") return;
              const returnTo = view === "workouts" ? "workouts" : "days";
              const date =
                returnTo === "days" ? (phase.listDate ?? today()) : today();
              openEditor(null, date, returnTo);
            }}
          >
            Log workout
          </Button>
        </MiniAppPageHeaderActions>
      </MiniAppPageHeader>
    </MiniAppToolbar>
  );

  let body = <MiniAppPageState kind="loading" title="Opening gym log" />;
  if (phase.kind === "unavailable") {
    body = (
      <MiniAppPageState
        kind="error"
        title="Workspace storage is unavailable"
        description="This screen needs host storage to keep workouts."
      />
    );
  } else if (phase.kind === "error") {
    body = (
      <MiniAppPageState
        kind="error"
        title="Could not open the gym log"
        description={phase.message}
      />
    );
  } else if (phase.kind === "ready") {
    const ready = phase;
    const editor = ready.screen.name === "editor" ? ready.screen : null;
    let main;
    if (ready.screen.name === "trend") {
      main = (
        <TrendView
          definitions={ready.definitions}
          exerciseDefinitionId={ready.screen.exerciseDefinitionId}
          points={ready.trendPoints}
          onChangeExercise={(nextId) => {
            void withDatabase(async (database, current) => {
              const trendPoints = await database.trendForExercise(nextId);
              return {
                ...current,
                trendPoints,
                screen: { name: "trend", exerciseDefinitionId: nextId },
              };
            });
          }}
        />
      );
    } else if (view === "exercises") {
      const afterExerciseChange = async (
        database: GymDatabase,
        current: Ready,
      ): Promise<Ready> => {
        const [definitions, workouts, page, day] = await Promise.all([
          database.listDefinitions(),
          database.listWorkouts(),
          database.listDayPage(current.pageUpper),
          current.listDate
            ? database.loadDay(current.listDate)
            : Promise.resolve(null),
        ]);
        return { ...current, definitions, workouts, page, day, notice: null };
      };
      main = (
        <ExerciseList
          definitions={ready.definitions}
          workouts={ready.workouts}
          onAdd={(name, targets) => {
            void withDatabase(async (database, current) => {
              await database.addExercise(name, targets);
              return afterExerciseChange(database, current);
            });
          }}
          onUpdate={(definition) => {
            void withDatabase(async (database, current) => {
              await database.updateExercise(definition);
              return afterExerciseChange(database, current);
            });
          }}
          onDelete={(definition) => {
            void withDatabase(async (database, current) => {
              await database.deleteExercise(definition.id);
              return afterExerciseChange(database, current);
            });
          }}
        />
      );
    } else if (view === "workouts") {
      main = (
        <WorkoutList
          workouts={ready.workouts}
          definitions={ready.definitions}
          onAdd={() => openEditor(null, today(), "workouts")}
          onEdit={(workout) =>
            openEditor(
              workout,
              localDate(workout.startedAt, workout.timeZone),
              "workouts",
            )
          }
          onDelete={(workout) => {
            void withDatabase(async (database, current) => {
              await database.deleteWorkout(workout.id);
              return reloaded(database, current, "workouts", null);
            });
          }}
        />
      );
    } else if (ready.listDate) {
      main = (
        <div className="flex flex-col gap-4">
          <div>
            <MiniAppBackButton
              label="Logs"
              onClick={() =>
                show({
                  ...ready,
                  listDate: null,
                  day: null,
                  screen: { name: "days", selectedDate: null },
                })
              }
            />
          </div>
          <DayDetail
            localDate={ready.listDate}
            workouts={ready.day ?? []}
            definitions={ready.definitions}
            onEdit={(workout) =>
              openEditor(
                workout,
                localDate(workout.startedAt, workout.timeZone),
                "days",
              )
            }
          />
        </div>
      );
    } else if (ready.page.days.length === 0 && ready.pageUpper === null) {
      main = (
        <MiniAppPageState
          kind="empty"
          title="No workouts yet"
          description="Log a workout to see it on the day list."
          action={
            <Button type="button" onClick={() => openEditor(null, today(), "days")}>
              Log a workout
            </Button>
          }
        />
      );
    } else {
      const openDay = (current: Ready, isoDate: string, day: Workout[]): Ready => ({
        ...current,
        listDate: isoDate,
        day,
        notice: null,
        screen: { name: "days", selectedDate: isoDate },
      });
      main = (
        <DayList
          days={ready.page.days}
          hasOlder={ready.page.hasOlder}
          hasNewer={ready.page.hasNewer}
          onSelect={(isoDate) => {
            void withDatabase(async (database, current) =>
              openDay(current, isoDate, await database.loadDay(isoDate)),
            );
          }}
          onEdit={(isoDate) => {
            void withDatabase(async (database, current) => {
              const day = await database.loadDay(isoDate);
              if (day.length !== 1) return openDay(current, isoDate, day);
              return {
                ...current,
                notice: null,
                screen: {
                  name: "editor",
                  workout: day[0],
                  date: isoDate,
                  returnTo: "days",
                },
              };
            });
          }}
          onDelete={(isoDate) => {
            void withDatabase(async (database, current) => {
              await database.deleteDay(isoDate);
              const next = await reloaded(database, current, "days", null);
              if (next.page.days.length > 0 || next.pageUpper === null) return next;
              return { ...next, pageUpper: null, page: await database.listDayPage(null) };
            });
          }}
          onOlder={() => {
            const oldest = ready.page.days.at(-1)?.localDate;
            if (!oldest) return;
            void withDatabase(async (database, current) => {
              const page = await database.listDayPage(oldest);
              return {
                ...current,
                pageUpper: oldest,
                page,
                notice: null,
              };
            });
          }}
          onNewer={() => {
            const newest = ready.page.days[0]?.localDate;
            if (!newest) return;
            void withDatabase(async (database, current) => {
              const pageUpper =
                await database.upperExclusiveForNewerPage(newest);
              const page = await database.listDayPage(pageUpper);
              return { ...current, pageUpper, page, notice: null };
            });
          }}
        />
      );
    }
    body = (
      <div className="p-4">
        {ready.notice ? <p role="alert">{ready.notice}</p> : null}
        {main}
        <Dialog
          open={editor !== null}
          onOpenChange={(open) => {
            if (!open) closeEditor();
          }}
        >
          <DialogContent style={{ maxHeight: "100%", overflowY: "auto" }}>
            <DialogHeader>
              <DialogTitle>
                {editor?.workout ? "Edit workout" : "Log workout"}
              </DialogTitle>
              <DialogDescription>
                Save leaves the session in progress. Finish records an end time.
              </DialogDescription>
            </DialogHeader>
            {editor ? (
              <WorkoutForm
                key={editor.workout?.id ?? `new-${editor.date}`}
                initial={editor.workout}
                date={editor.date}
                definitions={ready.definitions}
                preferredWeightUnit={ready.preferredWeightUnit}
                onCancel={closeEditor}
                onSave={(workout, newDefinitions) => {
                  const returnTo = editor.returnTo;
                  void withDatabase(async (database, current) => {
                    await database.saveWorkout(workout, newDefinitions);
                    return reloaded(
                      database,
                      current,
                      returnTo,
                      localDate(workout.startedAt, workout.timeZone),
                    );
                  });
                }}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <SurfaceViewport className="h-full min-h-0" data-testid="gym-log">
      <MiniAppPage className="h-full min-h-0" surface={false} toolbar={toolbar}>
        {body}
      </MiniAppPage>
    </SurfaceViewport>
  );
}

export function mount(
  container: HTMLElement,
  _context: TapFederatedSurfaceMountContext,
): TapFederatedSurfaceMount {
  const stopAppearanceSync = installMiniAppAppearanceSync();
  const root = createRoot(container);
  root.render(
    <TooltipProvider>
      <GymSurface />
    </TooltipProvider>,
  );
  let mounted = true;
  return {
    unmount() {
      if (!mounted) return;
      mounted = false;
      stopAppearanceSync();
      root.unmount();
    },
  };
}

export default Object.freeze({ mount, surfaceTarget: "desktop" as const });
