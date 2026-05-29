import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WatchlistService, AnimeStatus, WatchlistItem } from '../../core/services/watchlist.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

interface Tab {
  key: AnimeStatus;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-my-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  template: `
    <section class="my-list-page">
      <div class="container">
        <!-- Header -->
        <div class="page-header">
          <div class="header-text">
            <h1 class="text-gradient">Mi Lista</h1>
            <p class="header-subtitle">Tu colección personal de anime</p>
          </div>
          <div class="header-stats">
            <div class="stat-chip glass-panel">
              <span class="material-symbols-outlined">favorite</span>
              <span>{{ totalItems() }} animes</span>
            </div>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="search-bar glass-panel">
          <span class="material-symbols-outlined search-icon">search</span>
          <input
            class="input-glass search-input"
            type="text"
            placeholder="Buscar en tu lista..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
          @if (searchQuery()) {
            <button class="clear-btn" (click)="searchQuery.set('')">
              <span class="material-symbols-outlined">close</span>
            </button>
          }
        </div>

        <!-- Tabs -->
        <div class="tabs-container glass-panel">
          @for (tab of tabs; track tab.key) {
            <button
              class="tab-btn"
              [class.active]="activeTab() === tab.key"
              (click)="activeTab.set(tab.key)"
            >
              <span class="material-symbols-outlined tab-icon">{{ tab.icon }}</span>
              <span class="tab-label">{{ tab.label }}</span>
              <span class="tab-count">{{ getTabCount(tab.key) }}</span>
            </button>
          }
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          @if (filteredItems().length === 0) {
            <!-- Empty State -->
            <div class="empty-state glass-card">
              <span class="material-symbols-outlined empty-icon">
                {{ activeTab() === 'WATCHING' ? 'play_circle' : activeTab() === 'WATCHED' ? 'check_circle' : 'schedule' }}
              </span>
              <h3>No tienes animes en esta lista</h3>
              <p class="empty-text">
                @if (searchQuery()) {
                  No se encontraron resultados para "{{ searchQuery() }}"
                } @else {
                  Explora y añade animes a tu lista para empezar
                }
              </p>
              @if (!searchQuery()) {
                <a routerLink="/" class="btn-gradient explore-btn">
                  <span class="material-symbols-outlined">explore</span>
                  Explorar anime
                </a>
              } @else {
                <button class="btn-glass" (click)="searchQuery.set('')">
                  <span class="material-symbols-outlined">backspace</span>
                  Limpiar búsqueda
                </button>
              }
            </div>
          } @else {
            <!-- Items Grid -->
            <div class="items-grid">
              @for (item of filteredItems(); track item.animeId) {
                <div class="list-item glass-card">
                  <!-- Poster -->
                  <a [routerLink]="['/anime', item.animeId]" class="poster-link">
                    <img [src]="item.imageUrl" [alt]="item.title" class="poster-img" loading="lazy" />
                    <div class="poster-overlay">
                      <span class="material-symbols-outlined">visibility</span>
                    </div>
                  </a>

                  <!-- Info -->
                  <div class="item-info">
                    <div class="item-top">
                      <a [routerLink]="['/anime', item.animeId]" class="item-title">{{ item.title }}</a>
                      <app-status-badge [status]="item.status"></app-status-badge>
                    </div>

                    <!-- Progress Bar -->
                    <div class="progress-section">
                      <div class="progress-header">
                        <span class="progress-label">Progreso</span>
                        <span class="progress-numbers">
                          {{ item.watchedEpisodes }} / {{ item.totalEpisodes || '?' }}
                          <span class="progress-pct">({{ getProgressPercentage(item) }}%)</span>
                        </span>
                      </div>
                      <div class="progress-track">
                        <div
                          class="progress-fill"
                          [style.width.%]="getProgressPercentage(item)"
                        ></div>
                      </div>
                    </div>

                    <!-- Episode Controls (for WATCHING) -->
                    @if (item.status === AnimeStatus.WATCHING) {
                      <div class="episode-controls">
                        <button
                          class="ep-btn btn-glass"
                          (click)="decrementEpisode(item, $event)"
                          [disabled]="item.watchedEpisodes <= 0"
                        >
                          <span class="material-symbols-outlined">remove</span>
                        </button>
                        <span class="ep-count">Ep. {{ item.watchedEpisodes }}</span>
                        <button
                          class="ep-btn btn-glass"
                          (click)="incrementEpisode(item, $event)"
                          [disabled]="item.totalEpisodes !== undefined && item.totalEpisodes !== null && item.watchedEpisodes >= item.totalEpisodes"
                        >
                          <span class="material-symbols-outlined">add</span>
                        </button>
                      </div>
                    }

                    <!-- Actions -->
                    <div class="item-actions">
                      <div class="status-dropdown-wrapper">
                        <button class="btn-glass action-btn" (click)="toggleDropdown(item.animeId, $event)">
                          <span class="material-symbols-outlined">swap_horiz</span>
                          <span class="action-label">Cambiar estado</span>
                        </button>
                        @if (openDropdownId() === item.animeId) {
                          <div class="status-dropdown glass-panel">
                            @for (opt of statusOptions; track opt.value) {
                              <button
                                class="dropdown-option"
                                [class.current]="item.status === opt.value"
                                (click)="changeStatus(item.animeId, opt.value, $event)"
                              >
                                <span class="material-symbols-outlined">{{ opt.icon }}</span>
                                {{ opt.label }}
                                @if (item.status === opt.value) {
                                  <span class="material-symbols-outlined check-icon">check</span>
                                }
                              </button>
                            }
                          </div>
                        }
                      </div>

                      <button class="btn-glass action-btn danger" (click)="confirmRemove(item, $event)">
                        <span class="material-symbols-outlined">delete</span>
                        <span class="action-label">Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Confirmation Modal -->
      @if (itemToRemove()) {
        <div class="modal-backdrop" (click)="cancelRemove()">
          <div class="modal-dialog glass-panel" (click)="$event.stopPropagation()">
            <div class="modal-icon-wrapper">
              <span class="material-symbols-outlined modal-icon">delete_forever</span>
            </div>
            <h3 class="modal-title">¿Eliminar de tu lista?</h3>
            <p class="modal-text">
              Vas a eliminar <strong>{{ itemToRemove()!.title }}</strong> de tu lista. Esta acción no se puede deshacer.
            </p>
            <div class="modal-actions">
              <button class="btn-glass" (click)="cancelRemove()">
                <span class="material-symbols-outlined">close</span>
                Cancelar
              </button>
              <button class="btn-gradient danger-btn" (click)="executeRemove()">
                <span class="material-symbols-outlined">delete</span>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
      min-height: calc(100vh - 80px);
      padding-top: 2rem;
      padding-bottom: 4rem;
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 2rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .page-header h1 {
      font-family: var(--font-heading);
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 0.25rem;
    }

    .header-subtitle {
      color: var(--text-secondary);
      font-size: 1rem;
    }

    .stat-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .stat-chip .material-symbols-outlined {
      color: var(--secondary);
      font-size: 1.15rem;
    }

    /* Search */
    .search-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      margin-bottom: 1.5rem;
    }

    .search-icon {
      color: var(--text-muted);
      font-size: 1.3rem;
    }

    .search-input {
      flex: 1;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0.5rem 0;
      font-size: 0.95rem;
      backdrop-filter: none;
    }
    .search-input:focus {
      border: none !important;
      box-shadow: none !important;
    }

    .clear-btn {
      background: rgba(255, 255, 255, 0.06);
      border: none;
      border-radius: var(--radius-sm);
      padding: 0.35rem;
      cursor: pointer;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition-fast);
    }
    .clear-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: var(--text-primary);
    }
    .clear-btn .material-symbols-outlined {
      font-size: 1.1rem;
    }

    /* Tabs */
    .tabs-container {
      display: flex;
      gap: 0.25rem;
      padding: 0.35rem;
      border-radius: var(--radius-md);
      margin-bottom: 2rem;
    }

    .tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.85rem 1rem;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-secondary);
      font-family: var(--font-heading);
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: var(--transition-normal);
      position: relative;
      user-select: none;
    }
    .tab-btn:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.04);
    }
    .tab-btn.active {
      background: var(--primary-subtle);
      border: 1px solid rgba(99, 102, 241, 0.25);
      color: #fff;
    }
    .tab-btn.active .tab-icon {
      color: var(--primary);
    }
    .tab-btn.active .tab-count {
      background: var(--primary);
      color: #fff;
    }

    .tab-icon {
      font-size: 1.2rem;
      transition: var(--transition-fast);
    }

    .tab-count {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-full, 9999px);
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-muted);
      min-width: 1.5rem;
      text-align: center;
      transition: var(--transition-normal);
    }

    /* Tab Content */
    .tab-content {
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 4rem 2rem;
      border-radius: var(--radius-lg);
    }
    .empty-state:hover {
      transform: none;
    }

    .empty-icon {
      font-size: 4rem;
      color: var(--text-muted);
      margin-bottom: 1.25rem;
      opacity: 0.5;
    }

    .empty-state h3 {
      font-family: var(--font-heading);
      font-size: 1.35rem;
      margin-bottom: 0.5rem;
    }

    .empty-text {
      color: var(--text-secondary);
      font-size: 0.95rem;
      margin-bottom: 1.75rem;
      max-width: 360px;
    }

    .explore-btn {
      font-size: 0.95rem;
      text-decoration: none;
    }

    /* Items Grid */
    .items-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .list-item {
      display: flex;
      gap: 1.25rem;
      padding: 1rem;
      border-radius: var(--radius-md);
      align-items: stretch;
    }
    .list-item:hover {
      transform: translateY(-2px);
    }

    /* Poster */
    .poster-link {
      position: relative;
      flex-shrink: 0;
      width: 100px;
      border-radius: var(--radius-sm);
      overflow: hidden;
      display: block;
    }

    .poster-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      min-height: 140px;
      transition: var(--transition-normal);
    }

    .poster-overlay {
      position: absolute;
      inset: 0;
      background: rgba(99, 102, 241, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: var(--transition-normal);
    }
    .poster-overlay .material-symbols-outlined {
      font-size: 2rem;
      color: #fff;
    }
    .poster-link:hover .poster-overlay {
      opacity: 1;
    }
    .poster-link:hover .poster-img {
      transform: scale(1.05);
    }

    /* Item Info */
    .item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: 0;
    }

    .item-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .item-title {
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--text-primary);
      text-decoration: none;
      line-height: 1.35;
      transition: var(--transition-fast);
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .item-title:hover {
      color: var(--primary);
    }

    /* Progress */
    .progress-section {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .progress-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
    }

    .progress-numbers {
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .progress-pct {
      color: var(--text-muted);
      font-size: 0.7rem;
      margin-left: 0.25rem;
    }

    .progress-track {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-full, 9999px);
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: var(--radius-full, 9999px);
      background: linear-gradient(90deg, var(--primary), var(--secondary));
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    .progress-fill::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.25) 50%,
        transparent 100%
      );
      animation: progressShine 2s ease-in-out infinite;
    }

    @keyframes progressShine {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    /* Episode Controls */
    .episode-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .ep-btn {
      padding: 0.4rem;
      min-width: unset;
      border-radius: var(--radius-sm);
    }
    .ep-btn .material-symbols-outlined {
      font-size: 1.1rem;
    }
    .ep-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      pointer-events: none;
    }

    .ep-count {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
      font-variant-numeric: tabular-nums;
      min-width: 3rem;
      text-align: center;
    }

    /* Actions */
    .item-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: auto;
      flex-wrap: wrap;
    }

    .action-btn {
      font-size: 0.8rem;
      padding: 0.45rem 0.85rem;
      gap: 0.35rem;
    }
    .action-btn .material-symbols-outlined {
      font-size: 1rem;
    }
    .action-btn.danger:hover {
      border-color: rgba(255, 23, 68, 0.4);
      background: rgba(255, 23, 68, 0.1);
      color: var(--danger);
    }

    .action-label {
      font-size: 0.8rem;
    }

    /* Status Dropdown */
    .status-dropdown-wrapper {
      position: relative;
    }

    .status-dropdown {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 0;
      min-width: 200px;
      border-radius: var(--radius-md);
      padding: 0.35rem;
      z-index: 50;
      animation: dropdownIn 0.2s ease;
    }

    @keyframes dropdownIn {
      from { opacity: 0; transform: translateY(6px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .dropdown-option {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      width: 100%;
      padding: 0.65rem 0.85rem;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-secondary);
      font-family: var(--font-body);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition-fast);
      text-align: left;
    }
    .dropdown-option:hover {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-primary);
    }
    .dropdown-option.current {
      color: var(--primary);
    }
    .dropdown-option .material-symbols-outlined {
      font-size: 1.15rem;
    }

    .check-icon {
      margin-left: auto;
      font-size: 1rem !important;
      color: var(--success);
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: backdropIn 0.2s ease;
      padding: 1rem;
    }

    @keyframes backdropIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-dialog {
      max-width: 420px;
      width: 100%;
      padding: 2rem;
      border-radius: var(--radius-lg);
      text-align: center;
      animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.9) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-icon-wrapper {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(255, 23, 68, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
    }

    .modal-icon {
      font-size: 2rem;
      color: var(--danger);
    }

    .modal-title {
      font-family: var(--font-heading);
      font-size: 1.25rem;
      margin-bottom: 0.6rem;
    }

    .modal-text {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-bottom: 1.75rem;
      line-height: 1.55;
    }
    .modal-text strong {
      color: var(--text-primary);
    }

    .modal-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
    }

    .danger-btn {
      background: var(--danger) !important;
      color: #fff !important;
    }
    .danger-btn:hover {
      background: #d32f2f !important;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .page-header h1 {
        font-size: 1.75rem;
      }

      .tab-label {
        display: none;
      }

      .tab-btn {
        padding: 0.75rem;
        gap: 0.35rem;
      }

      .list-item {
        flex-direction: column;
        align-items: stretch;
      }

      .poster-link {
        width: 100%;
        height: 160px;
      }

      .poster-img {
        min-height: unset;
      }

      .action-label {
        display: none;
      }

      .status-dropdown {
        left: auto;
        right: 0;
      }
    }
  `]
})
export class MyListComponent {
  private watchlist = inject(WatchlistService);

