import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Accueil', loadComponent: () => import('./pages/accueil').then(m => m.Accueil) },
  { path: 'predictions', title: 'Prédictions', loadComponent: () => import('./pages/predictions').then(m => m.Predictions) },
  { path: 'previsions', title: 'Prévision', loadComponent: () => import('./pages/prevision').then(m => m.Prevision) },
  { path: 'methode', title: 'Méthode', loadComponent: () => import('./pages/methode').then(m => m.Methode) },
  { path: 'dashboards', title: 'Tableaux de bord | Microcredit', loadComponent: () => import('./pages/dashboards').then(m => m.Dashboards) },
  { path: '**', redirectTo: '' },
];

