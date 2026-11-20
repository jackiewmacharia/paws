import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PawsApiClient, PawsApiError } from '../client/paws-api-client.js';
import { registerResources } from '../resources.js';
import { registerCatTools } from './cat-tools.js';
import { registerDogTools } from './dog-tools.js';
import { registerPawsTools } from './paws-tools.js';

/** Every tool, the client method it must call, and the arguments it must pass. */
const WIRING: [tool: string, args: Record<string, string>, method: keyof PawsApiClient, expected: unknown[]][] = [
  ['list_cat_breeds', { q: 'beng' }, 'listCatBreeds', ['beng']],
  ['get_cat_breed', { id: 'beng' }, 'getCatBreed', ['beng']],
  ['get_cat_spotlight', { id: 'beng' }, 'getCatSpotlight', ['beng']],
  ['get_random_cat_image', { breedId: 'beng' }, 'getRandomCatImage', ['beng']],
  ['get_cat_of_the_day', {}, 'getCatOfTheDay', []],
  ['list_dog_breeds', { q: 'pug' }, 'listDogBreeds', ['pug']],
  ['get_dog_breed', { id: '1' }, 'getDogBreed', ['1']],
  ['get_dog_spotlight', { id: '1' }, 'getDogSpotlight', ['1']],
  ['get_random_dog_image', { breedId: '1' }, 'getRandomDogImage', ['1']],
  ['get_dog_of_the_day', {}, 'getDogOfTheDay', []],
  ['get_random_paw_duo', {}, 'getRandomDuo', []],
  ['compare_paw_breeds', { catBreedId: 'beng', dogBreedId: '1' }, 'compareBreeds', ['beng', '1']],
  ['get_paw_showdown', {}, 'getShowdown', []],
  ['get_paw_stats', {}, 'getStats', []],
  ['get_paw_of_the_day', {}, 'getPawOfTheDay', []],
];

describe('MCP tools', () => {
  let client: Client;
  let pawsApi: jest.Mocked<PawsApiClient>;

  beforeEach(async () => {
    const methods = Object.getOwnPropertyNames(PawsApiClient.prototype).filter((name) => name !== 'constructor');
    pawsApi = Object.fromEntries(
      methods.map((name) => [name, jest.fn().mockResolvedValue({ from: name })]),
    ) as unknown as jest.Mocked<PawsApiClient>;

    const server = new McpServer({ name: 'paws-mcp', version: 'test' });
    registerCatTools(server, pawsApi);
    registerDogTools(server, pawsApi);
    registerPawsTools(server, pawsApi);
    registerResources(server, pawsApi);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: 'test' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterEach(async () => {
    await client.close();
  });

  it('registers exactly the expected tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(WIRING.map(([tool]) => tool).sort());
  });

  it.each(WIRING)('%s calls only the matching client method', async (tool, args, method, expected) => {
    const result = await client.callTool({ name: tool, arguments: args });

    expect(pawsApi[method]).toHaveBeenCalledWith(...expected);
    const otherCalls = Object.entries(pawsApi).filter(([name, fn]) => name !== method && fn.mock.calls.length > 0);
    expect(otherCalls).toEqual([]);
    expect(result.isError).toBeFalsy();
    expect(JSON.parse((result.content as { text: string }[])[0].text)).toEqual({ from: method });
  });

  it('passes omitted optional arguments through as undefined', async () => {
    await client.callTool({ name: 'list_cat_breeds', arguments: {} });
    expect(pawsApi.listCatBreeds).toHaveBeenCalledWith(undefined);
  });

  it('rejects blank ids before reaching the client', async () => {
    const result = await client.callTool({ name: 'get_dog_breed', arguments: { id: '   ' } });
    expect(result.isError).toBe(true);
    expect(pawsApi.getDogBreed).not.toHaveBeenCalled();
  });

  it('turns a paws-api error into an isError result that includes the status', async () => {
    pawsApi.getCatBreed.mockRejectedValue(new PawsApiError(404, "Cat breed 'nope' was not found"));
    const result = await client.callTool({ name: 'get_cat_breed', arguments: { id: 'nope' } });

    expect(result.isError).toBe(true);
    expect((result.content as { text: string }[])[0].text).toBe(
      "paws-api error (404): Cat breed 'nope' was not found",
    );
  });

  it('serves the OpenAPI schema as a JSON resource', async () => {
    pawsApi.getOpenApiSchema.mockResolvedValue({ openapi: '3.0.3' });
    const { contents } = await client.readResource({ uri: 'paws-api://openapi.json' });

    expect(contents[0]).toMatchObject({ mimeType: 'application/json' });
    expect(JSON.parse((contents[0] as { text: string }).text)).toEqual({ openapi: '3.0.3' });
  });
});
