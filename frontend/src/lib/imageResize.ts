/**
 * Redimensiona uma imagem no navegador (via canvas) antes de enviar pro
 * backend — evita mandar fotos de câmera/celular gigantes (10-20MB) quando
 * o produto só precisa de algo em torno de 1600px de largura.
 *
 * Retorna o base64 (sem o prefixo "data:image/...;base64,") e o mimeType
 * final, prontos pra mandar direto pro endpoint de upload.
 */
export async function resizeImageToBase64(
  file: File,
  maxDimension = 1600,
  quality = 0.85,
): Promise<{ base64: string; mimeType: string }> {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem neste navegador.');
  ctx.drawImage(image, 0, 0, width, height);

  // GIF não pode ser reprocessado num canvas sem perder a animação — nesse
  // caso, mantém o arquivo original em vez de "achatar" num JPEG.
  const outputMimeType = file.type === 'image/gif' ? 'image/gif' : 'image/jpeg';
  const outputDataUrl =
    outputMimeType === 'image/gif' ? dataUrl : canvas.toDataURL('image/jpeg', quality);

  return {
    base64: outputDataUrl.split(',')[1] ?? '',
    mimeType: outputMimeType,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Arquivo não é uma imagem válida.'));
    img.src = dataUrl;
  });
}
