import { createId } from '../../db/store.js';
import { HttpError } from '../../shared/errors.js';

// Authenticates a seeded customer and records a bearer token in the in-memory
// session map. The returned user object deliberately excludes the password.
export function login(store, credentials) {
  const { email, password } = credentials;
  const user = store.users.find((candidate) => candidate.email === email);

  if (!user || user.password !== password) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const token = createId('session');
  store.sessions.set(token, user.id);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
}
