import 'dotenv/config'

import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import Fastify from 'fastify'
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

const app = Fastify({
  logger: true
})

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

//plugin do swagger para gerar a documentação da api, usando o jsonSchemaTransform para transformar os schemas do zod em json schema
await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'GlowesFitApi',
      description: 'API para o projeto GlowesFit',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:8081',
        description: 'Servidor local',
      }
    ],
  },
  transform: jsonSchemaTransform,
});

await app.register(fastifySwaggerUI, {
  routePrefix: '/docs',
});

app.withTypeProvider<ZodTypeProvider>().route({
  method: 'GET',
  url: "/",
  schema: {
    description: "Hello world",
    tags: ["Hello world"],
    response: {
      200: z.object({
        message: z.string(),
      })
    }
  },
  handler: () => {
    return { message: "Hello world" }
  }
});

try {
  await app.listen({ port: Number(process.env.PORT) || 8081 })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}