  readonly AnimeStatus = AnimeStatus;

  readonly tabs: Tab[] = [
    { key: AnimeStatus.WATCHING, label: 'Viendo', icon: 'play_circle' },
    { key: AnimeStatus.WATCHED, label: 'Visto', icon: 'check_circle' },
    { key: AnimeStatus.PLAN_TO_WATCH, label: 'Por Ver', icon: 'schedule' }
  ];

  readonly statusOptions = [
    { value: AnimeStatus.WATCHING, label: 'Viendo', icon: 'play_circle' },
    { value: AnimeStatus.WATCHED, label: 'Visto', icon: 'check_circle' },
    { value: AnimeStatus.PLAN_TO_WATCH, label: 'Por Ver', icon: 'schedule' }
  ];

  activeTab = signal<AnimeStatus>(AnimeStatus.WATCHING);
  searchQuery = signal('');
  openDropdownId = signal<number | null>(null);
  itemToRemove = signal<WatchlistItem | null>(null);

  totalItems = computed(() => this.watchlist.items().length);

  private activeItems = computed(() => {
    switch (this.activeTab()) {
      case AnimeStatus.WATCHING:
        return this.watchlist.watching();
      case AnimeStatus.WATCHED:
        return this.watchlist.watched();
      case AnimeStatus.PLAN_TO_WATCH:
        return this.watchlist.planToWatch();
      default:
        return [];
    }
  });

