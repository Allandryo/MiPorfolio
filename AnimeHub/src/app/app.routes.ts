import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/catalog/catalog.component').then(m => m.CatalogComponent),
    title: 'AnimeHub — Explora Anime'
  },
  {
    path: 'search',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'anime/:id',
    loadComponent: () =>
      import('./features/details/details.component').then(m => m.DetailsComponent),
    title: 'AnimeHub — Detalles'
  },
  {
    path: 'my-list',
    loadComponent: () =>
      import('./features/my-list/my-list.component').then(m => m.MyListComponent),
    title: 'AnimeHub — Mi Lista'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
