import { SuggestTagsUseCase } from './suggest-tags.use-case';

describe('SuggestTagsUseCase', () => {
  let tags: { searchByPrefix: jest.Mock };
  let useCase: SuggestTagsUseCase;

  beforeEach(() => {
    tags = {
      searchByPrefix: jest.fn().mockResolvedValue([
        { id: '1', name: 'playa', usageCount: 12 },
        { id: '2', name: 'playa nudista', usageCount: 2 },
      ]),
    };
    useCase = new SuggestTagsUseCase(tags as never);
  });

  it('sin texto no consulta el repositorio', async () => {
    const result = await useCase.execute('   ');

    expect(result).toEqual([]);
    expect(tags.searchByPrefix).not.toHaveBeenCalled();
  });

  it('normaliza la query antes de pedir candidatos', async () => {
    await useCase.execute('  PLA  ');

    expect(tags.searchByPrefix).toHaveBeenCalledWith('pla', 50);
  });

  it('devuelve las sugerencias ordenadas por uso', async () => {
    const result = await useCase.execute('pla');

    expect(result.map((t) => t.name)).toEqual(['playa', 'playa nudista']);
  });
});
