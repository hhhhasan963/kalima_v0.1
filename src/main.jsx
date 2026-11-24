import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './auth.css';
import './editor.css';
import './design.css';
import './extras.css';
import { initNative } from './lib/native.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

initNative();
