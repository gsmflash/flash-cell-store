import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Gera o hash de uma senha em texto puro.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compara uma senha em texto puro com um hash armazenado.
 * Retorna true se coincidirem.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
