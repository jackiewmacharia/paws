import type { NumericRange } from '../../common/utils/range';
import type { CatSpotlight } from '../cats/cat.service';
import type { CatImage } from '../cats/cat.types';
import type { DogSpotlight } from '../dogs/dog.service';
import type { DogImage } from '../dogs/dog.types';

export type Species = 'cat' | 'dog';

export interface PetVitals {
  species: Species;
  /** A string for cats, a number for dogs — passed through from each upstream API. */
  id: string | number;
  name: string;
  temperament?: string;
  origin?: string;
  lifeSpanYears?: NumericRange;
  weightKg?: NumericRange;
}

export interface RandomDuo {
  cat: CatImage;
  dog: DogImage;
  fetchedAt: string;
}

export interface BreedComparison {
  cat: PetVitals;
  dog: PetVitals;
  longerLivedSpecies?: Species | 'tie';
  heavierSpecies?: Species | 'tie';
  sharedTemperamentTraits: string[];
}

/** `winner` is omitted when either breed has no data for the category. */
export interface ShowdownRound {
  category: string;
  catValue?: number;
  dogValue?: number;
  winner?: Species | 'tie';
}

export interface ShowdownResult {
  cat: PetVitals & { image?: CatImage };
  dog: PetVitals & { image?: DogImage };
  rounds: ShowdownRound[];
  overallWinner: Species | 'tie';
  summary: string;
}

export interface SpeciesStats {
  breedCount: number;
  averageLifeSpanYears: number;
  longestLivedBreed?: { name: string; averageLifeSpanYears: number };
  mostCommonTemperamentTrait?: { trait: string; breedCount: number };
}

export interface PetStats {
  cats: SpeciesStats;
  dogs: SpeciesStats;
  generatedAt: string;
}

/** Alternates between a cat and a dog spotlight, deterministically by date. */
export type PetOfTheDay =
  | { species: 'cat'; spotlight: CatSpotlight }
  | { species: 'dog'; spotlight: DogSpotlight };
