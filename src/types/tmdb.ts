//Movie object outline
export type TMDBMovie = {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
};

//Stores list of movie objects
export type TMDBResponse = {
  results: TMDBMovie[];
};

//need to add genre, languages and creator
export type TMDBMovieDetailed = {
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
  revenue: number;
  runtime: number;
  budget: number;
};

export type TMDBTVSearchResult = {
  id: number;
  title: string;
  poster_path: string | null;
  first_air_date: string;
  overview: string;
  genre_ids: number[];
};

/** Row from TMDb `/search/tv` JSON (series title is `name` in the API). */
export type TMDBTVSearchApiRow = Omit<TMDBTVSearchResult, 'title'> & { name: string };

export type TMDBTVSearchResponse = {
  results: TMDBTVSearchApiRow[];
};

/** Row from TMDb `GET /tv/{series_id}` (detail). */
export type TMDBTVDetailsApi = {
  title: string;
  id: number;
  overview: string;
  created_by?: Array<{ name: string }>;
  genres?: Array<{ id: number; name: string }>;
  poster_path: string | null;
  first_air_date: string;
  number_of_episodes?: number;
  number_of_seasons?: number;
};
