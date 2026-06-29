const SITE_NAME = 'Core';
const DEFAULT_DESCRIPTION = 'Plataforma digital Core.';
const DEFAULT_OG_IMAGE = '/og-default.png';

export interface SeoMeta {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

export interface ResolvedSeoMeta extends Required<SeoMeta> {
  fullTitle: string;
}

export function buildSeoMeta(meta: SeoMeta): ResolvedSeoMeta {
  return {
    title: meta.title,
    fullTitle: `${meta.title} | ${SITE_NAME}`,
    description: meta.description ?? DEFAULT_DESCRIPTION,
    image: meta.image ?? DEFAULT_OG_IMAGE,
    url: meta.url ?? '',
    type: meta.type ?? 'website',
  };
}
