import { createRoot } from 'react-dom/client';
import App from './app.js';

window.onload = () => {
    createRoot(document.getElementById('app')).render(<App />);
};
