import { findExactMatch, suggestTags, TagSuggestion } from './suggest-tags';

const tags: TagSuggestion[] = [
  { id: '1', name: 'playa', usageCount: 12 },
  { id: '2', name: 'playa nudista', usageCount: 2 },
  { id: '3', name: 'parque', usageCount: 5 },
  { id: '4', name: 'panorámica', usageCount: 5 },
];

describe('suggestTags', () => {
  it('sin texto no sugiere nada', () => {
    expect(suggestTags('', tags)).toEqual([]);
  });

  it('coincide por prefijo (no por substring)', () => {
    const result = suggestTags('pla', tags);
    expect(result.map((t) => t.name)).toEqual(['playa', 'playa nudista']);
  });

  it('no matchea coincidencias a mitad de palabra', () => {
    // "ana" está dentro de "panorámica" pero no es su prefijo
    expect(suggestTags('ana', tags)).toEqual([]);
  });

  it('ordena por más usado primero, empate alfabético', () => {
    const result = suggestTags('pa', tags);
    expect(result.map((t) => t.name)).toEqual(['panorámica', 'parque']);
  });

  it('respeta el límite de sugerencias', () => {
    const manyTags: TagSuggestion[] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      name: `playa ${i}`,
      usageCount: i,
    }));
    expect(suggestTags('playa', manyTags, 3)).toHaveLength(3);
  });

  it('ignora mayúsculas/tildes/espacios al comparar', () => {
    expect(suggestTags('  PLA  ', tags).map((t) => t.name)).toEqual([
      'playa',
      'playa nudista',
    ]);
  });
});

describe('findExactMatch', () => {
  it('encuentra el tag existente por nombre normalizado', () => {
    expect(findExactMatch('  Playa  ', tags)?.id).toBe('1');
  });

  it('no encuentra nada si no hay coincidencia exacta', () => {
    expect(findExactMatch('monta', tags)).toBeNull();
  });
});
