import { TtlCache } from '../cache/ttl-cache';
import type { HttpClient } from '../http/http-client';
import { BreedRepository } from './breed-repository';

type Breed = { id: string | number; name: string };

function setup() {
  const http = { get: jest.fn() };
  const repository = new BreedRepository<Breed, unknown>(
    http as unknown as HttpClient,
    new TtlCache<Breed[]>(60_000),
  );
  return { http, repository };
}

describe('BreedRepository', () => {
  it('serves findBreedById from the warm breed list, including numeric (TheDogAPI) ids', async () => {
    const { http, repository } = setup();
    http.get.mockResolvedValueOnce([{ id: 1, name: 'Affenpinscher' }, { id: 'abys', name: 'Abyssinian' }]);
    await repository.findAllBreeds();

    await expect(repository.findBreedById('1')).resolves.toEqual({ id: 1, name: 'Affenpinscher' });
    await expect(repository.findBreedById('abys')).resolves.toEqual({ id: 'abys', name: 'Abyssinian' });
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('falls back to the network (URL-encoding the id) when the breed list is cold', async () => {
    const { http, repository } = setup();
    http.get.mockResolvedValueOnce({ id: 'a b', name: 'Spacey' });

    await repository.findBreedById('a b');
    expect(http.get).toHaveBeenCalledWith('/breeds/a%20b');
  });
});
