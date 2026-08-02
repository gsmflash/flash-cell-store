import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { env } from '../config/env';

/**
 * Wrapper fino sobre o Cloudflare R2 (compatível com a API do S3).
 *
 * ⚠️ IMPORTANTE: assim como os wrappers do Mercado Pago e Resend, este
 * código nunca foi executado contra o R2 real neste ambiente de
 * desenvolvimento (sem acesso à internet). A estrutura segue a documentação
 * oficial do R2 (que usa o SDK do S3 apontando pro endpoint deles), mas
 * vale testar com um upload de verdade assim que possível.
 */

function requireR2Config() {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME || !env.R2_PUBLIC_URL) {
    throw new Error(
      'Armazenamento de arquivos (R2) não configurado. Defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME e R2_PUBLIC_URL.',
    );
  }
  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME,
    publicUrl: env.R2_PUBLIC_URL.replace(/\/$/, ''),
  };
}

function getClient(config: ReturnType<typeof requireR2Config>): S3Client {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    // Obrigatório para o R2: sem isso, o SDK tenta endereçamento
    // virtual-hosted-style (bucket.accountid.r2.cloudflarestorage.com), que
    // o R2 não aceita da mesma forma que a AWS — isso muda o host usado no
    // cálculo da assinatura e causa "signature does not match".
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  // As opções acima nem sempre são respeitadas dependendo da versão exata
  // do SDK — removemos o middleware direto da pilha como garantia. É esse
  // middleware que anexa um checksum extra (CRC32) que o R2 não valida do
  // mesmo jeito que a AWS, causando "SignatureDoesNotMatch".
  client.middlewareStack.remove('flexibleChecksumsMiddleware');

  return client;
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export interface UploadImageInput {
  /** Buffer decodificado (não base64) da imagem. */
  buffer: Buffer;
  mimeType: string;
  /** Pasta lógica dentro do bucket, ex.: "products", "store". */
  folder: string;
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB

/**
 * Envia uma imagem para o R2 e retorna a URL pública dela.
 * Lança erro se o tipo de arquivo não for permitido, se passar do tamanho
 * máximo, ou se o R2 não estiver configurado.
 *
 * Implementação: em vez de mandar o arquivo direto via `client.send(new
 * PutObjectCommand(...))`, geramos uma URL pré-assinada e fazemos o PUT com
 * `fetch` puro. O envio direto aciona um middleware do SDK da AWS que
 * anexa um checksum extra (CRC32) que o R2 não valida do mesmo jeito que a
 * AWS — isso quebra a assinatura ("SignatureDoesNotMatch") mesmo com as
 * opções de configuração que deveriam desativar esse comportamento. Gerar
 * a URL pré-assinada usa um caminho de código diferente dentro do SDK que
 * não aciona esse middleware.
 */
export async function uploadImage(input: UploadImageInput): Promise<string> {
  const config = requireR2Config();

  const extension = ALLOWED_MIME_TYPES[input.mimeType];
  if (!extension) {
    throw new Error('Formato de imagem não suportado. Use JPEG, PNG, WEBP ou GIF.');
  }

  if (input.buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error('Imagem muito grande. O limite é 8MB.');
  }

  const key = `${input.folder}/${randomUUID()}.${extension}`;
  const client = getClient(config);

  const presignedUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      ContentType: input.mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
    { expiresIn: 300 },
  );

  const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: input.buffer,
    headers: {
      'Content-Type': input.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Falha ao enviar imagem pro R2 (${response.status}): ${body}`);
  }

  return `${config.publicUrl}/${key}`;
}

/**
 * Remove um arquivo do R2 a partir da sua URL pública. Não lança se a URL
 * não pertencer a este bucket (ex.: imagem cadastrada manualmente por URL
 * externa) — nesse caso, simplesmente não faz nada.
 */
export async function deleteImageByUrl(url: string): Promise<void> {
  let config: ReturnType<typeof requireR2Config>;
  try {
    config = requireR2Config();
  } catch {
    return; // R2 não configurado — nada a fazer.
  }

  if (!url.startsWith(config.publicUrl)) {
    return; // Não é uma imagem hospedada no nosso R2 (provavelmente URL manual).
  }

  const key = url.slice(config.publicUrl.length + 1);
  const client = getClient(config);

  try {
    await client.send(new DeleteObjectCommand({ Bucket: config.bucketName, Key: key }));
  } catch (err) {
    // Falha ao remover do R2 não deve travar a remoção do registro no banco.
    console.error('[r2Storage] falha ao remover objeto:', err);
  }
}
