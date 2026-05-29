import { Injectable, signal, computed, effect } from '@angular/core';
import { Anime } from './jikan.service';

export enum AnimeStatus {
  WATCHING = 'WATCHING',
  WATCHED = 'WATCHED',
  PLAN_TO_WATCH = 'PLAN_TO_WATCH'
}

export interface WatchlistItem {
  animeId: number;
  title: string;
  imageUrl: string;
  score?: number;
  status: AnimeStatus;
  watchedEpisodes: number;
  totalEpisodes?: number;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class WatchlistService {
  private STORAGE_KEY = 'anime_web_app_watchlist';

  // Core reactive list using Signals
  private itemsSignal = signal<WatchlistItem[]>([]);

  // Exposed read-only lists computed from the core list
  items = computed(() => this.itemsSignal());
  
  watching = computed(() => this.itemsSignal().filter(item => item.status === AnimeStatus.WATCHING));
  watched = computed(() => this.itemsSignal().filter(item => item.status === AnimeStatus.WATCHED));
  planToWatch = computed(() => this.itemsSignal().filter(item => item.status === AnimeStatus.PLAN_TO_WATCH));

  constructor() {
    // Load initial list from localStorage
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.itemsSignal.set(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading watchlist from localStorage', e);
      }
    }

    // Effect to automatically save state whenever list changes
    effect(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.itemsSignal()));
    });
  }

  getWatchlistItem(animeId: number): WatchlistItem | undefined {
    return this.itemsSignal().find(item => item.animeId === animeId);
  }

  addToWatchlist(anime: Anime, status: AnimeStatus): void {
    const existing = this.getWatchlistItem(anime.mal_id);
    const now = new Date().toISOString();

    if (existing) {
      this.updateStatus(anime.mal_id, status);
      return;
    }

    const newItem: WatchlistItem = {
      animeId: anime.mal_id,
      title: anime.title,
      imageUrl: anime.images.webp?.image_url || anime.images.jpg.image_url,
      score: anime.score,
      status: status,
      watchedEpisodes: status === AnimeStatus.WATCHED ? (anime.episodes || 0) : 0,
      totalEpisodes: anime.episodes,
      updatedAt: now
    };

    this.itemsSignal.update(items => [newItem, ...items]);
  }

  updateStatus(animeId: number, status: AnimeStatus): void {
    const now = new Date().toISOString();
    this.itemsSignal.update(items =>
      items.map(item => {
        if (item.animeId === animeId) {
          const watchedEpisodes = status === AnimeStatus.WATCHED 
            ? (item.totalEpisodes || item.watchedEpisodes) 
            : item.watchedEpisodes;
          return { ...item, status, watchedEpisodes, updatedAt: now };
        }
        return item;
      })
    );
  }

  updateProgress(animeId: number, episodes: number): void {
    const now = new Date().toISOString();
    this.itemsSignal.update(items =>
      items.map(item => {
        if (item.animeId === animeId) {
          let status = item.status;
          let watched = Math.max(0, episodes);
          
          if (item.totalEpisodes && watched >= item.totalEpisodes) {
            watched = item.totalEpisodes;
            status = AnimeStatus.WATCHED;
          } else if (watched > 0 && status === AnimeStatus.PLAN_TO_WATCH) {
            status = AnimeStatus.WATCHING;
          }
          
          return { ...item, watchedEpisodes: watched, status, updatedAt: now };
        }
        return item;
      })
    );
  }

  removeFromWatchlist(animeId: number): void {
    this.itemsSignal.update(items => items.filter(item => item.animeId !== animeId));
  }
}
