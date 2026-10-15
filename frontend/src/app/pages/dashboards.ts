import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

export const POWERBI_EMBED_URL: string =
  'https://app.powerbi.com/reportEmbed?reportId=5787f9b6-daad-4590-b7da-e5f543e03f87&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730';

const PAGES = [
  { titre: 'Vue d’ensemble', image: 'dashboards/vue-ensemble.png' },
  { titre: 'Portefeuille', image: 'dashboards/portefeuille.png' },
  { titre: 'Produits', image: 'dashboards/produits.png' },
  { titre: 'Géographie', image: 'dashboards/geographie.png' },
];

@Component({
  selector: 'app-dashboards',
  template: `
    <section class="dashboard-page" [class.dashboard-expanded]="pleinEcran()">
      <div class="dashboard-heading">
        <div>
          <span class="eyebrow">ANALYSE DU PORTEFEUILLE</span>
          <h1>Tableaux de bord</h1>
          <p class="lead">Explorez les indicateurs et les tendances du portefeuille de microcrédits.</p>
        </div>
        <button type="button" class="dashboard-zoom" (click)="agrandir()" [attr.aria-pressed]="pleinEcran()">
          <span aria-hidden="true">{{ pleinEcran() ? '↙' : '↗' }}</span>
          {{ pleinEcran() ? 'Réduire' : 'Agrandir le rapport' }}
        </button>
      </div>

      @if (urlSure(); as u) {
        <div class="dashboard-frame-wrap">
          <iframe class="dashboard-frame" [src]="u" title="Rapport Power BI du portefeuille de microcrédits"
                  allowfullscreen loading="eager"></iframe>
        </div>
      } @else {
        @if (urlInvalide) {
          <div class="alerte erreur">Le lien du rapport Power BI doit commencer par https://app.powerbi.com/.</div>
        }
        <div class="onglets dashboard-tabs" role="tablist" aria-label="Pages du rapport">
          @for (p of pages; track p.titre; let i = $index) {
            <button type="button" class="onglet" [class.sel]="actif() === i" (click)="choisir(i)">{{ p.titre }}</button>
          }
        </div>
        @if (manquante()) {
          <div class="card dashboard-empty">
            <span class="empty-icon" aria-hidden="true">▥</span>
            <h2>Rapport en préparation</h2>
            <p>Ajoutez l’export de cette page dans <code>frontend/public/{{ pages[actif()].image }}</code>.</p>
          </div>
        } @else {
          <img class="dashboard-image" [src]="pages[actif()].image" [alt]="'Page ' + pages[actif()].titre"
               (error)="manquante.set(true)">
        }
      }
    </section>
  `,
})
export class Dashboards {
  private san = inject(DomSanitizer);
  readonly pages = PAGES;
  actif = signal(0);
  manquante = signal(false);
  pleinEcran = signal(false);
  readonly urlInvalide = POWERBI_EMBED_URL !== '' && !POWERBI_EMBED_URL.startsWith('https://app.powerbi.com/');
  urlSure = computed(() =>
    POWERBI_EMBED_URL && !this.urlInvalide ? this.san.bypassSecurityTrustResourceUrl(POWERBI_EMBED_URL) : null);

  choisir(i: number) { this.actif.set(i); this.manquante.set(false); }
  agrandir() { this.pleinEcran.update(value => !value); }

  @HostListener('document:keydown.escape')
  fermerPleinEcran() { this.pleinEcran.set(false); }
}

