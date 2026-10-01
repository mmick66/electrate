import { createRoot } from 'react-dom/client';
import App from './app.jsx';

// A module script runs after the document is parsed, so #app already exists.
createRoot(document.getElementById('app')).render(<App />);
