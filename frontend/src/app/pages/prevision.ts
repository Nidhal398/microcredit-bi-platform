import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { ApiService, ReponsePrevision, messageErreur } from '../api.service';

Chart.register(...registerables);

interface LignePrevue { mois: string; centre: number; bas: number; haut: number; }

/** Les noms de colonnes du CSV de prévision ne sont pas imposés : on repère bas / haut par leur nom, sinon par ordre de valeur. */
function lire(p: ReponsePrevision): LignePrevue[] {
  return p.prevision.map(row => {
    const cles = Object.keys(row).filter(k => k !== 'mois');
    const val = (k: string) => Number(row[k]);
    const kBas = cles.find(k => /(inf|low|bas|min)/i.test(k));
    const kHaut = cles.find(k => /(sup|up|haut|max|high)/i.test(k));
    const kCentre = cles.find(k => k !== kBas && k !== kHaut);
    if (kBas && kHaut && kCentre) return { mois: row.mois, centre: val(kCentre), bas: val(kBas), haut: val(kHaut) };
    const t = cles.map(val).sort((a, b) => a - b);
    return { mois: row.mois, bas: t[0], centre: t[Math.floor(t.length / 2)], haut: t[t.length - 1] };
  });
}

@Component({
  selector: 'app-prevision',
  imports: [DecimalPipe],
  template: `
    <div class="page-heading">
      <div><span class="eyebrow">TENDANCE DU PORTEFEUILLE</span><h1>Prévision des contrats</h1>
        <p class="lead">Historique mensuel et projection avec intervalle de confiance à 80 %.</p></div>
    </div>

    @if (erreur()) { <div class="alerte erreur">{{ erreur() }}</div> }
    @if (!data() && !erreur()) { <p class="vide">Chargement…</p> }

    @if (data(); as d) {
      <div class="alerte info forecast-note">
        Cette projection a été calculée pour mai à juillet 2023 à partir de l’historique disponible jusqu’en avril 2023.
        Elle illustre la méthode et ne constitue pas une prévision actuelle.
      </div>
      <div class="card pad">
        <h2>Contrats par mois</h2>
        <div class="graphe"><canvas #cv aria-label="Courbe de prévision du nombre de contrats" role="img"></canvas></div>
      </div>

      <div class="card pad" style="margin-top: 16px">
        <h2>Valeurs prévues</h2>
        <div class="defil">
          <table>
            <thead><tr><th>Mois</th><th class="num">Prévu</th><th class="num">Bas (80 %)</th><th class="num">Haut (80 %)</th></tr></thead>
            <tbody>
              @for (l of lignes(); track l.mois) {
                <tr>
                  <td>{{ l.mois }}</td>
                  <td class="num">{{ l.centre | number: '1.0-0' }}</td>
                  <td class="num">{{ l.bas | number: '1.0-0' }}</td>
                  <td class="num">{{ l.haut | number: '1.0-0' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="alerte info" style="margin-top: 12px">{{ d.avertissement }}</div>
      </div>
    }
  `,
})
export class Prevision {
  private api = inject(ApiService);
  data = signal<ReponsePrevision | null>(null);
  lignes = signal<LignePrevue[]>([]);
  erreur = signal('');
  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('cv');
  private chart?: Chart;

  constructor() {
    this.api.getPrevision().subscribe({
      next: d => { this.lignes.set(lire(d)); this.data.set(d); },
      error: e => this.erreur.set(messageErreur(e)),
    });
    effect(() => {
      const d = this.data(); const c = this.canvas();
      if (d && c) this.dessiner(c.nativeElement, d);
    });
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }

  private dessiner(cv: HTMLCanvasElement, d: ReponsePrevision) {
    this.chart?.destroy();
    const prev = this.lignes();
    const h = d.historique;
    const labels = [...h.map(x => x.mois), ...prev.map(x => x.mois)];
    const vide = (n: number) => Array<number | null>(n).fill(null);
    const dernier = h.length ? h[h.length - 1].nb_contrats : null;
    const jonction = (vals: number[]) => [...vide(Math.max(h.length - 1, 0)), dernier, ...vals];

    this.chart = new Chart(cv, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: '_bas', data: jonction(prev.map(p => p.bas)), borderWidth: 0, pointRadius: 0, fill: false },
          { label: 'Intervalle à 80 %', data: jonction(prev.map(p => p.haut)), borderWidth: 0, pointRadius: 0,
            fill: '-1', backgroundColor: 'rgba(233, 162, 59, 0.25)' },
          { label: 'Historique', data: [...h.map(x => x.nb_contrats), ...vide(prev.length)],
            borderColor: '#0E7278', backgroundColor: '#0E7278', borderWidth: 2, pointRadius: 2, tension: 0.2 },
          { label: 'Prévision', data: jonction(prev.map(p => p.centre)),
            borderColor: '#D2A24C', backgroundColor: '#D2A24C', borderWidth: 2, borderDash: [6, 4], pointRadius: 4, tension: 0.2 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, spanGaps: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { filter: i => i.text !== '_bas', color: '#536B78' } } },
        scales: {
          x: { ticks: { color: '#536B78', maxTicksLimit: 12 }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: '#536B78' }, grid: { color: '#D7E1E8' } },
        },
      },
    });
  }
}

