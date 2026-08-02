import { useEffect } from 'react';

interface DocumentMetaOptions {
  title: string;
  description?: string;
  image?: string;
}

function setMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  let tag = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

/**
 * Define title + meta description + Open Graph da página atual. Compartilhar
 * um link de produto no WhatsApp, por exemplo, usa essas tags Open Graph
 * para montar a prévia (imagem, título, descrição).
 */
export function useDocumentMeta({ title, description, image }: DocumentMetaOptions): void {
  useEffect(() => {
    const fullTitle = `${title} | Flash Cell Store`;
    document.title = fullTitle;

    if (description) {
      setMetaTag('name', 'description', description);
      setMetaTag('property', 'og:description', description);
    }

    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:type', 'website');

    if (image) {
      setMetaTag('property', 'og:image', image);
    }
  }, [title, description, image]);
}
