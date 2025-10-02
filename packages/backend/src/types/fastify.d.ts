import 'fastify';
import { Pool } from 'pg';
import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    db: Pool;
    auth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user?: {
      sub: string;
      userId?: string;
      email?: string;
      name?: string;
      [key: string]: any;
    };
  }
}
