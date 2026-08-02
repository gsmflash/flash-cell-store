import { describe, it, expect } from 'vitest';
import { slugify, generateUniqueSlug } from './slugify';

describe('slugify', () => {
  it('converte para minúsculas e troca espaços por hífen', () => {
    expect(slugify('iPhone 15 Pro Max')).toBe('iphone-15-pro-max');
  });

  it('remove acentos comuns do português', () => {
    expect(slugify('Fone de Ouvido Bluetooth Não-Oficial')).toBe('fone-de-ouvido-bluetooth-nao-oficial');
    expect(slugify('Câmera Traseira')).toBe('camera-traseira');
    expect(slugify('Assistência Técnica')).toBe('assistencia-tecnica');
  });

  it('remove símbolos não alfanuméricos', () => {
    expect(slugify('Capinha 50% OFF!!!')).toBe('capinha-50-off');
  });

  it('colapsa hífens repetidos e remove das pontas', () => {
    expect(slugify('  --Produto   Teste--  ')).toBe('produto-teste');
  });
});

describe('generateUniqueSlug', () => {
  it('retorna o slug base quando ele ainda não existe', async () => {
    const slug = await generateUniqueSlug('Produto Novo', async () => false);
    expect(slug).toBe('produto-novo');
  });

  it('acrescenta sufixo numérico quando o slug base já existe', async () => {
    const taken = new Set(['produto-novo', 'produto-novo-2']);
    const slug = await generateUniqueSlug('Produto Novo', async (candidate) => taken.has(candidate));
    expect(slug).toBe('produto-novo-3');
  });

  it('não gera colisão: nunca retorna um slug para o qual exists() retorna true', async () => {
    const taken = new Set(['x', 'x-2', 'x-3', 'x-4']);
    const slug = await generateUniqueSlug('x', async (candidate) => taken.has(candidate));
    expect(taken.has(slug)).toBe(false);
  });
});
