export interface CatWeight {
  imperial: string;
  metric: string;
}

/** Shape returned by `GET /breeds`, `GET /breeds/search` and `GET /breeds/{id}` on TheCatAPI. */
export interface CatBreed {
  id: string;
  name: string;
  temperament?: string;
  origin?: string;
  description?: string;
  life_span?: string;
  weight?: CatWeight;
  wikipedia_url?: string;
  reference_image_id?: string;
  adaptability?: number;
  affection_level?: number;
  child_friendly?: number;
  dog_friendly?: number;
  energy_level?: number;
  grooming?: number;
  health_issues?: number;
  intelligence?: number;
  shedding_level?: number;
  social_needs?: number;
  stranger_friendly?: number;
  hairless?: number;
  hypoallergenic?: number;
  rare?: number;
}

/** Shape returned by `GET /images/search` on TheCatAPI. */
export interface CatImage {
  id: string;
  url: string;
  width: number;
  height: number;
  breeds?: CatBreed[];
}
