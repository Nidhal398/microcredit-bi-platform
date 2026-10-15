import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ApiService, Meta, ReponseEmplois, ReponseMontant, ReponseSegment, messageErreur,
} from '../api.service';

type Onglet = 'montant' | 'emplois' | 'segment';

@Component({
  selector: 'app-predictions',
  imports: [ReactiveFormsModule, DecimalPipe],
  template: `
    <h1>Prédictions</h1>
    <p class="lead">Renseignez un dossier et obtenez une estimation. Les résultats sont indicatifs.</p>

    @if (metaErreur()) { <div class="alerte erreur">{{ metaErreur() }}</div> }

    <div class="onglets" role="tablist">
      <button type="button" class="onglet" [class.sel]="onglet() === 'montant'" (click)="changer('montant')">Montant du crédit</button>
      <button type="button" class="onglet" [class.sel]="onglet() === 'emplois'" (click)="changer('emplois')">Emplois déclarés</button>
      <button type="button" class="onglet" [class.sel]="onglet() === 'segment'" (click)="changer('segment')">Segment du dossier</button>
    </div>

    <div class="split">
      <section class="card pad">
        @switch (onglet()) {

          @case ('montant') {
            <form [formGroup]="fMontant" (ngSubmit)="envoyer('montant')" novalidate>
              <div class="form-grille">
                <label class="champ"><span>Activité</span>
                  <select formControlName="activite"><option value="" disabled>Choisir</option>
                    @for (a of activites(); track a) { <option [value]="a">{{ a }}</option> }
                  </select>
                  <small class="aide" [class.err]="invalide(fMontant, 'activite')">Obligatoire</small>
                </label>
                <label class="champ"><span>Gouvernorat</span>
                  <select formControlName="gouvernorat"><option value="" disabled>Choisir</option>
                    @for (g of gouvernorats(); track g) { <option [value]="g">{{ g }}</option> }
                  </select>
                  <small class="aide" [class.err]="invalide(fMontant, 'gouvernorat')">Obligatoire</small>
                </label>
                <label class="champ"><span>Durée (mois)</span>
                  <input type="number" formControlName="duree_mois">
                  <small class="aide" [class.err]="invalide(fMontant, 'duree_mois')">De 1 à 36 (plage observée)</small>
                </label>
                <label class="champ"><span>Mois de grâce</span>
                  <input type="number" formControlName="mois_grace">
                  <small class="aide" [class.err]="invalide(fMontant, 'mois_grace')">De 0 à 39 (maximum observé)</small>
                </label>
                <label class="champ"><span>Type d’échéance</span>
                  <select formControlName="type_echeance">
                    <option value="C">C</option><option value="V">V</option>
                  </select>
                  <small class="aide">Code utilisé dans vos données</small>
                </label>
                <label class="champ"><span>Date du contrat (historique)</span>
                  <input type="date" formControlName="date_contrat" [min]="dateMin()" [max]="dateMax()">
                  <small class="aide" [class.err]="invalide(fMontant, 'date_contrat')">Période historique disponible : {{ dateMin() }} au {{ dateMax() }}</small>
                </label>
                <label class="champ"><span>Emplois à créer</span>
                  <input type="number" formControlName="emplois_a_creer">
                  <small class="aide" [class.err]="invalide(fMontant, 'emplois_a_creer')">De 0 à 24 (maximum observé)</small>
                </label>
                <label class="champ"><span>Emplois existants</span>
                  <input type="number" formControlName="emplois_existants">
                  <small class="aide" [class.err]="invalide(fMontant, 'emplois_existants')">De 0 à 50 (maximum observé)</small>
                </label>
                <label class="champ"><span>Taux annuel (%), facultatif</span>
                  <input type="number" step="0.01" formControlName="taux_annuel">
                  <small class="aide" [class.err]="invalide(fMontant, 'taux_annuel')">De 15,12 à 26,4 (plage observée)</small>
                </label>
                <label class="champ case"><input type="checkbox" formControlName="creation_activite"><span>Création d’activité</span></label>
              </div>
              <button class="btn" type="submit" [disabled]="enCours()">Estimer le montant</button>
            </form>
          }

          @case ('emplois') {
            <form [formGroup]="fEmplois" (ngSubmit)="envoyer('emplois')" novalidate>
              <div class="form-grille">
                <label class="champ"><span>Montant (TND)</span>
                  <input type="number" formControlName="montant_tnd" min="500" max="20000.6" step="0.1">
                  <small class="aide" [class.err]="invalide(fEmplois, 'montant_tnd')">Montant couvert par l’entraînement : 500 à 20 000,6 TND</small>
                </label>
                <label class="champ"><span>Emplois existants</span>
                  <input type="number" formControlName="emplois_existants">
                  <small class="aide" [class.err]="invalide(fEmplois, 'emplois_existants')">De 0 à 50 (plage observée)</small>
                </label>
                <label class="champ"><span>Activité</span>
                  <select formControlName="activite"><option value="" disabled>Choisir</option>
                    @for (a of activites(); track a) { <option [value]="a">{{ a }}</option> }
                  </select>
                  <small class="aide" [class.err]="invalide(fEmplois, 'activite')">Obligatoire</small>
                </label>
                <label class="champ"><span>Gouvernorat</span>
                  <select formControlName="gouvernorat"><option value="" disabled>Choisir</option>
                    @for (g of gouvernorats(); track g) { <option [value]="g">{{ g }}</option> }
                  </select>
                  <small class="aide" [class.err]="invalide(fEmplois, 'gouvernorat')">Obligatoire</small>
                </label>
                <label class="champ"><span>Date du contrat (historique)</span>
                  <input type="date" formControlName="date_contrat" [min]="dateMin()" [max]="dateMax()">
                  <small class="aide" [class.err]="invalide(fEmplois, 'date_contrat')">Période historique disponible : {{ dateMin() }} au {{ dateMax() }}</small>
                </label>
                <label class="champ case"><input type="checkbox" formControlName="creation_activite"><span>Création d’activité</span></label>
              </div>
              <button class="btn" type="submit" [disabled]="enCours()">Estimer les emplois déclarés</button>
            </form>
          }

          @case ('segment') {
            <form [formGroup]="fSegment" (ngSubmit)="envoyer('segment')" novalidate>
              <div class="form-grille">
                <label class="champ"><span>Montant (TND)</span>
                  <input type="number" formControlName="montant_tnd" min="500" max="20000.6" step="0.1">
                  <small class="aide" [class.err]="invalide(fSegment, 'montant_tnd')">De 500 à 20 000,6 TND (plage observée)</small>
                </label>
                <label class="champ"><span>Durée (mois)</span>
                  <input type="number" formControlName="duree_mois">
                  <small class="aide" [class.err]="invalide(fSegment, 'duree_mois')">De 1 à 36 mois</small>
                </label>
                <label class="champ"><span>TEG (%)</span>
                  <input type="number" step="0.01" formControlName="teg">
                  <small class="aide" [class.err]="invalide(fSegment, 'teg')">De 13,7 à 71,61 % (plage observée)</small>
                </label>
                <label class="champ"><span>Activité</span>
                  <select formControlName="activite"><option value="" disabled>Choisir</option>
                    @for (a of activites(); track a) { <option [value]="a">{{ a }}</option> }
                  </select>
                  <small class="aide" [class.err]="invalide(fSegment, 'activite')">Obligatoire</small>
                </label>
                <label class="champ"><span>Emplois à créer</span>
                  <input type="number" formControlName="emplois_a_creer">
                  <small class="aide" [class.err]="invalide(fSegment, 'emplois_a_creer')">De 0 à 24</small>
                </label>
                <label class="champ"><span>Emplois existants</span>
                  <input type="number" formControlName="emplois_existants">
                  <small class="aide" [class.err]="invalide(fSegment, 'emplois_existants')">De 0 à 50</small>
                </label>
              </div>
              <button class="btn" type="submit" [disabled]="enCours()">Trouver le segment</button>
            </form>
          }
        }
      </section>

      <aside class="card pad" aria-live="polite">
        <h2>Résultat</h2>
        @if (erreur()) { <div class="alerte erreur">{{ erreur() }}</div> }
        @if (enCours()) { <p class="vide">Calcul en cours…</p> }

        @switch (onglet()) {
          @case ('montant') {
            @if (resMontant(); as r) {
              <div class="resultat-valeur">{{ r.montant_estime_tnd | number: '1.0-0' }} TND</div>
              <p>Marge indicative : ± {{ r.marge_indicative_tnd | number: '1.0-0' }} TND (modèle {{ r.modele }}).</p>
              <div class="alerte info">{{ r.avertissement }}</div>
            } @else if (!erreur() && !enCours()) { <p class="vide">Remplissez le formulaire puis lancez l’estimation.</p> }
          }
          @case ('emplois') {
            @if (resEmplois(); as r) {
              <p>Classe la plus probable</p>
              <div class="pastille">{{ r.classe_probable }}</div>
              <p>Emplois déclarés estimés · données : {{ r.periode_donnees }}</p>
              <div style="margin-top: 16px">
                @for (l of lignesProba(); track l.nom; let i = $index) {
                  <div class="barre-ligne">
                    <span>{{ l.nom }}</span>
                    <div class="barre-fond"><div class="barre-rempli" [class.top]="i === 0" [style.width.%]="l.pct"></div></div>
                    <span>{{ l.pct | number: '1.0-0' }} %</span>
                  </div>
                }
              </div>
              <section class="card pad" style="margin-top: 16px">
                <h3>Contrats historiques comparables</h3>
                <p>{{ r.contrats_comparables.effectif | number: '1.0-0' }} dossiers · {{ r.contrats_comparables.niveau }}</p>
                @for (l of lignesComparables(); track l.nom) {
                  <p>{{ l.nom }} : {{ l.effectif }} ({{ l.part * 100 | number: '1.0-0' }} %)</p>
                }
                @if (r.contrats_comparables.effectif < 10) {
                  <p class="vide">Peu de dossiers comparables : interpréter cette estimation avec prudence.</p>
                }
              </section>
              <div class="alerte info">{{ r.avertissement }}</div>
            } @else if (!erreur() && !enCours()) { <p class="vide">Remplissez le formulaire puis lancez la prédiction.</p> }
          }
          @case ('segment') {
            @if (resSegment(); as r) {
              <p>Segment du dossier</p>
              <div class="pastille">{{ r.segment }}</div>
              <p>{{ r.profil.effectif | number: '1.0-0' }} contrats · {{ r.profil.part_pct | number: '1.0-1' }} % de l’historique</p>
              <ul class="simple">
                <li>Montant médian : {{ r.profil.montant_median_tnd | number: '1.0-0' }} TND</li>
                <li>Durée médiane : {{ r.profil.duree_mediane_mois | number: '1.0-0' }} mois</li>
                <li>TEG moyen : {{ r.profil.teg_moyen_pct | number: '1.0-1' }} %</li>
                <li>Emplois déclarés moyens : {{ r.profil.emplois_declares_moyens | number: '1.0-1' }}</li>
                <li>Activité dominante : {{ r.profil.activite_dominante }} ({{ r.profil.part_activite_dominante_pct | number: '1.0-0' }} %)</li>
              </ul>
              <div class="alerte info">{{ r.avertissement }}</div>
            } @else if (!erreur() && !enCours()) { <p class="vide">Remplissez le formulaire puis lancez la segmentation.</p> }
          }
        }
      </aside>
    </div>
  `,
})
export class Predictions {
  private api = inject(ApiService);
  private fb = inject(NonNullableFormBuilder);

