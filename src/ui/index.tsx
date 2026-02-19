import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('ui-overlay');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error('UI Overlay container not found');
}
