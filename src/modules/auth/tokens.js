import { SignJWT, jwtVerify } from 'jose';
import { getEnvConfig } from '../../config/env.js';

const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = 'e-commerce-api';
const JWT_AUDIENCE = 'e-commerce-customers';
const JWT_EXPIRES_IN = '1h';
const encoder = new TextEncoder();

export async function createAuthToken(user) {
  return new SignJWT({
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(user.id)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(getSigningKey());
}

export async function verifyAuthToken(token) {
  const { payload } = await jwtVerify(token, getSigningKey(), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  return payload;
}

function getSigningKey() {
  return encoder.encode(getEnvConfig().jwtSecret);
}