  private meta = signal<Meta | null>(null);
  activites = computed(() => this.meta()?.activites ?? []);
  gouvernorats = computed(() => this.meta()?.gouvernorats ?? []);
  dateMin = computed(() => this.meta()?.date_min ?? '2017-07-04');
  dateMax = computed(() => this.meta()?.date_max ?? '2023-05-11');
  readonly DATE_MIN = '2017-07-04';
  readonly DATE_MAX = '2023-05-11';
  metaErreur = signal('');

  onglet = signal<Onglet>('montant');
  enCours = signal(false);
  erreur = signal('');
  resMontant = signal<ReponseMontant | null>(null);
  resEmplois = signal<ReponseEmplois | null>(null);
  resSegment = signal<ReponseSegment | null>(null);
  lignesProba = computed(() =>
    Object.entries(this.resEmplois()?.probabilites ?? {})
      .map(([nom, p]) => ({ nom, pct: p * 100 }))
      .sort((a, b) => b.pct - a.pct));
  lignesComparables = computed(() =>
    Object.entries(this.resEmplois()?.contrats_comparables.distribution_observee ?? {})
      .map(([nom, valeurs]) => ({ nom, ...valeurs })));

  private V = Validators;
  private dateDansPeriode = (c: AbstractControl) =>
    !c.value || (c.value >= this.DATE_MIN && c.value <= this.DATE_MAX)
      ? null : { dateHorsPeriode: true };

