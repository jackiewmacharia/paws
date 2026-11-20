/** A relative `servers` URL makes "Try it out" target whichever origin served the doc. */
export const OPENAPI_DOCUMENT = {
  servers: [{ url: '/' }],
  openapi: '3.0.3',
  info: {
    title: 'paws-api',
    version: '1.0.0',
    description:
      'Aggregates TheCatAPI and TheDogAPI into per-species endpoints, plus fun cross-species aggregates (comparisons, showdowns, stats). ' +
      'Any endpoint that calls an upstream API can also return 502 (upstream error or unreachable) or 504 (upstream timeout), using the Error schema.',
  },
  tags: [
    { name: 'health', description: 'Service health' },
    { name: 'cats', description: 'TheCatAPI, proxied and normalized' },
    { name: 'dogs', description: 'TheDogAPI, proxied and normalized' },
    { name: 'pets', description: 'Fun aggregates across both species' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['health'],
        summary: 'Liveness check',
        responses: { '200': ref('HealthResponse') },
      },
    },
    '/cats/breeds': {
      get: {
        tags: ['cats'],
        summary: 'List cat breeds, or search by name',
        parameters: [
          queryParam('q', 'Case-insensitive breed name search', false),
        ],
        responses: { '200': arrayRef('CatBreed') },
      },
    },
    '/cats/breeds/{id}': {
      get: {
        tags: ['cats'],
        summary: 'Get a single cat breed',
        parameters: [pathParam('id')],
        responses: { '200': ref('CatBreed'), '404': ref('Error') },
      },
    },
    '/cats/breeds/{id}/spotlight': {
      get: {
        tags: ['cats'],
        summary: 'A breed, a photo, and a fun fact bundled together',
        parameters: [pathParam('id')],
        responses: { '200': ref('CatSpotlight'), '404': ref('Error') },
      },
    },
    '/cats/random': {
      get: {
        tags: ['cats'],
        summary: 'A random cat image, optionally restricted to one breed',
        parameters: [queryParam('breedId', 'Restrict to this breed id', false)],
        responses: { '200': ref('CatImage'), '404': ref('Error') },
      },
    },
    '/cats/of-the-day': {
      get: {
        tags: ['cats'],
        summary: 'Same featured cat breed all day (changes at UTC midnight)',
        responses: { '200': ref('CatSpotlight') },
      },
    },
    '/dogs/breeds': {
      get: {
        tags: ['dogs'],
        summary: 'List dog breeds, or search by name',
        parameters: [
          queryParam('q', 'Case-insensitive breed name search', false),
        ],
        responses: { '200': arrayRef('DogBreed') },
      },
    },
    '/dogs/breeds/{id}': {
      get: {
        tags: ['dogs'],
        summary: 'Get a single dog breed',
        parameters: [pathParam('id')],
        responses: { '200': ref('DogBreed'), '404': ref('Error') },
      },
    },
    '/dogs/breeds/{id}/spotlight': {
      get: {
        tags: ['dogs'],
        summary: 'A breed, a photo, and a fun fact bundled together',
        parameters: [pathParam('id')],
        responses: { '200': ref('DogSpotlight'), '404': ref('Error') },
      },
    },
    '/dogs/random': {
      get: {
        tags: ['dogs'],
        summary: 'A random dog image, optionally restricted to one breed',
        parameters: [queryParam('breedId', 'Restrict to this breed id', false)],
        responses: { '200': ref('DogImage'), '404': ref('Error') },
      },
    },
    '/dogs/of-the-day': {
      get: {
        tags: ['dogs'],
        summary: 'Same featured dog breed all day (changes at UTC midnight)',
        responses: { '200': ref('DogSpotlight') },
      },
    },
    '/pets/random-duo': {
      get: {
        tags: ['pets'],
        summary: 'One random cat image and one random dog image, side by side',
        responses: { '200': ref('RandomDuo') },
      },
    },
    '/pets/compare': {
      get: {
        tags: ['pets'],
        summary: 'Compare a cat breed and a dog breed head-to-head',
        parameters: [
          queryParam('catBreedId', 'Cat breed id, e.g. "beng"', true),
          queryParam('dogBreedId', 'Dog breed id, e.g. "1"', true),
        ],
        responses: {
          '200': ref('BreedComparison'),
          '400': ref('Error'),
          '404': ref('Error'),
        },
      },
    },
    '/pets/showdown': {
      get: {
        tags: ['pets'],
        summary:
          'A random cat breed vs. a random dog breed, scored across 3 fun rounds',
        responses: { '200': ref('ShowdownResult') },
      },
    },
    '/pets/stats': {
      get: {
        tags: ['pets'],
        summary: 'Aggregate stats across every catalogued cat and dog breed',
        responses: { '200': ref('PetStats') },
      },
    },
    '/pets/of-the-day': {
      get: {
        tags: ['pets'],
        summary: 'Pet of the day — alternates species by date',
        responses: { '200': ref('PetOfTheDay') },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
          path: { type: 'string' },
          message: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
          },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok'] },
          uptime: { type: 'number' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      NumericRange: {
        type: 'object',
        properties: {
          min: { type: 'number' },
          max: { type: 'number' },
          avg: { type: 'number' },
        },
      },
      CatBreed: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          temperament: { type: 'string' },
          origin: { type: 'string' },
          description: { type: 'string' },
          life_span: { type: 'string' },
          weight: {
            type: 'object',
            properties: {
              imperial: { type: 'string' },
              metric: { type: 'string' },
            },
          },
          wikipedia_url: { type: 'string' },
          reference_image_id: { type: 'string' },
        },
      },
      CatImage: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          url: { type: 'string' },
          width: { type: 'integer' },
          height: { type: 'integer' },
          breeds: {
            type: 'array',
            items: { $ref: '#/components/schemas/CatBreed' },
          },
        },
      },
      CatSpotlight: {
        type: 'object',
        properties: {
          breed: { $ref: '#/components/schemas/CatBreed' },
          image: { $ref: '#/components/schemas/CatImage' },
          funFact: { type: 'string' },
        },
      },
      DogBreed: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          temperament: { type: 'string' },
          origin: { type: 'string' },
          description: { type: 'string' },
          life_span: { type: 'string' },
          bred_for: { type: 'string', nullable: true },
          breed_group: { type: 'string', nullable: true },
          weight: {
            type: 'object',
            properties: {
              imperial: { type: 'string' },
              metric: { type: 'string' },
            },
          },
          height: {
            type: 'object',
            properties: {
              imperial: { type: 'string' },
              metric: { type: 'string' },
            },
          },
          wikipedia_url: { type: 'string' },
          reference_image_id: { type: 'string' },
        },
      },
      DogImage: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          url: { type: 'string' },
          width: { type: 'integer' },
          height: { type: 'integer' },
          breeds: {
            type: 'array',
            items: { $ref: '#/components/schemas/DogBreed' },
          },
        },
      },
      DogSpotlight: {
        type: 'object',
        properties: {
          breed: { $ref: '#/components/schemas/DogBreed' },
          image: { $ref: '#/components/schemas/DogImage' },
          funFact: { type: 'string' },
        },
      },
      RandomDuo: {
        type: 'object',
        properties: {
          cat: { $ref: '#/components/schemas/CatImage' },
          dog: { $ref: '#/components/schemas/DogImage' },
          fetchedAt: { type: 'string', format: 'date-time' },
        },
      },
      PetVitals: {
        type: 'object',
        properties: {
          species: { type: 'string', enum: ['cat', 'dog'] },
          id: {
            oneOf: [{ type: 'string' }, { type: 'integer' }],
            description: 'A string for cats, an integer for dogs.',
          },
          name: { type: 'string' },
          temperament: { type: 'string' },
          origin: { type: 'string' },
          lifeSpanYears: { $ref: '#/components/schemas/NumericRange' },
          weightKg: { $ref: '#/components/schemas/NumericRange' },
        },
      },
      BreedComparison: {
        type: 'object',
        properties: {
          cat: { $ref: '#/components/schemas/PetVitals' },
          dog: { $ref: '#/components/schemas/PetVitals' },
          longerLivedSpecies: { type: 'string', enum: ['cat', 'dog', 'tie'] },
          heavierSpecies: { type: 'string', enum: ['cat', 'dog', 'tie'] },
          sharedTemperamentTraits: { type: 'array', items: { type: 'string' } },
        },
      },
      ShowdownRound: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          catValue: { type: 'number' },
          dogValue: { type: 'number' },
          winner: {
            type: 'string',
            enum: ['cat', 'dog', 'tie'],
            description: 'Omitted when either breed has no data for this category.',
          },
        },
      },
      ShowdownResult: {
        type: 'object',
        properties: {
          cat: {
            allOf: [
              { $ref: '#/components/schemas/PetVitals' },
              {
                type: 'object',
                properties: { image: { $ref: '#/components/schemas/CatImage' } },
                description: '`image` is omitted if the photo lookup fails.',
              },
            ],
          },
          dog: {
            allOf: [
              { $ref: '#/components/schemas/PetVitals' },
              {
                type: 'object',
                properties: { image: { $ref: '#/components/schemas/DogImage' } },
                description: '`image` is omitted if the photo lookup fails.',
              },
            ],
          },
          rounds: {
            type: 'array',
            items: { $ref: '#/components/schemas/ShowdownRound' },
          },
          overallWinner: { type: 'string', enum: ['cat', 'dog', 'tie'] },
          summary: { type: 'string' },
        },
      },
      SpeciesStats: {
        type: 'object',
        properties: {
          breedCount: { type: 'integer' },
          averageLifeSpanYears: { type: 'number' },
          longestLivedBreed: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              averageLifeSpanYears: { type: 'number' },
            },
          },
          mostCommonTemperamentTrait: {
            type: 'object',
            properties: {
              trait: { type: 'string' },
              breedCount: { type: 'integer' },
            },
          },
        },
      },
      PetStats: {
        type: 'object',
        properties: {
          cats: { $ref: '#/components/schemas/SpeciesStats' },
          dogs: { $ref: '#/components/schemas/SpeciesStats' },
          generatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PetOfTheDay: {
        type: 'object',
        properties: {
          species: { type: 'string', enum: ['cat', 'dog'] },
          spotlight: {
            oneOf: [
              { $ref: '#/components/schemas/CatSpotlight' },
              { $ref: '#/components/schemas/DogSpotlight' },
            ],
          },
        },
      },
    },
  },
} as const;

function ref(schema: string) {
  return {
    description: schema,
    content: {
      'application/json': {
        schema: { $ref: `#/components/schemas/${schema}` },
      },
    },
  };
}

function arrayRef(schema: string) {
  return {
    description: `${schema}[]`,
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: { $ref: `#/components/schemas/${schema}` },
        },
      },
    },
  };
}

function pathParam(name: string) {
  return { name, in: 'path', required: true, schema: { type: 'string' } };
}

function queryParam(name: string, description: string, required: boolean) {
  return {
    name,
    in: 'query',
    required,
    description,
    schema: { type: 'string' },
  };
}
