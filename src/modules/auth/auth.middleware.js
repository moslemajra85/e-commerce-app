import { HttpError } from '../../shared/errors.js';
import { verifyAuthToken } from './tokens.js';

// Shared guard for customer-only routes. It converts the Authorization header
// into the current user record or throws a 401 before business logic runs.
export async function requireUser(prisma, req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Missing bearer token');
  }

  const token = header.slice('Bearer '.length);
  const payload = await parseToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user || user.status !== 'active') {
    throw new HttpError(401, 'Invalid bearer token');
  }

  return user;
}

async function parseToken(token) {
  try {
    return await verifyAuthToken(token);
  } catch {
    throw new HttpError(401, 'Invalid bearer token');
  }
}
