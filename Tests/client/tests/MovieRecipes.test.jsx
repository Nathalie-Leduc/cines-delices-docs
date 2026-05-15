import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import MovieRecipes from "../pages/MovieRecipes/MovieRecipes.jsx";

vi.mock("../services/mediaService", () => ({
  getMovieBySlug: vi.fn(() => new Promise(() => {})),
}));

vi.mock("../services/recipesService", () => ({
  getRecipesCatalog: vi.fn(),
}));

describe("MovieRecipes", () => {
  it("affiche l'etat de chargement sans planter sur une page film", () => {
    render(
      <MemoryRouter initialEntries={["/films/le-parrain"]}>
        <Routes>
          <Route path="/films/:slug" element={<MovieRecipes />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getAllByText("Chargement du film...").length).toBeGreaterThan(0);
  });
});
