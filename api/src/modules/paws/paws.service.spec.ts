import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExternalApiError, NotFoundError } from '../../common/errors/http-error';
import type { CatService } from '../cats/cat.service';
import type { CatBreed } from '../cats/cat.types';
import type { DogService } from '../dogs/dog.service';
import type { DogBreed } from '../dogs/dog.types';
import { PawsService } from './paws.service';

const cat = (overrides: Partial<CatBreed> = {}): CatBreed => ({
  id: 'abys',
  name: 'Abyssinian',
  temperament: 'Active, Energetic',
  life_span: '14 - 16',
  weight: { imperial: '7 - 10', metric: '3 - 5' },
  ...overrides,
});

const dog = (overrides: Partial<DogBreed> = {}): DogBreed => ({
  id: 1,
  name: 'Affenpinscher',
  temperament: 'Confident, alert, playful',
  life_span: '12-14',
  weight: { imperial: '7-10', metric: '3-5' },
  ...overrides,
});

/** Single-breed lists make the "random" pick deterministic. */
function setup(catBreeds: CatBreed[], dogBreeds: DogBreed[]) {
  const catService = {
    getBreeds: vi.fn().mockResolvedValue(catBreeds),
    getBreed: vi.fn().mockResolvedValue(catBreeds[0]),
    getRandomImage: vi.fn().mockResolvedValue({ id: 'c-img', url: 'https://cdn2.thecatapi.com/c.jpg' }),
    getCatOfTheDay: vi.fn().mockResolvedValue({ breed: catBreeds[0], funFact: 'cat fact' }),
  };
  const dogService = {
    getBreeds: vi.fn().mockResolvedValue(dogBreeds),
    getBreed: vi.fn().mockResolvedValue(dogBreeds[0]),
    getRandomImage: vi.fn().mockResolvedValue({ id: 'd-img', url: 'https://cdn2.thedogapi.com/d.jpg' }),
    getDogOfTheDay: vi.fn().mockResolvedValue({ breed: dogBreeds[0], funFact: 'dog fact' }),
  };
  const service = new PawsService(catService as unknown as CatService, dogService as unknown as DogService);
  return { service, catService, dogService };
}

describe('PawsService', () => {
  describe('getShowdown', () => {
    it('declares the side that takes 2 of 3 rounds the winner, naming the rounds it won', async () => {
      // Cat lives longer (15 vs 13); dog is heavier (4.5 vs 4 kg) and has more traits (3 vs 2).
      const { service } = setup([cat()], [dog({ weight: { imperial: '', metric: '4-5' } })]);
      const result = await service.getShowdown();

      expect(result.rounds.map((r) => [r.category, r.winner])).toEqual([
        ['Longevity', 'cat'],
        ['Heft', 'dog'],
        ['Temperament variety', 'dog'],
      ]);
      expect(result.overallWinner).toBe('dog');
      expect(result.summary).toBe('Affenpinscher takes the showdown, winning on heft and temperament variety.');
    });

    it('reports a tie when both sides win the same number of rounds', async () => {
      const { service } = setup(
        [cat({ life_span: '13', weight: { imperial: '', metric: '4' } })],
        [dog({ life_span: '13', weight: { imperial: '', metric: '4' }, temperament: 'Confident, alert' })],
      );
      const result = await service.getShowdown();

      expect(result.rounds.every((r) => r.winner === 'tie')).toBe(true);
      expect(result.overallWinner).toBe('tie');
      expect(result.summary).toBe('Abyssinian and Affenpinscher tied — an even match across 3 rounds.');
    });

    it('leaves a round without a winner (instead of scoring 0) when a breed is missing that stat', async () => {
      const { service } = setup([cat({ life_span: undefined })], [dog()]);
      const result = await service.getShowdown();

      const longevity = result.rounds.find((r) => r.category === 'Longevity')!;
      expect(longevity).toEqual({ category: 'Longevity', catValue: undefined, dogValue: 13, winner: undefined });
    });

    it('still returns a result without a photo when an image lookup fails', async () => {
      const { service, dogService } = setup([cat()], [dog()]);
      dogService.getRandomImage.mockRejectedValue(new NotFoundError('no images'));

      const result = await service.getShowdown();
      expect(result.cat.image).toBeDefined();
      expect(result.dog.image).toBeUndefined();
    });

    it('logs image failures other than "not found"', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { service, catService } = setup([cat()], [dog()]);
      catService.getRandomImage.mockRejectedValue(new ExternalApiError('TheCatAPI', 'rate limited', 429));

      await service.getShowdown();
      expect(warn).toHaveBeenCalledWith("[best-effort] cat image for 'abys' failed:", expect.any(ExternalApiError));
      warn.mockRestore();
    });
  });

  describe('compareBreeds', () => {
    it('matches shared temperament traits case-insensitively', async () => {
      const { service } = setup(
        [cat({ temperament: 'Alert, Playful, Shy' })],
        [dog({ temperament: 'alert, PLAYFUL, Loyal' })],
      );
      const result = await service.compareBreeds('abys', '1');
      expect(result.sharedTemperamentTraits).toEqual(['alert', 'playful']);
    });

    it('declares ties, and gives no verdict when a stat is missing on either side', async () => {
      const { service } = setup(
        [cat({ life_span: '12 - 14', weight: undefined })],
        [dog({ life_span: '13' })],
      );
      const result = await service.compareBreeds('abys', '1');
      expect(result.longerLivedSpecies).toBe('tie');
      expect(result.heavierSpecies).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('ignores unparseable life spans and counts each trait once per breed, case-insensitively', async () => {
      const { service } = setup(
        [
          cat({ name: 'A', life_span: '10 - 12', temperament: 'Calm, calm, Gentle' }),
          cat({ name: 'B', life_span: 'unknown', temperament: 'CALM' }),
          cat({ name: 'C', life_span: '14 - 16', temperament: 'Shy' }),
        ],
        [],
      );
      const { cats, dogs } = await service.getStats();

      expect(cats.breedCount).toBe(3);
      expect(cats.averageLifeSpanYears).toBe(13); // (11 + 15) / 2 — "unknown" is skipped, not counted as 0
      expect(cats.longestLivedBreed).toEqual({ name: 'C', averageLifeSpanYears: 15 });
      expect(cats.mostCommonTemperamentTrait).toEqual({ trait: 'calm', breedCount: 2 });
      expect(dogs).toEqual({ breedCount: 0, averageLifeSpanYears: 0 });
    });
  });

  describe('getPawOfTheDay', () => {
    afterEach(() => vi.useRealTimers());

    it('alternates between a cat and a dog on consecutive days', async () => {
      const { service } = setup([cat()], [dog()]);
      const species: string[] = [];
      for (const day of ['2026-11-20T12:00:00Z', '2026-11-21T12:00:00Z', '2026-11-22T12:00:00Z']) {
        vi.useFakeTimers({ now: new Date(day) });
        species.push((await service.getPawOfTheDay()).species);
      }
      expect(species[0]).not.toBe(species[1]);
      expect(species[2]).toBe(species[0]);
    });
  });
});
