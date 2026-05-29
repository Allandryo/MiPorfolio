import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';

import { JikanService, Anime } from '../../core/services/jikan.service';
import { AnimeCardComponent } from '../../shared/components/anime-card/anime-card.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';

interface Genre {
  mal_id: number;
  name: string;
}

interface SectionData {
  title: string;
  icon: string;
  items: Anime[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AnimeCardComponent, SkeletonCardComponent],
  template: `
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="container hero-content">
        <h1 class="hero-title">
          Descubre tu<br />
          <span class="text-gradient">próximo anime favorito</span>
        </h1>
        <p class="hero-subtitle">Explora, busca y organiza tu lista personal de animes</p>
        
        <!-- Search bar in the hero -->
        <div class="search-bar-wrapper">
          <div class="search-bar surface-panel">
            <span class="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              class="search-input"
              placeholder="explorar catalogo"
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearchInput($event)"
            />
            @if (searchQuery()) {
              <button class="clear-btn" (click)="clearSearch()">
                <span class="material-symbols-outlined">close</span>
              </button>
            }
          </div>
        </div>
      </div>
    </section>

    <!-- Main Content Area -->
    <div class="container main-content">
      <div class="catalog-layout">
        <!-- Left Filters Sidebar -->
        <aside class="filters-sidebar">
            <div class="filters-header">
              <h3>
                <span class="material-symbols-outlined">filter_list</span>
                Filtros
              </h3>
              @if (activeFilterCount() > 0) {
                <button class="clear-filters-btn" (click)="clearAllFilters()">
                  <span class="material-symbols-outlined icon-sm">restart_alt</span>
                  Limpiar
                </button>
              }
            </div>

            <!-- Genre Filter -->
            <div class="filter-group">
              <button class="filter-group-header" (click)="genresExpanded.set(!genresExpanded())">
                <span class="filter-label">
                  <span class="material-symbols-outlined icon-sm">category</span>
                  Géneros
                </span>
                @if (selectedGenres().length > 0) {
                  <span class="active-count">{{ selectedGenres().length }}</span>
                }
                <span class="material-symbols-outlined chevron" [class.rotated]="genresExpanded()">
                  expand_more
                </span>
              </button>
              @if (genresExpanded()) {
                <div class="filter-body genre-grid">
                  @if (genres().length === 0) {
                    <div class="genre-loading">
                      @for (i of skeletonGenres; track i) {
                        <div class="genre-skeleton shimmer"></div>
                      }
                    </div>
                  } @else {
                    @for (genre of genres(); track genre.mal_id) {
                      <button
                        class="genre-tag-btn"
                        [class.active]="isGenreSelected(genre.mal_id)"
                        (click)="toggleGenre(genre.mal_id)"
                      >
                        {{ genre.name }}
                      </button>
                    }
                  }
                </div>
              }
            </div>

            <!-- Score Filter -->
            <div class="filter-group">
              <button class="filter-group-header" (click)="scoreExpanded.set(!scoreExpanded())">
                <span class="filter-label">
                  <span class="material-symbols-outlined icon-sm">star</span>
                  Puntuación mínima
                </span>
                @if (selectedScore()) {
                  <span class="active-count">{{ selectedScore() }}+</span>
                }
                <span class="material-symbols-outlined chevron" [class.rotated]="scoreExpanded()">
                  expand_more
                </span>
              </button>
              @if (scoreExpanded()) {
                <div class="filter-body">
                  <select
                    class="filter-select input-glass"
                    [ngModel]="selectedScore()"
                    (ngModelChange)="onScoreChange($event)"
                  >
                    <option [ngValue]="null">Cualquiera</option>
                    @for (s of scoreOptions; track s) {
                      <option [ngValue]="s">{{ s }}+ estrellas</option>
                    }
                  </select>
                </div>
              }
            </div>

            <!-- Year Filter -->
            <div class="filter-group">
              <button class="filter-group-header" (click)="yearExpanded.set(!yearExpanded())">
                <span class="filter-label">
                  <span class="material-symbols-outlined icon-sm">calendar_month</span>
                  Año
                </span>
                @if (selectedYear()) {
                  <span class="active-count">{{ selectedYear() }}</span>
                }
                <span class="material-symbols-outlined chevron" [class.rotated]="yearExpanded()">
                  expand_more
                </span>
              </button>
              @if (yearExpanded()) {
                <div class="filter-body">
                  <select
                    class="filter-select input-glass"
                    [ngModel]="selectedYear()"
                    (ngModelChange)="onYearChange($event)"
                  >
                    <option [ngValue]="null">Todos</option>
                    @for (y of yearOptions; track y) {
                      <option [ngValue]="y">{{ y }}</option>
                    }
                  </select>
                </div>
              }
            </div>

            <!-- Season Filter -->
            <div class="filter-group">
              <button class="filter-group-header" (click)="seasonExpanded.set(!seasonExpanded())">
                <span class="filter-label">
                  <span class="material-symbols-outlined icon-sm">sunny</span>
                  Temporada
                </span>
                @if (selectedSeason()) {
                  <span class="active-count">{{ getSeasonLabel(selectedSeason()!) }}</span>
                }
                <span class="material-symbols-outlined chevron" [class.rotated]="seasonExpanded()">
                  expand_more
                </span>
              </button>
              @if (seasonExpanded()) {
                <div class="filter-body">
                  <select
                    class="filter-select input-glass"
                    [ngModel]="selectedSeason()"
                    (ngModelChange)="onSeasonChange($event)"
                  >
                    <option [ngValue]="null">Todas</option>
                    @for (sea of seasonOptions; track sea.value) {
                      <option [ngValue]="sea.value">{{ sea.label }}</option>
                    }
                  </select>
                </div>
              }
            </div>

            <!-- Status Filter -->
            <div class="filter-group">
              <button class="filter-group-header" (click)="statusExpanded.set(!statusExpanded())">
                <span class="filter-label">
                  <span class="material-symbols-outlined icon-sm">tv</span>
                  Estado
                </span>
                @if (selectedStatus()) {
                  <span class="active-count">{{ getStatusLabel(selectedStatus()!) }}</span>
                }
                <span class="material-symbols-outlined chevron" [class.rotated]="statusExpanded()">
                  expand_more
                </span>
              </button>
              @if (statusExpanded()) {
                <div class="filter-body">
                  <select
                    class="filter-select input-glass"
                    [ngModel]="selectedStatus()"
                    (ngModelChange)="onStatusChange($event)"
                  >
                    <option [ngValue]="null">Todos</option>
                    @for (st of statusOptions; track st.value) {
                      <option [ngValue]="st.value">{{ st.label }}</option>
                    }
                  </select>
                </div>
              }
            </div>
        </aside>

        <main class="catalog-content">
          @if (showResults()) {
            <!-- Results Area -->
            <section class="results-area">
            <!-- Results Header -->
            @if (!loading() || results().length > 0) {
              <div class="results-header">
                <span class="results-count">
                  <span class="material-symbols-outlined icon-sm">dashboard</span>
                  @if (totalResults() > 0) {
                    {{ totalResults() }} resultados encontrados
                  } @else if (!loading()) {
                    Sin resultados
                  }
                </span>
              </div>
            }

            <!-- Results Grid -->
            <div class="results-grid">
              @for (anime of results(); track anime.mal_id) {
                <app-anime-card [anime]="anime" />
              }

              <!-- Skeleton Loading -->
              @if (loading()) {
                @for (i of skeletonCards; track i) {
                  <app-skeleton-card />
                }
              }
            </div>

            <!-- Empty State -->
            @if (!loading() && results().length === 0 && hasSearched()) {
              <div class="empty-state">
                <div class="empty-icon">
                  <span class="material-symbols-outlined">search_off</span>
                </div>
                <h3>No se encontraron resultados</h3>
                <p>Intenta ajustar los filtros o busca con otros términos</p>
                <button class="btn-glass" (click)="clearAllFilters()">
                  <span class="material-symbols-outlined icon-sm">restart_alt</span>
                  Limpiar filtros
                </button>
              </div>
            }

            <!-- Load More -->
            @if (hasNextPage() && !loading() && results().length > 0) {
              <div class="load-more-wrapper">
                <button class="btn-gradient load-more-btn" (click)="loadMore()">
                  <span class="material-symbols-outlined">expand_more</span>
                  Cargar más
                </button>
              </div>
            }

            <!-- Loading more indicator -->
            @if (loadingMore()) {
              <div class="loading-more">
                <div class="spinner"></div>
                <span>Cargando más resultados...</span>
              </div>
            }
            </section>
          } @else {
        <!-- Default Catalog Sections -->
        <div class="sections">
          @for (section of sections; track section.title) {
            <section class="section">
              <div class="section-header">
                <div class="section-header-left">
                  <span class="material-symbols-outlined section-icon">{{ section.icon }}</span>
                  <h2 class="section-title">{{ section.title }}</h2>
                </div>
                <div class="section-actions">
                  <a routerLink="/" [queryParams]="getSectionQueryParams(section.title)" class="section-link">
                    Ver todo
                    <span class="material-symbols-outlined">chevron_right</span>
                  </a>
                  <div class="carousel-controls">
                    <button
                      class="carousel-arrow"
                      (click)="moveSection(section, 'left')"
                      [disabled]="!canMoveSection(section, 'left')"
                      aria-label="Mostrar 5 animes anteriores"
                    >
                      <span class="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button
                      class="carousel-arrow"
                      (click)="moveSection(section, 'right')"
                      [disabled]="!canMoveSection(section, 'right')"
                      aria-label="Mostrar 5 animes siguientes"
                    >
                      <span class="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>

              @if (section.error) {
                <div class="section-error">
                  <span class="material-symbols-outlined">error_outline</span>
                  <span>{{ section.error }}</span>
                  <button class="btn-outline btn-retry" (click)="retrySection(section.title)">
                    <span class="material-symbols-outlined icon-sm">replay</span>
                    Reintentar
                  </button>
                </div>
              } @else {
                <div class="carousel-grid">
                  @if (section.loading) {
                    @for (item of carouselSkeletons; track item) {
                      <app-skeleton-card />
                    }
                  } @else {
                    @for (anime of getVisibleSectionItems(section); track anime.mal_id) {
                      <app-anime-card [anime]="anime" />
                    }
                  }
                </div>
              }
            </section>
          }
            </div>
          }
        </main>
      </div>
    </div>

    <footer class="footer">
      <div class="container footer-inner">
        <span class="text-gradient-primary">AnimeHub</span>
        <span class="footer-divider">•</span>
        <span>Datos proporcionados por <a href="https://jikan.moe" target="_blank" rel="noopener">Jikan API</a></span>
      </div>
    </footer>
  `,
  styles: [`
    .hero {
      position: relative;
      padding: 5rem 0 4rem;
      overflow: hidden;
      text-align: center;
    }

    .hero-bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse at 20% 50%, hsla(var(--primary-hsl), 0.08) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 50%, hsla(var(--secondary-hsl), 0.06) 0%, transparent 60%);
      pointer-events: none;
    }

    .hero-content {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
    }

    .hero-title {
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.03em;
    }

    .hero-subtitle {
      color: var(--text-secondary);
      font-size: 1.1rem;
      max-width: 480px;
    }

    /* ===== Search Bar ===== */
    .search-bar-wrapper {
      width: 100%;
      max-width: 600px;
      margin-top: 1.5rem;
    }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.35rem 0.5rem 0.35rem 1.25rem;
      border-radius: var(--radius-lg);
      background: var(--surface-card);
      border: 1px solid var(--border);
      transition: var(--transition-normal);

      &:focus-within {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-subtle);
      }
    }

    .search-icon {
      color: var(--text-muted);
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .search-input {
      flex: 1;
      border: none !important;
      background: transparent !important;
      padding: 0.85rem 0.5rem !important;
      font-size: 1.05rem;
      color: #fff;
      outline: none !important;
      box-shadow: none !important;

      &::placeholder {
        color: var(--text-muted);
      }
    }

    .clear-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-secondary);
      cursor: pointer;
      transition: var(--transition-fast);
      flex-shrink: 0;

      &:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }
    }

    /* ===== Main Content ===== */
    .main-content {
      padding-bottom: 4rem;
      margin-top: 2rem;
    }

    .catalog-layout {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      gap: 1.5rem;
      align-items: start;

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }
    }

    .catalog-content {
      min-width: 0;
    }

    .sections {
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;

      @media (max-width: 640px) {
        align-items: flex-start;
        flex-direction: column;
      }
    }

    .section-header-left {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .section-icon {
      font-size: 1.5rem;
      color: var(--primary);
      font-variation-settings: 'FILL' 1;
    }

    .section-title {
      font-size: 1.35rem;
      font-weight: 700;
    }

    .section-link {
      display: flex;
      align-items: center;
      gap: 0.15rem;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-secondary);
      transition: var(--transition-fast);

      &:hover {
        color: var(--primary);
      }

      .material-symbols-outlined {
        font-size: 1.1rem;
      }
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-shrink: 0;

      @media (max-width: 640px) {
        width: 100%;
        justify-content: space-between;
        gap: 0.55rem;
      }
    }

    .carousel-controls {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .carousel-arrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      color: var(--text-primary);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover:not(:disabled) {
        background: var(--primary);
        border-color: var(--primary);
        box-shadow: var(--shadow-lg);
      }

      &:active:not(:disabled) {
        transform: scale(0.96);
      }

      &:disabled {
        opacity: 0.38;
        cursor: not-allowed;
      }

      .material-symbols-outlined {
        font-size: 1.5rem;
      }
    }

    .carousel-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 1rem;
      min-width: 0;

      @media (max-width: 1180px) {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      @media (max-width: 900px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      @media (max-width: 640px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.85rem;
      }
    }

    .section-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: rgba(255, 23, 68, 0.08);
      border: 1px solid rgba(255, 23, 68, 0.2);
      border-radius: var(--radius-md);
      color: var(--danger);
      font-size: 0.9rem;
    }

    .btn-retry {
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      margin-left: auto;
    }

    .filters-sidebar {
      position: sticky;
      top: 5rem;
      border-radius: var(--radius-lg);
      background: var(--surface-card);
      border: 1px solid var(--border);
      overflow: hidden;
      animation: slideDown 0.3s ease;

      @media (max-width: 900px) {
        position: static;
        margin-bottom: 1.5rem;
      }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .filters-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.15rem;
      border-bottom: 1px solid var(--border);

      h3 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1rem;
        font-weight: 600;
      }
    }

    .clear-filters-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: none;
      border: none;
      color: var(--secondary);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition-fast);
      font-family: var(--font-body);

      &:hover {
        color: #fff;
      }
    }

    .filter-group {
      border-bottom: 1px solid var(--border);

      &:last-child {
        border-bottom: none;
      }
    }

    .filter-group-header {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 0.85rem 1.15rem;
      background: none;
      border: none;
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: 0.88rem;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition-fast);

      &:hover {
        background: rgba(255, 255, 255, 0.03);
      }
    }

    .filter-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      text-align: left;
    }

    .active-count {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--primary);
      background: var(--primary-subtle);
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
      margin-right: 0.35rem;
    }

    .chevron {
      font-size: 1.2rem;
      color: var(--text-muted);
      transition: transform var(--transition-normal);
      flex-shrink: 0;

      &.rotated {
        transform: rotate(180deg);
      }
    }

    .filter-body {
      padding: 0 1.15rem 1rem;
    }

    .genre-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .genre-tag-btn {
      padding: 0.3rem 0.7rem;
      font-size: 0.75rem;
      font-weight: 500;
      font-family: var(--font-body);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-secondary);
      cursor: pointer;
      transition: var(--transition-fast);
      white-space: nowrap;

      &:hover {
        border-color: var(--border-hover);
        color: var(--text-primary);
        background: rgba(255, 255, 255, 0.06);
      }

      &.active {
        border-color: var(--primary);
        background: var(--primary-subtle);
        color: #818cf8;
      }
    }

    .genre-loading {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .genre-skeleton {
      width: 70px;
      height: 28px;
      border-radius: var(--radius-sm);
    }

    .filter-select {
      width: 100%;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      padding-right: 2.25rem !important;
      cursor: pointer;
      font-size: 0.85rem;

      option {
        background: #0f1117;
        color: #fff;
      }
    }

    /* ===== Results Area ===== */
    .results-area {
      min-height: 300px;
    }

    .results-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }

    .results-count {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.9rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
      gap: 1.25rem;

      @media (max-width: 640px) {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 0.85rem;
      }
    }

    /* ===== Empty State ===== */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 4rem 2rem;
      gap: 1rem;
    }

    .empty-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--primary-subtle);
      border: 1px solid rgba(99, 102, 241, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;

      .material-symbols-outlined {
        font-size: 2.5rem;
        color: var(--text-muted);
      }
    }

    .empty-state h3 {
      font-size: 1.25rem;
      color: var(--text-primary);
    }

    .empty-state p {
      color: var(--text-muted);
      font-size: 0.9rem;
      max-width: 360px;
    }

    /* ===== Load More ===== */
    .load-more-wrapper {
      display: flex;
      justify-content: center;
      margin-top: 2.5rem;
    }

    .load-more-btn {
      padding: 0.8rem 2.5rem;
      font-size: 0.95rem;
    }

    .loading-more {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2rem;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .spinner {
      width: 22px;
      height: 22px;
      border: 2px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ===== Footer ===== */
    .footer {
      border-top: 1px solid var(--border);
      padding: 1.5rem 0;
      margin-top: auto;
    }

    .footer-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .footer-divider {
      color: var(--border);
    }

    .footer a {
      color: var(--text-secondary);
      &:hover {
        color: var(--primary);
      }
    }
  `]
})
export class CatalogComponent implements OnInit, OnDestroy {
  private jikanService = inject(JikanService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Default sections
  sections: SectionData[] = [
    { title: 'Top Airing', icon: 'trending_up', items: [], loading: true, error: null },
    { title: 'Temporada Actual', icon: 'calendar_month', items: [], loading: true, error: null },
    { title: 'Más Populares', icon: 'whatshot', items: [], loading: true, error: null },
    { title: 'Próximamente', icon: 'new_releases', items: [], loading: true, error: null },
  ];

  // Search state
  searchQuery = signal('');
  results = signal<Anime[]>([]);
  loading = signal(false);
  loadingMore = signal(false);
  hasSearched = signal(false);
  totalResults = signal(0);
  hasNextPage = signal(false);
  currentPage = signal(1);

  // Filter state
  genres = signal<Genre[]>([]);
  selectedGenres = signal<number[]>([]);
  selectedScore = signal<number | null>(null);
  selectedYear = signal<number | null>(null);
  selectedSeason = signal<string | null>(null);
  selectedStatus = signal<string | null>(null);

  // UI state - COLLAPSED BY DEFAULT (sin abrir)
  genresExpanded = signal(false);
  scoreExpanded = signal(false);
  yearExpanded = signal(false);
  seasonExpanded = signal(false);
  statusExpanded = signal(false);
  sectionOffsets = signal<Record<string, number>>({});

  // Active filter count
  activeFilterCount = computed(() => {
    let count = 0;
    if (this.selectedGenres().length > 0) count++;
    if (this.selectedScore()) count++;
    if (this.selectedYear()) count++;
    if (this.selectedSeason()) count++;
    if (this.selectedStatus()) count++;
    return count;
  });

  // Switcher: show search results or default scroll sections
  showResults = computed(() => {
    return this.searchQuery().trim().length > 0 || this.activeFilterCount() > 0;
  });

  // Options
  scoreOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  statusOptions = [
    { value: 'airing', label: 'En emisión' },
    { value: 'complete', label: 'Finalizado' },
    { value: 'upcoming', label: 'Próximamente' }
  ];
  seasonOptions = [
    { value: 'summer', label: 'Verano' },
    { value: 'spring', label: 'Primavera' },
    { value: 'fall', label: 'Otoño' },
    { value: 'winter', label: 'Invierno' }
  ];
  yearOptions: number[] = [];
  skeletonCards = Array.from({ length: 12 }, (_, i) => i);
  skeletonGenres = Array.from({ length: 10 }, (_, i) => i);
  carouselSkeletons = Array.from({ length: 5 }, (_, i) => i);
  private readonly carouselStep = 5;

  // RxJS
  private searchSubject = new Subject<string>();
  private subscriptions = new Subscription();

  ngOnInit(): void {
    // Build year options from current year to 1980
    const currentYear = new Date().getFullYear();
    this.yearOptions = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => currentYear - i);

    // Load default sections
    this.loadSection(0, () => this.jikanService.getTopAiring());
    this.loadSection(1, () => this.jikanService.getCurrentSeason());
    this.loadSection(2, () => this.jikanService.getPopular());
    this.loadSection(3, () => this.jikanService.getRecentUpcoming());

    // Fetch genres for the sidebar
    this.subscriptions.add(
      this.jikanService.getGenres().subscribe(genres => this.genres.set(genres))
    );

    // Setup debounced search
    this.subscriptions.add(
      this.searchSubject.pipe(
        debounceTime(500),
        distinctUntilChanged()
      ).subscribe(query => {
        this.searchQuery.set(query);
        this.currentPage.set(1);
        this.results.set([]);
        this.syncFiltersToUrl();
        if (this.showResults()) {
          this.executeSearch();
        }
      })
    );

    // Read initial query params from URL
    this.subscriptions.add(
      this.route.queryParams.subscribe(params => {
        let shouldSearch = false;

        // Sync query
        if (params['q'] !== undefined && params['q'] !== this.searchQuery()) {
          this.searchQuery.set(params['q']);
          shouldSearch = true;
        }

        // Sync genres and their expansion state (expand if active, otherwise collapse)
        if (params['genres']) {
          const genreIds = params['genres'].split(',').map((id: string) => +id).filter((id: number) => !isNaN(id));
          this.selectedGenres.set(genreIds);
          this.genresExpanded.set(true);
          shouldSearch = true;
        } else {
          this.selectedGenres.set([]);
          this.genresExpanded.set(false);
        }

        // Sync score and expansion state
        if (params['score']) {
          this.selectedScore.set(+params['score'] || null);
          this.scoreExpanded.set(true);
          shouldSearch = true;
        } else {
          this.selectedScore.set(null);
          this.scoreExpanded.set(false);
        }

        // Sync year and expansion state
        if (params['year']) {
          this.selectedYear.set(+params['year'] || null);
          this.yearExpanded.set(true);
          shouldSearch = true;
        } else {
          this.selectedYear.set(null);
          this.yearExpanded.set(false);
        }

        // Sync season and expansion state
        if (params['season']) {
          this.selectedSeason.set(params['season']);
          this.seasonExpanded.set(true);
          shouldSearch = true;
        } else {
          this.selectedSeason.set(null);
          this.seasonExpanded.set(false);
        }

        // Sync status and expansion state
        if (params['status']) {
          this.selectedStatus.set(params['status']);
          this.statusExpanded.set(true);
          shouldSearch = true;
        } else {
          this.selectedStatus.set(null);
          this.statusExpanded.set(false);
        }

        // Sync page
        if (params['page']) {
          this.currentPage.set(+params['page'] || 1);
        } else {
          this.currentPage.set(1);
        }

        if (shouldSearch || this.showResults()) {
          this.executeSearch();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSubject.next('');
  }

  toggleGenre(genreId: number): void {
    this.selectedGenres.update(ids => {
      const idx = ids.indexOf(genreId);
      if (idx >= 0) {
        return ids.filter(id => id !== genreId);
      }
      return [...ids, genreId];
    });
    this.onFilterChange();
  }

  isGenreSelected(genreId: number): boolean {
    return this.selectedGenres().includes(genreId);
  }

  onScoreChange(value: number | null): void {
    this.selectedScore.set(value);
    this.onFilterChange();
  }

  onYearChange(value: number | null): void {
    this.selectedYear.set(value);
    this.onFilterChange();
  }

  onSeasonChange(value: string | null): void {
    this.selectedSeason.set(value);
    this.onFilterChange();
  }

  onStatusChange(value: string | null): void {
    this.selectedStatus.set(value);
    this.onFilterChange();
  }

  getStatusLabel(value: string): string {
    return this.statusOptions.find(s => s.value === value)?.label || value;
  }

  getSeasonLabel(value: string): string {
    return this.seasonOptions.find(s => s.value === value)?.label || value;
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.selectedGenres.set([]);
    this.selectedScore.set(null);
    this.selectedYear.set(null);
    this.selectedSeason.set(null);
    this.selectedStatus.set(null);
    this.currentPage.set(1);
    this.results.set([]);
    this.hasSearched.set(false);
    this.totalResults.set(0);
    this.hasNextPage.set(false);

    // Collapse all accordion headers on clear
    this.genresExpanded.set(false);
    this.scoreExpanded.set(false);
    this.yearExpanded.set(false);
    this.seasonExpanded.set(false);
    this.statusExpanded.set(false);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
    });
  }

  loadMore(): void {
    this.currentPage.update(p => p + 1);
    this.syncFiltersToUrl();
    this.executeSearch(true);
  }

  private onFilterChange(): void {
    this.currentPage.set(1);
    this.results.set([]);
    this.syncFiltersToUrl();
    this.executeSearch();
  }

  private syncFiltersToUrl(): void {
    const queryParams: Record<string, string | null> = {};

    queryParams['q'] = this.searchQuery() || null;
    queryParams['genres'] = this.selectedGenres().length > 0
      ? this.selectedGenres().join(',')
      : null;
    queryParams['score'] = this.selectedScore()
      ? String(this.selectedScore())
      : null;
    queryParams['year'] = this.selectedYear()
      ? String(this.selectedYear())
      : null;
    queryParams['season'] = this.selectedSeason() || null;
    queryParams['status'] = this.selectedStatus() || null;
    queryParams['page'] = this.currentPage() > 1
      ? String(this.currentPage())
      : null;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'replace',
      replaceUrl: true,
    });
  }