  filteredItems = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const items = this.activeItems();
    if (!query) return items;
    return items.filter(item => item.title.toLowerCase().includes(query));
  });

  getTabCount(tab: AnimeStatus): number {
    switch (tab) {
      case AnimeStatus.WATCHING:
        return this.watchlist.watching().length;
      case AnimeStatus.WATCHED:
        return this.watchlist.watched().length;
      case AnimeStatus.PLAN_TO_WATCH:
        return this.watchlist.planToWatch().length;
      default:
        return 0;
    }
  }

  getProgressPercentage(item: WatchlistItem): number {
    if (!item.totalEpisodes || item.totalEpisodes === 0) {
      return item.watchedEpisodes > 0 ? 50 : 0;
    }
    return Math.round((item.watchedEpisodes / item.totalEpisodes) * 100);
  }

  incrementEpisode(item: WatchlistItem, event: Event): void {
    event.stopPropagation();
    this.watchlist.updateProgress(item.animeId, item.watchedEpisodes + 1);
  }

  decrementEpisode(item: WatchlistItem, event: Event): void {
    event.stopPropagation();
    this.watchlist.updateProgress(item.animeId, item.watchedEpisodes - 1);
  }

  toggleDropdown(animeId: number, event: Event): void {
    event.stopPropagation();
    this.openDropdownId.update(current => current === animeId ? null : animeId);
  }

  changeStatus(animeId: number, status: AnimeStatus, event: Event): void {
    event.stopPropagation();
    this.watchlist.updateStatus(animeId, status);
    this.openDropdownId.set(null);
  }

  confirmRemove(item: WatchlistItem, event: Event): void {
    event.stopPropagation();
    this.itemToRemove.set(item);
  }

  cancelRemove(): void {
    this.itemToRemove.set(null);
  }

  executeRemove(): void {
    const item = this.itemToRemove();
    if (item) {
      this.watchlist.removeFromWatchlist(item.animeId);
      this.itemToRemove.set(null);
    }
  }

  constructor() {
    // Close dropdown on outside click
    if (typeof document !== 'undefined') {
      document.addEventListener('click', () => {
        this.openDropdownId.set(null);
      });
    }
  }
}
