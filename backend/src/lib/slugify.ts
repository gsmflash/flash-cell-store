/**
 * Gera um slug URL-safe a partir de um texto, com suporte a acentos comuns
 * do português (normaliza para forma decomposta e remove diacríticos).
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // espaços e símbolos viram hífen
    .replace(/^-+|-+$/g, '') // remove hífens nas pontas
    .replace(/-{2,}/g, '-'); // colapsa hífens repetidos
}

/**
 * Gera um slug único, testando `${base}`, `${base}-2`, `${base}-3`... até
 * encontrar um valor para o qual `exists` retorne false.
 *
 * `exists` deve consultar o banco (excluindo o próprio registro em caso de
 * edição) e retornar se aquele slug já está em uso.
 */
export async function generateUniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const baseSlug = slugify(base);
  let candidate = baseSlug;
  let suffix = 2;

  while (await exists(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
