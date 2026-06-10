import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Anime } from '../../../core/services/jikan.service';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { WatchlistService } from '../../../core/services/watchlist.service';

@Component({
  selector: 'app-anime-card',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  template: `
    <a [routerLink]="['/anime', anime.mal_id]" class="card" [title]="anime.title">
      <div class="poster-wrapper">
        <img
          [src]="anime.images.webp?.large_image_url || anime.images.jpg.large_image_url || anime.images.jpg.image_url"
          [alt]="anime.title"
          class="poster"
          loading="lazy"
        />
        <div class="poster-overlay">
          <div class="overlay-actions">
            <span class="material-symbols-outlined icon-lg">play_circle</span>
          </div>
        </div>
        @if (anime.score) {
          <div class="score-badge">
            <span class="material-symbols-outlined icon-sm">star</span>
            {{ anime.score | number:'1.1-1' }}
          </div>
        }
        @if (anime.airing) {
          <div class="airing-badge">
            <span class="pulse-dot"></span>
            En Emisión
          </div>
        }
        @if (watchlistItem) {
          <div class="watchlist-indicator">
            <app-status-badge [status]="watchlistItem.status" />
          </div>
        }
      </div>
      <div class="card-body">
        <h3 class="title">{{ anime.title }}</h3>
        <div class="meta">
          @if (anime.type) {
            <span class="type-tag">{{ anime.type }}</span>
          }
          @if (anime.episodes) {
            <span class="episodes">{{ anime.episodes }} eps</span>
          }
          @if (anime.year) {
            <span class="year">{{ anime.year }}</span>
          }
        </div>
        @if (anime.genres && anime.genres.length > 0) {
          <div class="genres">
            @for (genre of anime.genres.slice(0, 3); track genre.mal_id) {
              <span class="genre-tag">{{ genre.name }}</span>
            }
          </div>
        }
      </div>
    </a>
  `,
  styles: [`
    .card {
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-md);
      overflow: hidden;
      background: var(--surface-card);
      border: 1px solid var(--border);
      transition: var(--transition-normal);
      text-decoration: none;
      color: inherit;
      position: relative;

      &:hover {
        transform: translateY(-4px);
        border-color: var(--border-hover);
        box-shadow: var(--shadow-lg);

        .poster-overlay {
          opacity: 1;
        }
      }
    }

    .poster-wrapper {
      position: relative;
      aspect-ratio: 3 / 4.2;
      overflow: hidden;
      background: var(--surface);
    }

    .poster {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .poster-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(15, 23, 42, 0.8) 0%, transparent 50%);
      opacity: 0;
      transition: var(--transition-normal);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .overlay-actions {
      color: #fff;
      font-size: 2.5rem;
      opacity: 0.9;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));
    }

    .score-badge {
      position: absolute;
      top: 0.6rem;
      left: 0.6rem;
      display: flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.25rem 0.55rem;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(8px);
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      font-weight: 700;
      font-family: var(--font-heading);
      color: var(--primary);
      border: 1px solid rgba(255, 107, 107, 0.15);
    }

    .airing-badge {
      position: absolute;
      top: 0.6rem;
      right: 0.6rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.55rem;
      background: rgba(15, 118, 110, 0.15);
      backdrop-filter: blur(8px);
      border-radius: var(--radius-sm);
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--success);
      border: 1px solid rgba(15, 118, 110, 0.25);
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--success);
      animation: pulse 1.5s ease infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.4); }
    }

    .watchlist-indicator {
      position: absolute;
      bottom: 0.5rem;
      left: 0.5rem;
    }

    .card-body {
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .title {
      font-size: 0.9rem;
      font-weight: 600;
      line-height: 1.35;
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .type-tag {
      padding: 0.1rem 0.4rem;
      background: var(--primary-subtle);
      border: 1px solid rgba(255, 107, 107, 0.15);
      border-radius: 4px;
      color: var(--primary);
      font-weight: 600;
      font-size: 0.7rem;
      text-transform: uppercase;
    }

    .genres {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .genre-tag {
      font-size: 0.7rem;
      color: var(--text-muted);
      padding: 0.1rem 0.4rem;
      border: 1px solid var(--border);
      border-radius: 4px;
      transition: var(--transition-fast);
    }
  `]
})
export class AnimeCardComponent {
  @Input({ required: true }) anime!: Anime;

  private watchlistService = inject(WatchlistService);

  get watchlistItem() {
    return this.watchlistService.getWatchlistItem(this.anime?.mal_id);
  }
}
