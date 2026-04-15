//Movie object outline
export type TMDBMovie = {
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
};

//Stores list of movie objects
export type TMDBResponse = {
  results: TMDBMovie[];
  message?: string;
};
