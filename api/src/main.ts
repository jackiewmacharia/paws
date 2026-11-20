import { createApp } from './app';
import { loadConfig } from './config/env';

function bootstrap() {
  const config = loadConfig();
  createApp(config).listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`paws-api listening on http://localhost:${config.port}`);
  });
}
bootstrap();
