import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { map, shareReplay, tap, retryWhen, delayWhen, catchError, timeout } from 'rxjs/operators';

export interface Anime {
  mal_id: number;
  title: string;
  title_english?: string;
  images: {
    webp?: {
      image_url: string;
      large_image_url?: string;
      small_image_url?: string;
    };
    jpg: {
      image_url: string;
      large_image_url?: string;
      small_image_url?: string;
    };
  };
  score?: number;
  scored_by?: number;
  synopsis?: string;
  type?: string;
  episodes?: number;
  status?: string;
  airing?: boolean;
  year?: number;
  season?: string;
  duration?: string;
  rating?: string;
  genres: Array<{ mal_id: number; name: string; type?: string }>;
  studios?: Array<{ mal_id: number; name: string }>;
  trailer?: {
    youtube_id?: string;
    url?: string;
    embed_url?: string;
  };
}

export interface JikanResponse<T> {
  data: T;
  pagination?: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page?: number;
    items?: {
      count: number;
      total: number;
      per_page: number;
    };
  };
}

export interface CharacterInfo {
  character: {
    mal_id: number;
    url: string;
    images: {
      webp: { image_url: string; small_image_url?: string };
      jpg: { image_url: string };
    };
    name: string;
  };
  role: string;
  voice_actors: Array<{
    person: {
      mal_id: number;
      name: string;
      images: {
        jpg: { image_url: string };
      };
    };
    language: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class JikanService {
  private http = inject(HttpClient);
  private baseUrl = 'https://api.jikan.moe/v4';
  
  // Cache to prevent duplicate and rapid rate limit hits
  private cache = new Map<string, Observable<any>>();

  private getCached<T>(url: string, params?: HttpParams): Observable<T> {
    const key = `${url}?${params?.toString() || ''}`;
    if (!this.cache.has(key)) {
      const request$ = this.http.get<T>(url, { params }).pipe(
        timeout(15000),
        retryWhen(errors =>
          errors.pipe(
            delayWhen((err) => {
              if (err instanceof HttpErrorResponse) {
                if (err.status === 429) return timer(2000);
                if (err.status >= 500) return timer(3000);
              }
              throw err;
            }),
          )
        ),
        shareReplay({ bufferSize: 1, refCount: true })
      );
      this.cache.set(key, request$);
      setTimeout(() => this.cache.delete(key), 3 * 60 * 1000);
    }
    return this.cache.get(key) as Observable<T>;
  }

  getTopAiring(page: number = 1): Observable<JikanResponse<Anime[]>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('filter', 'airing')
      .set('limit', '20');
    return this.getCached<JikanResponse<Anime[]>>(`${this.baseUrl}/top/anime`, params);
  }

  getPopular(page: number = 1): Observable<JikanResponse<Anime[]>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('filter', 'bypopularity')
      .set('limit', '20');
    return this.getCached<JikanResponse<Anime[]>>(`${this.baseUrl}/top/anime`, params);
  }

  getCurrentSeason(page: number = 1): Observable<JikanResponse<Anime[]>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', '20');
    return this.getCached<JikanResponse<Anime[]>>(`${this.baseUrl}/seasons/now`, params);
  }

  getRecentUpcoming(page: number = 1): Observable<JikanResponse<Anime[]>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('filter', 'upcoming')
      .set('limit', '20');
    return this.getCached<JikanResponse<Anime[]>>(`${this.baseUrl}/top/anime`, params);
  }

  getAnimeDetails(id: number): Observable<Anime> {
    return this.getCached<JikanResponse<Anime>>(`${this.baseUrl}/anime/${id}`).pipe(
      map(response => response.data)
    );
  }

  getAnimeCharacters(id: number): Observable<CharacterInfo[]> {
    return this.getCached<JikanResponse<CharacterInfo[]>>(`${this.baseUrl}/anime/${id}/characters`).pipe(
      map(response => response.data || [])
    );
  }

  getGenres(): Observable<Array<{ mal_id: number; name: string }>> {
    return this.getCached<JikanResponse<Array<{ mal_id: number; name: string }>>>(`${this.baseUrl}/genres/anime`).pipe(
      map(response => response.data || [])
    );
  }

  searchAnime(filters: {
    q?: string;
    page?: number;
    genres?: string; // comma-separated ids
    score?: number;
    status?: string;
    year?: number;
    season?: string;
  }): Observable<JikanResponse<Anime[]>> {
    let params = new HttpParams().set('limit', '20');
    
    if (filters.q) params = params.set('q', filters.q);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.genres) params = params.set('genres', filters.genres);
    if (filters.score) params = params.set('min_score', filters.score.toString());
    if (filters.status) params = params.set('status', filters.status);
    if (filters.year) params = params.set('start_date', `${filters.year}-01-01`);
    if (filters.season) params = params.set('season', filters.season);

    return this.getCached<JikanResponse<Anime[]>>(`${this.baseUrl}/anime`, params);
  }
}
