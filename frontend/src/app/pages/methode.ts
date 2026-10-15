import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ApiService, EvaluationEmplois, messageErreur } from '../api.service';

@Component({
  selector: 'app-methode',
  imports: [DecimalPipe],
  template: `
    <h1>Méthode</h1>
    <p class="lead">Objectifs, données utilisées et limites des estimations.</p>

    <section class="card pad">
      <h2>1. Classe d’emplois déclarés</h2>
      <p>Le modèle estime la classe NEMPNV déclarée au contrat : 0, 1 ou 2 emplois et plus. Il utilise le montant, les emplois existants, l’activité, le gouvernorat, la création d’activité et la date historique.</p>
      @if (evaluation(); as e) {
        <p>Apprentissage : {{ e.n_total | number }} contrats du {{ e.date_min }} au {{ e.date_max }}. Modèle retenu après validation : {{ e.nom_modele }}.</p>
        <h3>Test temporel tenu à l’écart</h3>
        <p>Entraînement sur {{ e.test_temporel.n_train | number }} contrats ; test sur {{ e.test_temporel.n_test | number }} contrats du {{ e.test_temporel.debut }} au {{ e.test_temporel.fin }}.</p>
        <div class="defil">
          <table>
            <thead><tr><th>Mesure</th><th>Modèle</th><th>Référence « toujours 1 »</th></tr></thead>
            <tbody>
              <tr><td>Exactitude globale</td><td>{{ e.test_temporel.modele.accuracy | number: '1.3-3' }}</td><td>{{ e.test_temporel.baseline_classe_majoritaire.accuracy | number: '1.3-3' }}</td></tr>
              <tr><td>Exactitude équilibrée</td><td>{{ e.test_temporel.modele.balanced_accuracy | number: '1.3-3' }}</td><td>{{ e.test_temporel.baseline_classe_majoritaire.balanced_accuracy | number: '1.3-3' }}</td></tr>
              <tr><td>F1 macro</td><td>{{ e.test_temporel.modele.f1_macro | number: '1.3-3' }}</td><td>{{ e.test_temporel.baseline_classe_majoritaire.f1_macro | number: '1.3-3' }}</td></tr>
            </tbody>
          </table>
        </div>
        <p>La classe « 1 emploi » est majoritaire : la référence peut avoir une exactitude globale élevée tout en échouant sur les autres classes. Les trois mesures sont donc affichées ensemble.</p>
      } @else {
        <p class="vide">{{ erreur() || 'Chargement des métriques…' }}</p>
      }
      <div class="alerte info">Les probabilités sont indicatives. Elles décrivent les déclarations historiques, pas les emplois réellement vérifiés après financement. Le nombre et le profil des contrats comparables sont affichés avec chaque prédiction.</div>
    </section>

    <section class="card pad" style="margin-top: 16px">
      <h2>2. Estimation historique du montant</h2>
      <p>Le modèle estime un montant observé dans les contrats historiques à partir des caractéristiques renseignées. Le modèle avec taux a une MAE de validation croisée de 1 944 TND ; sans taux, 2 969 TND. Cette erreur moyenne n’est pas une marge garantie pour chaque dossier.</p>
      <p>Cette estimation n’est ni un montant recommandé, ni une décision d’octroi, ni une mesure de capacité de remboursement. Les dates proposées sont limitées à la période couverte par l’entraînement.</p>
    </section>

    <section class="card pad" style="margin-top: 16px">
      <h2>3. Segmentation descriptive</h2>
      <p>K-means répartit les contrats en quatre profils à partir du montant, de la durée, du TEG, des emplois déclarés et de l’activité. La silhouette observée est de 0,22 : la séparation est modérée et les groupes peuvent se recouvrir.</p>
      <p>Le résultat de la page Prédictions montre la taille, le montant médian, la durée médiane, le TEG moyen, les emplois déclarés moyens et l’activité dominante du groupe. Un segment n’est pas un score de réussite, d’impayé ou de rentabilité.</p>
    </section>

    <section class="card pad" style="margin-top: 16px">
      <h2>4. Prévision du nombre de contrats</h2>
      <p>La prévision ARIMA porte sur le volume mensuel de contrats. Elle est un indicateur de tendance, pas une prévision de risque ou de résultat d’un bénéficiaire. La dernière période disponible dans le DWH doit être rafraîchie avant un usage opérationnel actuel.</p>
    </section>

    <section class="card pad" style="margin-top: 16px">
      <h2>Limites et prochaines données utiles</h2>
      <ul class="simple">
        <li>L’historique des contrats utilisé pour les modèles s’arrête au 11 mai 2023. Les prédictions ne sont acceptées que dans la plage entraînée ; réentraîner les modèles après l’ajout de contrats récents.</li>
        <li>Les contrats comparables donnent un contexte historique et ne changent pas la prédiction du classifieur.</li>
        <li>Le DWH actuel ne contient pas de suivi exploitable des échéances payées ou en retard. Un modèle de défaut nécessite ces résultats observés, ainsi qu’une définition de la cible et de l’horizon.</li>
        <li>Une association apprise dans l’historique n’établit pas qu’un facteur cause la création d’emplois ou la réussite d’un projet.</li>
      </ul>
    </section>
  `,
})
export class Methode {
  private api = inject(ApiService);
  evaluation = signal<EvaluationEmplois | null>(null);
  erreur = signal('');

  constructor() {
    this.api.getMeta().subscribe({
      next: meta => this.evaluation.set(meta.evaluation_emplois ?? null),
      error: e => this.erreur.set(messageErreur(e)),
    });
  }
}

