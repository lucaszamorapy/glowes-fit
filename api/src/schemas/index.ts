import z from "zod";

import { WeekDay } from "../generated/prisma/enums.js";

export const ErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
});

export const WorkoutPlanSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
  workoutDays: z.array(z.object({
    name: z.string().trim().min(1),
    isRest: z.boolean().default(false),
    weekDay: z.enum(WeekDay),
    estimatedDurationInSeconds: z.number().min(1),
    coverImageUrl: z.string().url().optional(),
    exercises: z.array(z.object({
      order: z.number().min(0),
      name: z.string().trim().min(1),
      sets: z.number().min(1),
      reps: z.number().min(1),
      restTimeInSeconds: z.number().min(1),
    }))
  }))
})

export const StartWorkoutSessionResponseSchema = z.object({
  userWorkoutSessionId: z.string().uuid(),
});

export const StartWorkoutSessionParamsSchema = z.object({
  workoutPlanId: z.string().uuid(),
  workoutDayId: z.string().uuid(),
});

export const UpdateWorkoutSessionParamsSchema = z.object({
  workoutPlanId: z.string().uuid(),
  workoutDayId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

export const UpdateWorkoutSessionBodySchema = z.object({
  completedAt: z.string().datetime(),
});

export const UpdateWorkoutSessionResponseSchema = z.object({
  id: z.string().uuid(),
  completedAt: z.string(),
  startedAt: z.string(),
});

export const GetWorkoutPlanByIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const GetWorkoutPlanByIdResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  workoutDays: z.array(z.object({
    id: z.string().uuid(),
    weekDay: z.enum(WeekDay),
    name: z.string(),
    isRest: z.boolean(),
    coverImageUrl: z.string().url().optional(),
    estimatedDurationInSeconds: z.number(),
    exercisesCount: z.number(),
  })),
});

export const GetHomeParamsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

const TodayWorkoutDaySchema = z.object({
  workoutPlanId: z.string().uuid(),
  id: z.string().uuid(),
  name: z.string(),
  isRest: z.boolean(),
  weekDay: z.enum(WeekDay),
  estimatedDurationInSeconds: z.number(),
  coverImageUrl: z.string().url().optional(),
  exercisesCount: z.number(),
});

export const GetHomeResponseSchema = z.object({
  activeWorkoutPlanId: z.string(),
  todayWorkoutDay: TodayWorkoutDaySchema.nullable(),
  workoutStreak: z.number(),
  consistencyByDay: z.record(
    z.string(),
    z.object({
      workoutDayCompleted: z.boolean(),
      workoutDayStarted: z.boolean(),
    })
  ),
});