import { SearchSitePlacesUseCase } from './search-site-places.use-case';

describe('SearchSitePlacesUseCase', () => {
  let search: { search: jest.Mock };
  let useCase: SearchSitePlacesUseCase;

  beforeEach(() => {
    search = { search: jest.fn().mockResolvedValue([{ externalPlaceId: 'p1' }]) };
    useCase = new SearchSitePlacesUseCase(search as never);
  });

  it('no consulta el proveedor con una query demasiado corta', async () => {
    const result = await useCase.execute('a');
    expect(result).toEqual([]);
    expect(search.search).not.toHaveBeenCalled();
  });

  it('recorta espacios antes de decidir si la query es válida', async () => {
    const result = await useCase.execute('  a  ');
    expect(result).toEqual([]);
    expect(search.search).not.toHaveBeenCalled();
  });

  it('delega en el proveedor con la query recortada', async () => {
    const result = await useCase.execute('  chiringuito  ');
    expect(search.search).toHaveBeenCalledWith('chiringuito');
    expect(result).toEqual([{ externalPlaceId: 'p1' }]);
  });
});