  private executeSearch(append = false): void {
    if (!this.showResults()) {
      return;
    }

    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
    }
    this.hasSearched.set(true);

    const filters: {
      q?: string;
      page?: number;
      genres?: string;
      score?: number;
      status?: string;
      year?: number;
      season?: string;
    } = {};

    if (this.searchQuery()) filters.q = this.searchQuery();
    filters.page = this.currentPage();
    if (this.selectedGenres().length > 0) filters.genres = this.selectedGenres().join(',');
    if (this.selectedScore()) filters.score = this.selectedScore()!;
    if (this.selectedYear()) filters.year = this.selectedYear()!;
    if (this.selectedSeason()) filters.season = this.selectedSeason()!;
    if (this.selectedStatus()) filters.status = this.selectedStatus()!;

    this.subscriptions.add(
      this.jikanService.searchAnime(filters).pipe(
        finalize(() => {
          this.loading.set(false);
          this.loadingMore.set(false);
        })
      ).subscribe({
        next: response => {
          if (append) {
            this.results.update(prev => [...prev, ...response.data]);
          } else {
            this.results.set(response.data);
          }
          this.totalResults.set(response.pagination?.items?.total ?? response.data.length);
          this.hasNextPage.set(response.pagination?.has_next_page ?? false);
        },
        error: err => {
          console.error('Search error:', err);
          if (!append) {
            this.results.set([]);
            this.totalResults.set(0);
          }
        }
      })
    );
  }

  // Load default sections
  private loadSection(
    index: number,
    fetchFn: () => ReturnType<typeof this.jikanService.getTopAiring>
  ) {
    this.sections[index].loading = true;
    this.sections[index].error = null;
    fetchFn().subscribe({
      next: (res) => {
        this.sections[index].items = res.data;
        this.sections[index].loading = false;
      },
      error: () => {
        this.sections[index].loading = false;
        this.sections[index].error = 'Error al cargar esta sección.';
      }
    });
  }

  retrySection(title: string) {
    const idx = this.sections.findIndex(s => s.title === title);
    if (idx < 0) return;
    
    let fetchFn: () => ReturnType<typeof this.jikanService.getTopAiring>;
    if (title === 'Top Airing') fetchFn = () => this.jikanService.getTopAiring();
    else if (title === 'Temporada Actual') fetchFn = () => this.jikanService.getCurrentSeason();
    else if (title === 'Más Populares') fetchFn = () => this.jikanService.getPopular();
    else fetchFn = () => this.jikanService.getRecentUpcoming();

    this.loadSection(idx, fetchFn);
  }

  getSectionQueryParams(title: string) {
    if (title === 'Top Airing') {
      return { status: 'airing' };
    } else if (title === 'Próximamente') {
      return { status: 'upcoming' };
    } else if (title === 'Temporada Actual') {
      return { status: 'airing', year: new Date().getFullYear() };
    }
    return { q: '' };
  }

  getVisibleSectionItems(section: SectionData): Anime[] {
    const offset = Math.min(this.getSectionOffset(section.title), this.getMaxSectionOffset(section));
    return section.items.slice(offset, offset + this.carouselStep);
  }

  canMoveSection(section: SectionData, direction: 'left' | 'right'): boolean {
    if (section.loading || section.items.length <= this.carouselStep) {
      return false;
    }

    const offset = this.getSectionOffset(section.title);
    return direction === 'left'
      ? offset > 0
      : offset + this.carouselStep < section.items.length;
  }

  moveSection(section: SectionData, direction: 'left' | 'right'): void {
    const offset = this.getSectionOffset(section.title);
    const nextOffset = direction === 'left'
      ? offset - this.carouselStep
      : offset + this.carouselStep;
    const clampedOffset = Math.max(0, Math.min(this.getMaxSectionOffset(section), nextOffset));

    this.sectionOffsets.update(offsets => ({
      ...offsets,
      [section.title]: clampedOffset,
    }));
  }

  private getSectionOffset(title: string): number {
    return this.sectionOffsets()[title] ?? 0;
  }

  private getMaxSectionOffset(section: SectionData): number {
    if (section.items.length <= this.carouselStep) {
      return 0;
    }

    return Math.floor((section.items.length - 1) / this.carouselStep) * this.carouselStep;
  }
}
