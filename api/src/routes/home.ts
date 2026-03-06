import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { auth } from "../lib/auth.js";
import {
  ErrorSchema,
  GetHomeParamsSchema,
  GetHomeResponseSchema,
} from "../schemas/index.js";
import { GetHome } from "../usecases/GetHome.js";

export const homeRouter = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/:date",
    schema: {
      tags: ["Home"],
      summary: "Get home data for a date",
      description:
        "Returns data for the authenticated user's home page: active plan, today's workout, streak, and consistency for the week (Sunday–Saturday UTC).",
      params: GetHomeParamsSchema,
      response: {
        200: GetHomeResponseSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply): Promise<void> => {
      try {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        if (!session) {
          reply.status(401).send({
            error: "Unauthorized",
            code: "UNAUTHORIZED",
          });
          return;
        }
        const params = request.params;
        const getHome = new GetHome();
        const result = await getHome.execute({
          userId: session.user.id,
          date: params.date,
        });
        reply.status(200).send(result);
      } catch (error) {
        if (error instanceof Error && error.message.includes("Invalid date")) {
          reply.status(400).send({
            error: error.message,
            code: "BAD_REQUEST",
          });
          return;
        }
        app.log.error(error);
        reply.status(500).send({
          error: "Internal server error",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  });
};
