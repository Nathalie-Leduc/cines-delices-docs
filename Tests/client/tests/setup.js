import '@testing-library/jest-dom';

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

