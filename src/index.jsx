import { createRoot } from 'react-dom/client';
import App from './app.jsx';

window.onload = () => {
    createRoot(document.getElementById('app')).render(<App />);
};
