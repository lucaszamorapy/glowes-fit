import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import {
  NotFoundError,
  SessionAlreadyStartedError,
  WorkoutPlanNotActiveError,
} from "../errors/index.js";
import { auth } from "../lib/auth.js";
import {
  ErrorSchema,
  GetWorkoutPlanByIdParamsSchema,
  GetWorkoutPlanByIdResponseSchema,
  StartWorkoutSessionParamsSchema,
  StartWorkoutSessionResponseSchema,
  UpdateWorkoutSessionBodySchema,
  UpdateWorkoutSessionParamsSchema,
  UpdateWorkoutSessionResponseSchema,
  WorkoutPlanSchema,
} from "../schemas/index.js";
import { CreateWorkoutPlan, CreateWorkoutPlanOutputDto } from "../usecases/CreateWorkoutPlan.js";
import { GetWorkoutPlanById } from "../usecases/GetWorkoutPlanById.js";
import { StartWorkoutSession } from "../usecases/StartWorkoutSession.js";
import { UpdateWorkoutSession } from "../usecases/UpdateWorkoutSession.js";

export const workoutPlanRouter = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      tags: ['Workout Plan'],
      summary: "Create a workout plan",
      description: "Create a workout plan for a user",
      body: WorkoutPlanSchema.omit({ id: true }),
      response: {
        201: WorkoutPlanSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      }
    },
    handler: async (request, reply): Promise<void> => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        if (!session) {
          reply.status(401).send({
            error: "Unauthorized",
            code: "UNAUTHORIZED"
          });
          return;
        }
        const createWorkoutPlan = new CreateWorkoutPlan();
        const result: CreateWorkoutPlanOutputDto = await createWorkoutPlan.execute({
          userId: session.user.id,
          name: request.body.name,
          workoutDays: request.body.workoutDays
        });
        reply.status(201).send(result);
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.status(404).send({
            error: error.message,
            code: "NOT_FOUND_ERROR"
          });
          return;
        }
        app.log.error(error);
        reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR"
        });
      }

    }
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:id",
    schema: {
      tags: ['Workout Plan'],
      summary: "Get a workout plan by ID",
      description: "Returns the workout plan and its days (with exercisesCount only, no exercises). Protected; user must own the plan.",
      params: GetWorkoutPlanByIdParamsSchema,
      response: {
        200: GetWorkoutPlanByIdResponseSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      }
    },
    handler: async (request, reply): Promise<void> => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        if (!session) {
          reply.status(401).send({
            error: "Unauthorized",
            code: "UNAUTHORIZED"
          });
          return;
        }
        const params = request.params;
        const getWorkoutPlanById = new GetWorkoutPlanById();
        const result = await getWorkoutPlanById.execute({
          userId: session.user.id,
          workoutPlanId: params.id,
        });
        reply.status(200).send(result);
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.status(404).send({
            error: error.message,
            code: "NOT_FOUND_ERROR"
          });
          return;
        }
        app.log.error(error);
        reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR"
        });
      }
    }
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/:workoutPlanId/days/:workoutDayId/sessions",
    schema: {
      tags: ['Workout Plan'],
      summary: "Start a workout session",
      description: "Start a workout session for a specific workout day of a workout plan",
      params: StartWorkoutSessionParamsSchema,
      response: {
        201: StartWorkoutSessionResponseSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        500: ErrorSchema,
      }
    },
    handler: async (request, reply): Promise<void> => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        if (!session) {
          reply.status(401).send({
            error: "Unauthorized",
            code: "UNAUTHORIZED"
          });
          return;
        }
        const params = request.params;
        const startWorkoutSession = new StartWorkoutSession();
        const result = await startWorkoutSession.execute({
          userId: session.user.id,
          workoutPlanId: params.workoutPlanId,
          workoutDayId: params.workoutDayId,
        });
        reply.status(201).send(result);
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.status(404).send({
            error: error.message,
            code: "NOT_FOUND_ERROR"
          });
          return;
        }
        if (error instanceof WorkoutPlanNotActiveError) {
          reply.status(400).send({
            error: error.message,
            code: "WORKOUT_PLAN_NOT_ACTIVE"
          });
          return;
        }
        if (error instanceof SessionAlreadyStartedError) {
          reply.status(409).send({
            error: error.message,
            code: "SESSION_ALREADY_STARTED"
          });
          return;
        }
        app.log.error(error);
        reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR"
        });
      }
    }
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "PATCH",
    url: "/:workoutPlanId/days/:workoutDayId/sessions/:sessionId",
    schema: {
      tags: ['Workout Plan'],
      summary: "Update a workout session",
      description: "Update a specific workout session (e.g. set completedAt)",
      params: UpdateWorkoutSessionParamsSchema,
      body: UpdateWorkoutSessionBodySchema,
      response: {
        200: UpdateWorkoutSessionResponseSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      }
    },
    handler: async (request, reply): Promise<void> => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        if (!session) {
          reply.status(401).send({
            error: "Unauthorized",
            code: "UNAUTHORIZED"
          });
          return;
        }
        const params = request.params;
        const body = request.body;
        const updateWorkoutSession = new UpdateWorkoutSession();
        const result = await updateWorkoutSession.execute({
          userId: session.user.id,
          workoutPlanId: params.workoutPlanId,
          workoutDayId: params.workoutDayId,
          sessionId: params.sessionId,
          completedAt: body.completedAt,
        });
        reply.status(200).send(result);
      } catch (error) {
        if (error instanceof NotFoundError) {
          reply.status(404).send({
            error: error.message,
            code: "NOT_FOUND_ERROR"
          });
          return;
        }
        app.log.error(error);
        reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR"
        });
      }
    }
  });
}