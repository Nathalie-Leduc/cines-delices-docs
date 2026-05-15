import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MediaCatalog from "../pages/MediaCatalog/MediaCatalog.jsx";

vi.mock("../hooks/useHeroReveal", () => ({
  default: () => true,
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

function mapMovieToCard(movie) {
  return {
    id: movie?.id,
    slug: movie?.slug,
    to: movie?.slug ? `/films/${movie.slug}` : undefined,
    title: movie?.title || "Film sans titre",
    poster: movie?.poster || "/img/parrain-poster.webp",
    fallbackPoster: "/img/parrain-poster.webp",
    genre: movie?.genre || "Genre non renseigné",
    creator: movie?.creator || "Réalisateur non renseigné",
  };
}

function renderCatalog(getCatalog) {
  return render(
    <MemoryRouter>
      <MediaCatalog
        title="Films"
        heroImage="/img/fond-cinema-contact.webp"
        heroAlt="Catalogue des films"
        heroSubtitle="Sous-titre test"
        searchPlaceholder="Rechercher un film"
        singularLabel="film"
        pluralLabel="films"
        badgeLabel="Film"
        badgeVariant="film"
        creatorFallback="Réalisateur non renseigné"
        loadingMessage="Chargement des films..."
        updatingMessage="Mise à jour des films..."
        errorMessage="Impossible de charger les films."
        emptyMessage="Aucun film disponible."
        suggestionMetaFallback="Film"
        getCatalog={getCatalog}
        mapItemToCard={mapMovieToCard}
      />
    </MemoryRouter>,
  );
}

describe("MediaCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = createMatchMedia(false);
  });

  it("filtre dynamiquement les cartes de films sans suggestions", async () => {
    const getCatalogMock = vi
      .fn()
      .mockResolvedValueOnce({
        items: [
          {
            id: 1,
            slug: "parrain",
            title: "Le Parrain",
            poster: "/img/parrain-poster.webp",
            genre: "Crime",
            creator: "Francis Ford Coppola",
          },
        ],
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
        items: [
          {
            id: 2,
            slug: "rocky",
            title: "Rocky",
            poster: "/img/parrain-poster.webp",
            genre: "Sport",
            creator: "John G. Avildsen",
          },
        ],
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

    await screen.findByText("Le Parrain");
    await screen.findByText("Rocky");

    expect(getCatalogMock).toHaveBeenCalledTimes(2);
    expect(getCatalogMock).toHaveBeenNthCalledWith(1, { page: 1, limit: 50 });
    expect(getCatalogMock).toHaveBeenNthCalledWith(2, { page: 2, limit: 50 });

    fireEvent.change(screen.getByRole("searchbox", { name: "Rechercher un film" }), {
      target: { value: "rocky" },
    });

    await waitFor(() => {
      expect(screen.getByText('1 film trouvé pour "rocky".')).toBeInTheDocument();
    });

    expect(screen.getByText("Rocky")).toBeInTheDocument();
    expect(screen.queryByText("Le Parrain")).not.toBeInTheDocument();
    expect(getCatalogMock).toHaveBeenCalledTimes(2);
  });
});
