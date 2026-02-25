import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";

import { PrismaClient } from "../generated/prisma/client.js";

//criacao da instancia do prisma para ser usada no adapter do better auth, usando o PrismaPg para conectar com o postgres, e pegando a connection string do .env
export const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

export const auth = betterAuth({
  trustedOrigins: [process.env.WEB_URL || "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [openAPI()],
})