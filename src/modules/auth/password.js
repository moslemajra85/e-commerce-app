import argon2 from 'argon2';

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
};

export async function hashPassword(password) {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(password, storedPasswordHash) {
  if (typeof storedPasswordHash !== 'string') {
    return false;
  }

  try {
    return await argon2.verify(storedPasswordHash, password);
  } catch {
    return false;
  }
}
