import { HttpError } from '../../shared/errors.js';

// Shared guard for customer-only routes. It converts the Authorization header
// into the current user record or throws a 401 before business logic runs.
export function requireUser(store, req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Missing bearer token');
  }

  const token = header.slice('Bearer '.length);
  const userId = store.sessions.get(token);
  const user = store.users.find((candidate) => candidate.id === userId);

  if (!user) {
    throw new HttpError(401, 'Invalid bearer token');
  }

  return user;
}
