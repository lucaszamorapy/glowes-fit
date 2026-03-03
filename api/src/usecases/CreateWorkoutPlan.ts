import { NotFoundError } from "../errors/index.js";
import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
  name: string;
  workoutDays: Array<{
    name: string;
    isRest: boolean;
    weekDay: WeekDay;
    estimatedDurationInSeconds: number;
    exercises: Array<{
      order: number;
      name: string;
      sets: number;
      reps: number;
      restTimeInSeconds: number;
    }>
  }>
}

// export interface OutputDto {
// }

export class CreateWorkoutPlan {
  async execute(dto: InputDto) {
    const existingActiveWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
      }
    });
    return await prisma.$transaction(async (tx) => {
      if (existingActiveWorkoutPlan) {
        await tx.workoutPlan.update({
          where: {
            id: existingActiveWorkoutPlan.id,
          },
          data: {
            isActive: false,
          }
        })
      }
      const workoutPlan = await tx.workoutPlan.create({
        data: {
          name: dto.name,
          userId: dto.userId,
          isActive: true,
          workoutDays: {
            create: dto.workoutDays.map(workoutDay => ({
              name: workoutDay.name,
              isRest: workoutDay.isRest,
              weekDay: workoutDay.weekDay,
              estimatedDurationInSeconds: workoutDay.estimatedDurationInSeconds,
              exercises: {
                create: workoutDay.exercises.map(exercise => ({
                  order: exercise.order,
                  name: exercise.name,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  restTimeInSeconds: exercise.restTimeInSeconds
                }))
              }
            }))
          }
        }
      });
      const result = await tx.workoutPlan.findUnique({
        where: {
          id: workoutPlan.id,
        },
        include: {
          workoutDays: {
            include: {
              exercises: true,
            }
          }
        }
      })
      if (!result) {
        throw new NotFoundError("Workout plan not found after creation");
      }
      return {
        id: result.id,
        name: result.name,
        workoutDays: result.workoutDays.map((day) => ({
          name: day.name,
          weekDay: day.weekDay,
          isRest: day.isRest,
          estimatedDurationInSeconds: day.estimatedDurationInSeconds,
          //coverImageUrl: day.coverImageUrl ?? undefined,
          exercises: day.exercises.map((exercise) => ({
            order: exercise.order,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            restTimeInSeconds: exercise.restTimeInSeconds,
          })),
        })),
      };
    })
  }

}