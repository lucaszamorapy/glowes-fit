import { NotFoundError } from "../errors/index.js";
import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
  workoutPlanId: string;
  workoutDayId: string;
  sessionId: string;
  completedAt: string;
}

export interface UpdateWorkoutSessionOutputDto {
  id: string;
  completedAt: string;
  startedAt: string;
}

export class UpdateWorkoutSession {
  async execute(dto: InputDto): Promise<UpdateWorkoutSessionOutputDto> {
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { id: dto.workoutPlanId },
      include: {
        workoutDays: {
          where: { id: dto.workoutDayId },
        },
      },
    });

    if (!workoutPlan) {
      throw new NotFoundError("Workout plan not found");
    }

    if (workoutPlan.userId !== dto.userId) {
      throw new NotFoundError("Workout plan not found");
    }

    const workoutDay = workoutPlan.workoutDays[0];
    if (!workoutDay) {
      throw new NotFoundError("Workout day not found");
    }

    const session = await prisma.workoutSession.findUnique({
      where: {
        id: dto.sessionId,
        workoutDayId: dto.workoutDayId,
        userId: dto.userId,
      },
    });

    if (!session) {
      throw new NotFoundError("Workout session not found");
    }

    const completedAtDate = new Date(dto.completedAt);
    if (Number.isNaN(completedAtDate.getTime())) {
      throw new Error("Invalid completedAt date");
    }

    const updated = await prisma.workoutSession.update({
      where: { id: dto.sessionId },
      data: { completedAt: completedAtDate },
    });

    return {
      id: updated.id,
      completedAt: updated.completedAt!.toISOString(),
      startedAt: updated.startedAt.toISOString(),
    };
  }
}
