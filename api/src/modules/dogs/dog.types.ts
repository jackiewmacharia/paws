export interface DogMeasurement {
  imperial: string;
  metric: string;
}

/** Shape returned by `GET /breeds`, `GET /breeds/search` and `GET /breeds/{id}` on TheDogAPI. */
export interface DogBreed {
  /** Numeric, unlike TheCatAPI's string ids (e.g. `1`, not `"abys"`). */
  id: number;
  name: string;
  temperament?: string;
  origin?: string;
  description?: string;
  life_span?: string;
  bred_for?: string | null;
  breed_group?: string | null;
  weight?: DogMeasurement;
  height?: DogMeasurement;
  wikipedia_url?: string;
  reference_image_id?: string;
}

/** Shape returned by `GET /images/search` on TheDogAPI. */
export interface DogImage {
  id: string;
  url: string;
  width: number;
  height: number;
  breeds?: DogBreed[];
}
