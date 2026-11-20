import { Router } from 'express';
import { OPENAPI_DOCUMENT } from './openapi';

const SWAGGER_UI_VERSION = '5.17.14';

/**
 * Serves the API schema two ways:
 *  - `GET /openapi.json` — the OpenAPI document.
 *  - `GET /docs` — an interactive Swagger UI page that loads that document.
 *
 * Both are static: nothing from the request (Host header, protocol) is
 * echoed back, so they behave the same behind a TLS-terminating proxy.
 */
export function createDocsRouter(): Router {
  const router = Router();

  router.get('/openapi.json', (_req, res) => {
    res.json(OPENAPI_DOCUMENT);
  });

  router.get('/docs', (_req, res) => {
    res.type('html').send(DOCS_PAGE);
  });

  return router;
}

const DOCS_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>paws-api — Docs</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui.css" />
    <style>
      body { margin: 0; background: #fafafa; }
      .topbar { display: none !important; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: './openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout',
      });
    </script>
  </body>
</html>`;
