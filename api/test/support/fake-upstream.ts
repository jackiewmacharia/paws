import type { CatBreed } from '../../src/modules/cats/cat.types';
import type { DogBreed } from '../../src/modules/dogs/dog.types';

export const catBreeds: CatBreed[] = [
  {
    id: 'abys',
    name: 'Abyssinian',
    temperament: 'Active, Energetic, Independent, Intelligent, Gentle',
    origin: 'Egypt',
    life_span: '14 - 15',
    weight: { imperial: '7 - 10', metric: '3 - 5' },
    hairless: 0,
  },
  {
    id: 'beng',
    name: 'Bengal',
    temperament: 'Alert, Agile, Energetic, Demanding, Intelligent',
    origin: 'United States',
    life_span: '12 - 15',
    weight: { imperial: '6 - 12', metric: '3 - 7' },
    hairless: 0,
  },
];

export const dogBreeds: DogBreed[] = [
  {
    id: 1,
    name: 'Affenpinscher',
    temperament: 'Confident, alert, playful, loyal, courageous',
    origin: 'Germany',
    life_span: '12-15',
    weight: { imperial: '7-10', metric: '3.2-4.5' },
    bred_for: 'Small rodent hunting, lapdog',
  },
  {
    id: 2,
    name: 'Afghan Hound',
    temperament: 'Aloof, Clownish, Dignified, Independent, Happy',
    origin: 'Afghanistan',
    life_span: '10-13',
    weight: { imperial: '50-60', metric: '22.5-27' },
    bred_for: 'Coursing and hunting',
  },
];

/** Mirrors the real unknown-breed-id responses: cat 400 plain text, dog 404 JSON. */
export function installFetchMock(): jest.SpyInstance {
  return jest
    .spyOn(global, 'fetch')
    .mockImplementation(async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      const isCat = url.hostname.includes('thecatapi');
      const breeds = isCat ? catBreeds : dogBreeds;

      if (url.pathname.endsWith('/breeds/search')) {
        const q = (url.searchParams.get('q') ?? '').toLowerCase();
        return jsonResponse(
          breeds.filter((breed) => breed.name.toLowerCase().includes(q)),
        );
      }

      if (url.pathname.endsWith('/breeds')) {
        return jsonResponse(breeds);
      }

      const breedMatch = /\/breeds\/([^/]+)$/.exec(url.pathname);
      if (breedMatch) {
        const breed = breeds.find(
          (b) => String(b.id) === decodeURIComponent(breedMatch[1]),
        );
        if (!breed) {
          return isCat
            ? textResponse('INVALID_DATA', 400)
            : jsonResponse({ message: 'Breed not found' }, 404);
        }
        return jsonResponse(breed);
      }

      if (url.pathname.endsWith('/images/search')) {
        const breedId = url.searchParams.get('breed_ids') ?? undefined;
        const breed = breedId
          ? breeds.find((b) => String(b.id) === breedId)
          : undefined;
        return jsonResponse([
          {
            id: 'img1',
            url: `https://cdn2.${isCat ? 'thecatapi' : 'thedogapi'}.com/images/img1.jpg`,
            width: 800,
            height: 600,
            breeds: breed ? [breed] : [],
          },
        ]);
      }

      return jsonResponse({ message: 'not found in fake upstream' }, 404);
    });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain' },
  });
}
