import { HttpError } from '../../shared/errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseRegistrationInput(input) {
  return {
    email: normalizeEmail(input.email),
    password: parsePassword(input.password),
  };
}

export function parseLoginInput(input) {
  return {
    email: normalizeEmail(input.email),
    password: parseLoginPassword(input.password),
  };
}

function normalizeEmail(email) {
  if (typeof email !== 'string') {
    throw new HttpError(400, 'Email is required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new HttpError(400, 'Email must be valid');
  }

  return normalizedEmail;
}

function parsePassword(password) {
  const parsedPassword = parseLoginPassword(password);

  if (parsedPassword.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters');
  }

  if (!/[A-Za-z]/.test(parsedPassword) || !/\d/.test(parsedPassword)) {
    throw new HttpError(400, 'Password must contain at least one letter and one number');
  }

  return parsedPassword;
}

function parseLoginPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new HttpError(400, 'Password is required');
  }

  return password;
}
