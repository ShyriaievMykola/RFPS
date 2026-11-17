import { setupWorker } from 'msw/browser';
import { initDb } from './db';
import { adminHandlers } from './handlers/admin';
import { authHandlers } from './handlers/auth';
import { energyHandlers } from './handlers/energy';

/**
 * Запускає мок-сервер: Service Worker перехоплює запити до /api/* і відповідає
 * з обробників нижче. Для застосунку це виглядає як звичайний HTTP-бекенд.
 */
export async function startMockServer(): Promise<void> {
  await initDb();
  const worker = setupWorker(...authHandlers, ...energyHandlers, ...adminHandlers);
  await worker.start({
    onUnhandledFrame: 'bypass',
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
}
