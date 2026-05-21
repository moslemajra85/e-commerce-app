import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);

const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

function formatPasswordHash(salt, hash) {
  return [
    "scrypt",
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt,
    Buffer.from(hash).toString("base64url"),
  ].join("$");
}
export async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES).toString("base64url");
  const hash = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);

  return formatPasswordHash(salt, hash);
}

async function run() {
  const hash = await hashPassword("abcAdam123");
  console.log(hash);
}

run();
