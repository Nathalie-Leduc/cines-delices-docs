import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';

// ─────────────────────────────────────────────────────────────
// Mocks DOM/navigateur manquants dans jsdom
// ─────────────────────────────────────────────────────────────

// Mock window.scrollTo — non implémenté par jsdom
window.scrollTo = () => {};

// Mock tarteaucitron — bibliothèque de cookies chargée via <script> en prod.
// Sans ce mock, CookieConsent tente un fetch réseau vers /tarteaucitron/tarteaucitron.js
// qui échoue avec ECONNREFUSED dans l'environnement jsdom du CI.
window.tarteaucitron = {
  init: () => {},
  userInterface: {
    closePanel: () => {},
  },
  services: {},
  job: [],
};

// ─────────────────────────────────────────────────────────────
// 🎬 Mock global de fetch
// ─────────────────────────────────────────────────────────────
// Analogie : on installe un répondeur automatique sur le standard
// du restaurant. Pendant les tests, aucun appel ne part vers une vraie
// API (qui n'existe pas en CI → ECONNREFUSED). Le répondeur dit poliment
// "ok, voici une réponse vide" et le test peut continuer.
//
// Pourquoi mocker fetch en plus de mediaService ?
// Parce qu'AuthProvider (et probablement d'autres composants) appelle
// directement fetch via api.js — pas via mediaService. Donc le mock
// ciblé sur mediaService laisse passer ces appels-là.
//
// Si un test a besoin d'une réponse SPÉCIFIQUE, il peut surcharger
// localement avec vi.stubGlobal('fetch', ...) dans son `it`.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => 
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      headers: new Headers(),
    })
  ));
});

// Nettoyage entre chaque test pour éviter les fuites de mocks
// (un mock posé par un test ne doit pas polluer le suivant)
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

