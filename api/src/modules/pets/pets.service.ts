import { bestEffort } from '../../common/errors/http-error';
import { average, parseRange } from '../../common/utils/range';
import { dailyIndex, randomPick } from '../../common/utils/daily-pick';
import { parseTraits } from '../../common/utils/temperament';
import type { CatService } from '../cats/cat.service';
import type { CatBreed } from '../cats/cat.types';
import type { DogService } from '../dogs/dog.service';
import type { DogBreed } from '../dogs/dog.types';
import type {
  BreedComparison,
  PetOfTheDay,
  PetStats,
  PetVitals,
  RandomDuo,
  ShowdownResult,
  ShowdownRound,
  Species,
  SpeciesStats,
} from './pets.types';

/**
 * Orchestrates CatService + DogService into cross-species, "fun aggregate"
 * endpoints. Holds no data-access logic of its own — it's a pure
 * composition layer on top of the two per-species services.
 */
export class PetsService {
  constructor(
    private readonly catService: CatService,
    private readonly dogService: DogService,
  ) {}

  async getRandomDuo(): Promise<RandomDuo> {
    const [cat, dog] = await Promise.all([
      this.catService.getRandomImage(),
      this.dogService.getRandomImage(),
    ]);
    return { cat, dog, fetchedAt: new Date().toISOString() };
  }

  async compareBreeds(
    catBreedId: string,
    dogBreedId: string,
  ): Promise<BreedComparison> {
    const [catBreed, dogBreed] = await Promise.all([
      this.catService.getBreed(catBreedId),
      this.dogService.getBreed(dogBreedId),
    ]);

    const cat = toVitals('cat', catBreed);
    const dog = toVitals('dog', dogBreed);

    return {
      cat,
      dog,
      longerLivedSpecies: pickBySpecies(
        cat.lifeSpanYears?.avg,
        dog.lifeSpanYears?.avg,
      ),
      heavierSpecies: pickBySpecies(cat.weightKg?.avg, dog.weightKg?.avg),
      sharedTemperamentTraits: sharedTraits(
        catBreed.temperament,
        dogBreed.temperament,
      ),
    };
  }

  /** A lighthearted, three-round stat battle between a random cat breed and a random dog breed. */
  async getShowdown(): Promise<ShowdownResult> {
    const [catBreeds, dogBreeds] = await Promise.all([
      this.catService.getBreeds(),
      this.dogService.getBreeds(),
    ]);
    const catBreed = randomPick(catBreeds);
    const dogBreed = randomPick(dogBreeds);

    const [catImage, dogImage] = await Promise.all([
      bestEffort(this.catService.getRandomImage(catBreed.id), `cat image for '${catBreed.id}'`),
      bestEffort(this.dogService.getRandomImage(String(dogBreed.id)), `dog image for '${dogBreed.id}'`),
    ]);

    const cat = toVitals('cat', catBreed);
    const dog = toVitals('dog', dogBreed);

    // A breed missing a stat doesn't lose that round — the round just has no winner.
    const rounds: ShowdownRound[] = [
      round('Longevity', cat.lifeSpanYears?.avg, dog.lifeSpanYears?.avg),
      round('Heft', cat.weightKg?.avg, dog.weightKg?.avg),
      round(
        'Temperament variety',
        countTraits(catBreed.temperament),
        countTraits(dogBreed.temperament),
      ),
    ];

    const catPoints = rounds.filter((r) => r.winner === 'cat').length;
    const dogPoints = rounds.filter((r) => r.winner === 'dog').length;
    const overallWinner: Species | 'tie' =
      catPoints === dogPoints ? 'tie' : catPoints > dogPoints ? 'cat' : 'dog';

    return {
      cat: { ...cat, image: catImage },
      dog: { ...dog, image: dogImage },
      rounds,
      overallWinner,
      summary: buildShowdownSummary(cat.name, dog.name, overallWinner, rounds),
    };
  }