  fMontant = this.fb.group({
    activite: ['', this.V.required],
    gouvernorat: ['', this.V.required],
    duree_mois: [12, [this.V.required, this.V.min(1), this.V.max(36)]],
    mois_grace: [0, [this.V.required, this.V.min(0), this.V.max(39)]],
    type_echeance: ['C' as 'C' | 'V'],
    emplois_a_creer: [1, [this.V.required, this.V.min(0), this.V.max(24)]],
    emplois_existants: [1, [this.V.required, this.V.min(0), this.V.max(50)]],
    creation_activite: [false],
    date_contrat: [this.DATE_MAX, [this.V.required, this.dateDansPeriode]],
    taux_annuel: [null as number | null, [this.V.min(15.12), this.V.max(26.4)]],
  });
  fEmplois = this.fb.group({
    montant_tnd: [null as number | null, [this.V.required, this.V.min(500), this.V.max(20000.6)]],
    emplois_existants: [1, [this.V.required, this.V.min(0), this.V.max(50)]],
    date_contrat: [this.DATE_MAX, [this.V.required, this.dateDansPeriode]],
    activite: ['', this.V.required],
    gouvernorat: ['', this.V.required],
    creation_activite: [false],
  });
  fSegment = this.fb.group({
    montant_tnd: [null as number | null, [this.V.required, this.V.min(500), this.V.max(20000.6)]],
    duree_mois: [12, [this.V.required, this.V.min(1), this.V.max(36)]],
    teg: [null as number | null, [this.V.required, this.V.min(13.7), this.V.max(71.61)]],
    emplois_a_creer: [1, [this.V.required, this.V.min(0), this.V.max(24)]],
    emplois_existants: [1, [this.V.required, this.V.min(0), this.V.max(50)]],
    activite: ['', this.V.required],
  });

