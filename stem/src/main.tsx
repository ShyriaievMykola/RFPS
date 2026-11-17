import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { refreshSession } from '@/shared/api/client';
import '@/shared/i18n';
import { initSettings } from '@/shared/stores/settings';
import './index.css';

async function bootstrap(): Promise<void> {
  initSettings();

  // Справжнього бекенду в проєкті немає, тому мок-сервер працює і в production-збірці.
  // Щоб під'єднати реальний API, достатньо зібрати застосунок з VITE_USE_MOCKS=false.
  if (import.meta.env.VITE_USE_MOCKS !== 'false') {
    const { startMockServer } = await import('@/mocks/browser');
    await startMockServer();
  }

  const root = document.getElementById('root');
  if (!root) throw new Error('Не знайдено кореневий елемент #root');
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  // Пробуємо відновити сесію після перезавантаження; до відповіді показується індикатор.
  void refreshSession();
}

void bootstrap();