  /** Alternates species by date so the whole app doesn't always favor one. */
  async getPetOfTheDay(): Promise<PetOfTheDay> {
    const species: Species = dailyIndex(2) === 0 ? 'cat' : 'dog';
    if (species === 'cat') {
      return { species, spotlight: await this.catService.getCatOfTheDay() };
    }
    return { species, spotlight: await this.dogService.getDogOfTheDay() };
  }

  async getStats(): Promise<PetStats> {
    const [catBreeds, dogBreeds] = await Promise.all([
      this.catService.getBreeds(),
      this.dogService.getBreeds(),
    ]);

    return {
      cats: summarize(catBreeds),
      dogs: summarize(dogBreeds),
      generatedAt: new Date().toISOString(),
    };
  }
}

function toVitals(species: Species, breed: CatBreed | DogBreed): PetVitals {
  return {
    species,
    id: breed.id,
    name: breed.name,
    temperament: breed.temperament,
    origin: breed.origin,
    lifeSpanYears: parseRange(breed.life_span),
    weightKg: parseRange(breed.weight?.metric),
  };
}

function pickBySpecies(
  catValue: number | undefined,
  dogValue: number | undefined,
): Species | 'tie' | undefined {
  if (catValue === undefined || dogValue === undefined) return undefined;
  if (catValue === dogValue) return 'tie';
  return catValue > dogValue ? 'cat' : 'dog';
}

function sharedTraits(
  catTemperament: string | undefined,
  dogTemperament: string | undefined,
): string[] {
  const catTraits = new Set(
    parseTraits(catTemperament).map((trait) => trait.toLowerCase()),
  );
  const dogTraits = new Set(
    parseTraits(dogTemperament).map((trait) => trait.toLowerCase()),
  );
  return [...catTraits].filter((trait) => dogTraits.has(trait));
}

function countTraits(temperament: string | undefined): number {
  return parseTraits(temperament).length;
}

function round(
  category: string,
  catValue: number | undefined,
  dogValue: number | undefined,
): ShowdownRound {
  return { category, catValue, dogValue, winner: pickBySpecies(catValue, dogValue) };
}

function buildShowdownSummary(
  catName: string,
  dogName: string,
  winner: Species | 'tie',
  rounds: ShowdownRound[],
): string {
  const wonCategories = rounds
    .filter((r) => r.winner === winner)
    .map((r) => r.category.toLowerCase());
  if (winner === 'tie') {
    return `${catName} and ${dogName} tied — an even match across ${rounds.length} rounds.`;
  }
  const name = winner === 'cat' ? catName : dogName;
  return `${name} takes the showdown, winning on ${wonCategories.join(' and ')}.`;
}

function summarize(breeds: (CatBreed | DogBreed)[]): SpeciesStats {
  const lifeSpans = breeds
    .map((breed) => ({ name: breed.name, range: parseRange(breed.life_span) }))
    .filter(
      (
        entry,
      ): entry is {
        name: string;
        range: NonNullable<ReturnType<typeof parseRange>>;
      } => entry.range !== undefined,
    );

  const longestLived = lifeSpans.reduce<
    { name: string; averageLifeSpanYears: number } | undefined
  >(
    (best, entry) =>
      !best || entry.range.avg > best.averageLifeSpanYears
        ? { name: entry.name, averageLifeSpanYears: entry.range.avg }
        : best,
    undefined,
  );

  const traitCounts = new Map<string, number>();
  for (const breed of breeds) {
    const traits = new Set(
      parseTraits(breed.temperament).map((trait) => trait.toLowerCase()),
    );
    for (const trait of traits) {
      traitCounts.set(trait, (traitCounts.get(trait) ?? 0) + 1);
    }
  }
  let mostCommonTemperamentTrait: SpeciesStats['mostCommonTemperamentTrait'];
  for (const [trait, breedCount] of traitCounts) {
    if (
      !mostCommonTemperamentTrait ||
      breedCount > mostCommonTemperamentTrait.breedCount
    ) {
      mostCommonTemperamentTrait = { trait, breedCount };
    }
  }

  return {
    breedCount: breeds.length,
    averageLifeSpanYears: average(lifeSpans.map((entry) => entry.range.avg)),
    longestLivedBreed: longestLived,
    mostCommonTemperamentTrait,
  };
}
