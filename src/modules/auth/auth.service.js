import crypto from 'node:crypto';
import { HttpError } from '../../shared/errors.js';
import { hashPassword, verifyPassword } from './password.js';
import { createAuthToken } from './tokens.js';
import { parseLoginInput, parseRegistrationInput } from './auth.validation.js';

const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$7iwOKB8FJwZ4GUPZqOD40w$wBb01IIdEry6vvUdjY1s7lHvgOkdyW5Cczrhu/wybQg';

// Creates a customer account with a hashed password and returns an auth token.
// The API returns the same auth shape as login so clients can continue immediately.
export async function register(prisma, input) {
  const { email, password } = parseRegistrationInput(input);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new HttpError(409, 'Email is already registered');
  }

  const user = await prisma.user.create({
    data: {
      id: createId('user'),
      email,
      passwordHash: await hashPassword(password),
      role: 'customer',
      status: 'active',
    },
  });

  return createAuthResponse(user);
}

// Authenticates a customer and returns a signed bearer token. The returned user
// object deliberately excludes password data.
export async function login(prisma, credentials) {
  const { email, password } = parseLoginInput(credentials);
  const user = await prisma.user.findUnique({
    where: { email },
  });
  const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordMatches = await verifyPassword(password, passwordHash);

  if (!user || user.status !== 'active' || !passwordMatches) {
    throw new HttpError(401, 'Invalid email or password');
  }

  return createAuthResponse(user);
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function createAuthResponse(user) {
  return {
    token: await createAuthToken(user),
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
}
