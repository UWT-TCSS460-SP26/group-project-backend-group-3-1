import { Request, Response } from 'express';
import { TMDBResponse } from '../types/tmdb';

const BASE_URL = 'https://api.themoviedb.org/3';

export const searchMovies = async (req: Request, res: Response) => {
  const { title } = req.query;
  const token = process.env.TMDB_BEARER_TOKEN;

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
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      releaseDate: movie.release_date,
      description: movie.overview,
    }));

    if (movies.length === 0) {
      return res.json({ message: `No movies found with title: ${title}` });
    }

    res.json(movies);
  } catch (_error) {
    res.status(502).json({ error: 'Failed to reach TMDB service' });
  }
};

export const getMovieDetails = (req: Request, res: Response) => {};

export const getPopularMovies = (req: Request, res: Response) => {};