  constructor() {
    this.api.getMeta().subscribe({
      next: m => this.meta.set(m),
      error: e => this.metaErreur.set('Listes indisponibles. ' + messageErreur(e)),
    });
  }

  changer(o: Onglet) { this.onglet.set(o); this.erreur.set(''); }

  invalide(f: { get(n: string): AbstractControl | null }, nom: string): boolean {
    const c = f.get(nom);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  envoyer(o: Onglet) {
    const form = o === 'montant' ? this.fMontant : o === 'emplois' ? this.fEmplois : this.fSegment;
    if (form.invalid) { form.markAllAsTouched(); return; }
    this.enCours.set(true);
    this.erreur.set('');
    const fin = { error: (e: unknown) => { this.erreur.set(messageErreur(e)); this.enCours.set(false); } };

    if (o === 'montant') {
      this.api.predictMontant(this.fMontant.getRawValue())
        .subscribe({ next: r => { this.resMontant.set(r); this.enCours.set(false); }, ...fin });
    } else if (o === 'emplois') {
      const v = this.fEmplois.getRawValue();
      this.api.predictEmplois({ ...v, montant_tnd: Number(v.montant_tnd) })
        .subscribe({ next: r => { this.resEmplois.set(r); this.enCours.set(false); }, ...fin });
    } else {
      const v = this.fSegment.getRawValue();
      this.api.segment({ ...v, montant_tnd: Number(v.montant_tnd), teg: Number(v.teg) })
        .subscribe({ next: r => { this.resSegment.set(r); this.enCours.set(false); }, ...fin });
    }
  }
}

