import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-accueil',
  imports: [RouterLink],
  template: `
    <section class="home-hero">
      <div class="home-hero-copy">
        <span class="eyebrow">DONNÉES · ANALYSE · DÉCISION</span>
        <h1>Pilotez votre portefeuille de microcrédits</h1>
        <p>Une vue claire des contrats, des tendances et des estimations fondées sur l’historique disponible.</p>
        <div class="home-period"><span class="period-dot"></span> Historique observé · juillet 2017 — mai 2023</div>
      </div>
      <div class="home-hero-mark" aria-hidden="true">
        <span class="mark-ring">MC</span>
        <span class="mark-caption">Microcrédit</span>
      </div>
    </section>

    <section class="home-kpis grille g4" aria-label="Indicateurs du portefeuille">
      @for (c of chiffres; track c.libelle) {
        <article class="card kpi">
          <div class="kpi-top"><span class="kpi-icon" aria-hidden="true">{{ c.icone }}</span><span class="libelle">{{ c.libelle }}</span></div>
          <div class="valeur">{{ c.valeur }}</div>
          <div class="note">{{ c.note }}</div>
        </article>
      }
    </section>

    <section class="home-actions">
      <div class="section-heading">
        <div><span class="eyebrow">ESPACE DE TRAVAIL</span><h2>Que souhaitez-vous explorer ?</h2></div>
        <span class="section-note">Choisissez une fonctionnalité pour commencer</span>
      </div>
      <div class="grille g3">
        @for (a of acces; track a.chemin) {
          <a class="card pad quick-card" [routerLink]="a.chemin">
            <span class="quick-icon" aria-hidden="true">{{ a.icone }}</span>
            <span class="quick-arrow" aria-hidden="true">↗</span>
            <h3>{{ a.titre }}</h3>
            <p>{{ a.texte }}</p>
          </a>
        }
      </div>
    </section>
  `,
})
export class Accueil {
  readonly chiffres = [
    { icone: '▦', libelle: 'Contrats', valeur: '13 632', note: 'Dossiers dans le Data Warehouse' },
    { icone: '◈', libelle: 'Montant initial', valeur: '109,4 M TND', note: 'Montants déclarés, convertis en TND' },
    { icone: '％', libelle: 'TEG moyen', valeur: '36,16 %', note: 'Sur 11 529 contrats renseignés' },
    { icone: '＋', libelle: 'Emplois nouveaux', valeur: '14 644', note: 'Déclarés à l’octroi, non vérifiés' },
  ];

  readonly acces = [
    {
      chemin: '/predictions', icone: '✦', titre: 'Explorer les estimations',
      texte: 'Comparer un dossier à l’historique et consulter les résultats des modèles.',
    },
    {
      chemin: '/previsions', icone: '↗', titre: 'Voir les tendances',
      texte: 'Parcourir l’évolution mensuelle et la projection historique des contrats.',
    },
    {
      chemin: '/dashboards', icone: '▥', titre: 'Analyser le portefeuille',
      texte: 'Accéder aux tableaux de bord interactifs et filtrer les indicateurs.',
    },
  ];
}

