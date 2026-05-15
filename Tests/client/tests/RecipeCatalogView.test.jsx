import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RecipeCatalogView from "../components/RecipeCatalogView/RecipeCatalogView.jsx";

const getRecipeCategoriesMock = vi.fn();

vi.mock("../hooks/useHeroReveal", () => ({
  default: () => true,
}));

vi.mock("../services/recipesService", () => ({
  getRecipeCategories: () => getRecipeCategoriesMock(),
}));

function createMatchMedia(matches = false) {
  return vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function buildRecipePayload() {
  return [
    {
      id: 1,
      slug: "cheesecake-friends",
      titre: "Cheesecake de Friends",
      tempsPreparation: 20,
      tempsCuisson: 40,
      imageURL: "/img/hero-home.webp",
      category: { nom: "Dessert" },
      media: {
        titre: "Friends",
        type: "SERIES",
        posterUrl: "/img/stranger-thing-poster.webp",
      },
    },
    {
      id: 2,
      slug: "bieraubeurre-poudlard",
      titre: "Bieraubeurre de Poudlard",
      tempsPreparation: 10,
      tempsCuisson: 5,
      imageURL: "/img/hero-home.webp",
      category: { nom: "Boisson" },
      media: {
        titre: "Harry Potter",
        type: "MOVIE",
        posterUrl: "/img/parrain-poster.webp",
      },
    },
  ];
}

function renderCatalog(getCatalog) {
  return render(
    <MemoryRouter>
      <RecipeCatalogView
        heroImage="/img/hero-home.webp"
        heroAlt="Catalogue test"
        heroTitle="Catalogue test"
        heroSubtitle="Sous-titre test"
        catalogTitle="Catalogue des recettes"
        getCatalog={getCatalog}
      />
    </MemoryRouter>,
  );
}

describe("RecipeCatalogView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = createMatchMedia(false);
    getRecipeCategoriesMock.mockResolvedValue([
      { id: 1, nom: "Dessert" },
      { id: 2, nom: "Boisson" },
    ]);
  });

  it("filtre dynamiquement les cartes déjà chargées sans suggestions", async () => {
    const [firstRecipe, secondRecipe] = buildRecipePayload();
    const getCatalogMock = vi
      .fn()
      .mockResolvedValueOnce({
        recipes: [firstRecipe],
        pagination: {
          page: 1,
          limit: 50,
          totalItems: 2,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      })
      .mockResolvedValueOnce({
        recipes: [secondRecipe],
        pagination: {
          page: 2,
          limit: 50,
          totalItems: 2,
          totalPages: 2,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      });

    renderCatalog(getCatalogMock);

    await screen.findByText("Cheesecake de Friends");
    await screen.findByText("Bieraubeurre de Poudlard");

    expect(getCatalogMock).toHaveBeenCalledTimes(2);
    expect(getCatalogMock).toHaveBeenNthCalledWith(1, { page: 1, limit: 50 });
    expect(getCatalogMock).toHaveBeenNthCalledWith(2, { page: 2, limit: 50 });

    fireEvent.change(screen.getByRole("searchbox", { name: "Rechercher dans le catalogue" }), {
      target: { value: "friends" },
    });

    await waitFor(() => {
      expect(screen.getByText('1 recette trouvée pour "friends".')).toBeInTheDocument();
    });

    expect(screen.getByText("Cheesecake de Friends")).toBeInTheDocument();
    expect(screen.queryByText("Bieraubeurre de Poudlard")).not.toBeInTheDocument();
    expect(getCatalogMock).toHaveBeenCalledTimes(2);
  });
});
