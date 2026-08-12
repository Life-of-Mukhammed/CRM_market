export type AppRole = 'DIREKTOR' | 'KASSIR';

export interface JWTPayload {
  userId: string;
  role: AppRole;
  name: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}
