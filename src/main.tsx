import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { seedIfEmpty } from './lib/seed';
import { valuation } from './lib/services';

seedIfEmpty()
  .then(() => valuation.captureDailySnapshot())
  .catch(() => {})
  .finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
