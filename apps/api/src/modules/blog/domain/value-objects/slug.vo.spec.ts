import { isValidSlug, resolveSlug, slugify } from './slug.vo';

describe('slug.vo', () => {
  describe('slugify', () => {
    it('normaliza a kebab-case y quita acentos', () => {
      expect(slugify('Árbol de Navidad')).toBe('arbol-de-navidad');
    });

    it('colapsa separadores y recorta guiones', () => {
      expect(slugify('  Hola___Mundo!!  ')).toBe('hola-mundo');
    });

    it('elimina símbolos no alfanuméricos', () => {
      expect(slugify('C# & .NET @ 2026')).toBe('c-net-2026');
    });
  });

  describe('isValidSlug', () => {
    it('acepta slugs kebab-case válidos', () => {
      expect(isValidSlug('hola-mundo')).toBe(true);
      expect(isValidSlug('post123')).toBe(true);
    });

    it('rechaza mayúsculas, espacios y guiones colgantes', () => {
      expect(isValidSlug('Hola-Mundo')).toBe(false);
      expect(isValidSlug('hola mundo')).toBe(false);
      expect(isValidSlug('-hola')).toBe(false);
      expect(isValidSlug('hola--mundo')).toBe(false);
    });
  });

  describe('resolveSlug', () => {
    it('usa el slug pedido si es válido', () => {
      expect(resolveSlug('mi-post', 'Título Cualquiera')).toBe('mi-post');
    });

    it('normaliza el slug pedido si no es válido', () => {
      expect(resolveSlug('Mi Post!', 'fallback')).toBe('mi-post');
    });

    it('cae al título cuando no se envía slug', () => {
      expect(resolveSlug(undefined, 'Noticias de Última Hora')).toBe(
        'noticias-de-ultima-hora',
      );
      expect(resolveSlug('', 'Otro Título')).toBe('otro-titulo');
    });
  });
});
