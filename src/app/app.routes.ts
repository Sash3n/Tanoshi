import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'library',
    pathMatch: 'full',
  },
  {
    path: 'library',
    loadComponent: () =>
      import('./features/library/pages/library-page/library-page.component').then(
        (m) => m.LibraryPageComponent,
      ),
  },
  {
    path: 'series/:id',
    loadComponent: () =>
      import(
        './features/series-detail/pages/series-detail-page/series-detail-page.component'
      ).then((m) => m.SeriesDetailPageComponent),
  },
  {
    path: 'reader/:chapterId',
    loadComponent: () =>
      import('./features/reader/pages/reader-page/reader-page.component').then(
        (m) => m.ReaderPageComponent,
      ),
  },
  {
    path: 'collections',
    loadComponent: () =>
      import('./features/collections/pages/collections-page/collections-page.component').then(
        (m) => m.CollectionsPageComponent,
      ),
  },
  {
    path: 'collections/:id',
    loadComponent: () =>
      import(
        './features/collections/pages/collection-detail-page/collection-detail-page.component'
      ).then((m) => m.CollectionDetailPageComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/pages/settings-page/settings-page.component').then(
        (m) => m.SettingsPageComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'library',
  },
];
