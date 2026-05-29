import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { WatchlistService } from '../../../core/services/watchlist.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar glass-panel">
      <div class="navbar-inner container">
        <a routerLink="/" class="brand">
          <span class="brand-icon material-symbols-outlined">movie_filter</span>
          <span class="brand-text">
            <span class="text-gradient">Anime</span><span class="brand-accent">Hub</span>
          </span>
        </a>

        <div class="nav-links" [class.open]="mobileOpen()">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link"
             (click)="closeMobile()">
            <span class="material-symbols-outlined">explore</span>
            Explorar
          </a>
          <a routerLink="/my-list" routerLinkActive="active" class="nav-link"
             (click)="closeMobile()">
            <span class="material-symbols-outlined">bookmark</span>
            Mi Lista
            @if (watchlistCountValue > 0) {
              <span class="nav-badge">{{ watchlistCountValue }}</span>
            }
          </a>
        </div>

        <button class="mobile-toggle" (click)="toggleMobile()" [attr.aria-label]="'Menu'">
          <span class="material-symbols-outlined">
            {{ mobileOpen() ? 'close' : 'menu' }}
          </span>
        </button>
      </div>
    </nav>

    @if (mobileOpen()) {
      <div class="mobile-backdrop" (click)="closeMobile()"></div>
    }
  `,
  styles: [`
    .navbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      border-bottom: 1px solid var(--border);
      border-radius: 0;
    }

    .navbar-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
      gap: 2rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      text-decoration: none;
      flex-shrink: 0;
    }

    .brand-icon {
      font-size: 1.75rem;
      color: var(--primary);
      font-variation-settings: 'FILL' 1;
    }

    .brand-text {
      font-family: var(--font-heading);
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .brand-accent {
      color: var(--text-secondary);
      font-weight: 600;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.55rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-secondary);
      text-decoration: none;
      transition: var(--transition-normal);
      position: relative;
      white-space: nowrap;

      .material-symbols-outlined {
        font-size: 1.2rem;
      }

      &:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.05);
      }

      &.active {
        color: #fff;
        background: var(--primary-subtle);
        border: 1px solid rgba(212, 168, 83, 0.2);

        .material-symbols-outlined {
          color: var(--primary);
        }
      }
    }

    .nav-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      height: 1.25rem;
      padding: 0 0.35rem;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      border-radius: var(--radius-full);
      font-size: 0.65rem;
      font-weight: 700;
      color: #0b0d11; // Dark text for amber gold badge
    }

    .mobile-toggle {
      display: none;
      background: none;
      border: none;
      color: var(--text-primary);
      cursor: pointer;
      padding: 0.5rem;
      border-radius: var(--radius-sm);

      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }

    .mobile-backdrop {
      display: none;
    }

    @media (max-width: 768px) {
      .mobile-toggle {
        display: flex;
      }

      .nav-links {
        position: fixed;
        top: 64px;
        left: 0;
        right: 0;
        flex-direction: column;
        background: rgba(10, 10, 12, 0.96);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid var(--border);
        padding: 1rem;
        gap: 0.35rem;
        transform: translateY(-120%);
        transition: transform 0.3s ease;
        z-index: 999;

        &.open {
          transform: translateY(0);
        }

        .nav-link {
          width: 100%;
          padding: 0.85rem 1rem;
        }
      }

      .mobile-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        top: 64px;
        background: rgba(0, 0, 0, 0.5);
        z-index: 998;
      }
    }
  `]
})
export class NavbarComponent {
  private watchlistService = inject(WatchlistService);

  mobileOpen = signal(false);
  watchlistCount = this.watchlistService.items;

  toggleMobile() {
    this.mobileOpen.update(v => !v);
  }

  closeMobile() {
    this.mobileOpen.set(false);
  }

  // Use length for the badge count
  get watchlistCountValue() {
    return this.watchlistService.items().length;
  }
}
