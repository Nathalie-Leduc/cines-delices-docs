import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CookieConsent from '../components/CookieConsent/CookieConsent.jsx';

describe('CookieConsent', () => {
  beforeEach(() => {
    window.tarteaucitron = {
      userInterface: {
        closePanel: vi.fn(),
      },
    };
  });

  afterEach(() => {
    delete window.tarteaucitron;
  });

  it('redirige le lien vers la politique des cookies via le routeur React', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <CookieConsent />
        <Routes>
          <Route path="/" element={<button id="tarteaucitronPrivacyUrl">Politique des cookies</button>} />
          <Route path="/politique-cookies" element={<h1>Page cookies</h1>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Politique des cookies' }));

    expect(screen.getByRole('heading', { name: 'Page cookies' })).toBeInTheDocument();
    expect(window.tarteaucitron.userInterface.closePanel).toHaveBeenCalledOnce();
  });
});
