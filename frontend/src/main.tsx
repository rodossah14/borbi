import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Application } from './App';
import './styles/globals.css';

const elementRacine = document.getElementById('racine');
if (!elementRacine) {
  throw new Error('Élément #racine introuvable dans index.html');
}

createRoot(elementRacine).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
