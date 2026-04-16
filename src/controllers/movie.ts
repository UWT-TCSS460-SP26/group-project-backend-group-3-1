import { Request, Response } from 'express';
import { TMDBResponse, TMDBMovieDetailed } from '../types/tmdb';

const BASE_URL = 'https://api.themoviedb.org/3';
const token = process.env.TMDB_BEARER_TOKEN;

export const searchMovies = async (req: Request, res: Response) => {
  const { title } = req.query;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await fetch(
      `${BASE_URL}/search/movie?query=${encodeURIComponent(String(title))}&language=en-US`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!result.ok) {
      res.status(result.status).json({ error: 'TMDB API error' });
      return;
    }

    const data = (await result.json()) as TMDBResponse;

    const movies = data.results.map((movie) => ({
      title: movie.title,
      poster: movie.poster_path,
      releaseDate: movie.release_date,
      description: movie.overview,
      id: movie.id,
    }));

    if (movies.length === 0) {
      return res.json({ message: `No movies found with title: ${title}` });
    }

    res.json(movies);
  } catch (_error) {
    res.status(502).json({ error: 'Failed to reach TMDB service' });
  }
};

export const getMovieDetails = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'ID required' });
  }

  try {
    const result = await fetch(
      `${BASE_URL}/movie/${encodeURIComponent(String(id))}?language=en-US`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!result.ok) {
      res
        .status(result.status)
        .json({ status: `${result.statusText} - ${result.status}`, error: 'TMDB API error' });
      return;
    }

    const data = (await result.json()) as TMDBMovieDetailed;

    const movie = {
      title: data.title,
      poster_path: data.poster_path,
      release_date: data.release_date,
      overview: data.overview,
      revenue: data.revenue,
      runtime: data.runtime,
      budget: data.budget,
    };

    res.json(movie);
  } catch (_error) {
    res.status(502).json({ error: 'Failed to reach TMDB service' });
  }
};

export const getPopularMovies = (req: Request, res: Response) => {};
