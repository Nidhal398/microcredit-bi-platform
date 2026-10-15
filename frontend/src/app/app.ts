import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {
  readonly liens = [
    { chemin: '/',            libelle: 'Accueil',      exact: true  },
    { chemin: '/predictions', libelle: 'Prédictions',  exact: false },
    { chemin: '/previsions',  libelle: 'Prévision',    exact: false },
    { chemin: '/methode',     libelle: 'Méthode',      exact: false },
    { chemin: '/dashboards',  libelle: 'Tableaux de bord', exact: false },
  ];
}

