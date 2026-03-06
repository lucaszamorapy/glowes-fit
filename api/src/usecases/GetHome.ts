import dayjs from "dayjs";

import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";
import { WorkoutDay } from "../generated/prisma/client.js";

// UTC plugin: use require-style import for CJS plugin (no ESM types in package)
const utc = (await import("dayjs/plugin/utc.js")).default;
dayjs.extend(utc);

const WEEKDAY_TO_ENUM: WeekDay[] = [
  WeekDay.SUNDAY,
  WeekDay.MONDAY,
  WeekDay.TUESDAY,
  WeekDay.WEDNESDAY,
  WeekDay.THURSDAY,
  WeekDay.FRIDAY,
  WeekDay.SATURDAY,
];

interface InputDto {
  userId: string;
  date: string; // YYYY-MM-DD
}

export interface GetHomeOutputDto {
  activeWorkoutPlanId: string;
  todayWorkoutDay: {
    workoutPlanId: string;
    id: string;
    name: string;
    isRest: boolean;
    weekDay: WeekDay;
    estimatedDurationInSeconds: number;
    coverImageUrl?: string;
    exercisesCount: number;
  } | null;
  workoutStreak: number;
  consistencyByDay: {
    [key: string]: {
      workoutDayCompleted: boolean;
      workoutDayStarted: boolean;
    };
  };
}

export class GetHome {
  async execute(dto: InputDto): Promise<GetHomeOutputDto> {
    const date = dayjs.utc(dto.date, "YYYY-MM-DD", true);
    if (!date.isValid()) {
      throw new Error("Invalid date format. Use YYYY-MM-DD");
    }

    const weekStart = date.startOf("week"); // Sunday 00:00:00 UTC
    const weekEnd = date.endOf("week"); // Saturday 23:59:59.999 UTC

    const activePlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
      },
      include: {
        workoutDays: {
          include: {
            _count: { select: { exercises: true } },
          },
        },
      },
    });

    const consistencyByDay = await this.buildConsistencyByDay(
      weekStart,
      weekEnd,
      dto.userId
    );

    let activeWorkoutPlanId = "";
    let todayWorkoutDay: GetHomeOutputDto["todayWorkoutDay"] = null;
    let workoutStreak = 0;

    if (activePlan) {
      activeWorkoutPlanId = activePlan.id;

      const weekday = WEEKDAY_TO_ENUM[date.day()];
      const matchingDay = activePlan.workoutDays.find(
        (d) => d.weekDay === weekday
      );
      if (matchingDay) {
        todayWorkoutDay = {
          workoutPlanId: activePlan.id,
          id: matchingDay.id,
          name: matchingDay.name,
          isRest: matchingDay.isRest,
          weekDay: matchingDay.weekDay,
          estimatedDurationInSeconds: matchingDay.estimatedDurationInSeconds,
          coverImageUrl: matchingDay.coverImageUrl ?? undefined,
          exercisesCount: matchingDay._count.exercises,
        };
      }

      workoutStreak = this.computeWorkoutStreak(
        date,
        weekStart,
        activePlan.workoutDays,
        consistencyByDay
      );
    }

    return {
      activeWorkoutPlanId,
      todayWorkoutDay,
      workoutStreak,
      consistencyByDay,
    };
  }

  private async buildConsistencyByDay(
    weekStart: dayjs.Dayjs,
    weekEnd: dayjs.Dayjs,
    userId: string
  ): Promise<GetHomeOutputDto["consistencyByDay"]> {
    const result: GetHomeOutputDto["consistencyByDay"] = {};

    let d = weekStart;
    while (d.isBefore(weekEnd) || d.isSame(weekEnd, "day")) {
      const key = d.format("YYYY-MM-DD");
      result[key] = { workoutDayCompleted: false, workoutDayStarted: false };
      d = d.add(1, "day");
    }

    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        startedAt: {
          gte: weekStart.toDate(),
          lte: weekEnd.toDate(),
        },
      },
    });

    for (const session of sessions) {
      const dateKey = dayjs.utc(session.startedAt).format("YYYY-MM-DD");
      if (result[dateKey]) {
        result[dateKey].workoutDayStarted = true;
        if (session.completedAt != null) {
          result[dateKey].workoutDayCompleted = true;
        }
      }
    }

    return result;
  }

  private computeWorkoutStreak(
    fromDate: dayjs.Dayjs,
    weekStart: dayjs.Dayjs,
    workoutDays: Array<{ id: string; weekDay: string }>,
    consistencyByDay: GetHomeOutputDto["consistencyByDay"]
  ): number {
    const planWeekDays = new Set(workoutDays.map((d) => d.weekDay));
    let streak = 0;
    let d = fromDate;
    while (!d.isBefore(weekStart, "day")) {
      const dateKey = d.format("YYYY-MM-DD");
      const weekday = WEEKDAY_TO_ENUM[d.day()];
      if (!planWeekDays.has(weekday)) {
        d = d.subtract(1, "day");
        continue;
      }
      if (!consistencyByDay[dateKey]?.workoutDayCompleted) break;
      streak += 1;
      d = d.subtract(1, "day");
    }
    return streak;
  }
}
