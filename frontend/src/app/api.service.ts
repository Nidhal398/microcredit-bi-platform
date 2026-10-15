import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Meta {
  activites: string[];
  gouvernorats: string[];
  date_min: string;
  date_max: string;
  evaluation_emplois?: EvaluationEmplois | null;
  borne_montant_tnd?: { min: number; max: number };
  borne_emplois_existants?: { min: number; max: number };
  effectif_total?: number | null;
}

export interface MetriquesClassification {
  accuracy: number;
  balanced_accuracy: number;
  f1_macro: number;
}
export interface EvaluationEmplois {
  nom_modele: string;
  validation: { debut: string; fin: string; n: number; candidats: Record<string, MetriquesClassification> };
  test_temporel: {
    debut: string; fin: string; n_train: number; n_test: number;
    modele: MetriquesClassification;
    baseline_classe_majoritaire: MetriquesClassification;
  };
  date_min: string; date_max: string; n_total: number;
  distribution_cible: Record<string, number>;
}

export interface DemandeMontant {
  activite: string;
  gouvernorat: string;
  duree_mois: number;
  mois_grace: number;
  type_echeance: 'C' | 'V';
  emplois_a_creer: number;
  emplois_existants: number;
  creation_activite: boolean;
  date_contrat: string; // AAAA-MM-JJ
  taux_annuel: number | null;
}
export interface ReponseMontant {
  montant_estime_tnd: number;
  modele: string;
  marge_indicative_tnd: number;
  avertissement: string;
  periode_donnees: string;
}

export interface DemandeEmplois {
  montant_tnd: number;
  emplois_existants: number;
  date_contrat: string;
  activite: string;
  gouvernorat: string;
  creation_activite: boolean;
}
export interface ReponseEmplois {
  classe_probable: string;
  probabilites: Record<string, number>;
  periode_donnees: string;
  contrats_comparables: {
    effectif: number;
    niveau: string;
    minimum_indicatif?: number;
    distribution_observee: Record<string, { effectif: number; part: number }>;
  };
  avertissement: string;
}

export interface DemandeSegment {
  montant_tnd: number;
  duree_mois: number;
  teg: number;
  emplois_a_creer: number;
  emplois_existants: number;
  activite: string;
}
export interface ReponseSegment {
  segment: string;
  profil: {
    effectif: number;
    part_pct: number;
    montant_median_tnd: number;
    duree_mediane_mois: number;
    teg_moyen_pct: number;
    emplois_declares_moyens: number;
    activite_dominante: string;
    part_activite_dominante_pct: number;
  };
  avertissement: string;
}

export interface PointHistorique { mois: string; nb_contrats: number; }
export type PointPrevision = { mois: string } & Record<string, number | string>;
export interface ReponsePrevision {
  historique: PointHistorique[];
  prevision: PointPrevision[];
  avertissement: string;
}

/** Transforme une erreur HTTP (dont les 422 de FastAPI) en message lisible. */
export function messageErreur(e: unknown): string {
  if (!(e instanceof HttpErrorResponse)) return 'Erreur inattendue.';
  if (e.status === 0) return 'Le service ne répond pas pour le moment. Réessayez dans quelques instants.';
  const d = e.error?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    return d.map((x: { loc?: unknown[]; msg?: string }) =>
      `${(x.loc ?? []).slice(1).join('.')} : ${x.msg ?? 'valeur invalide'}`).join(' | ');
  }
  return `Erreur ${e.status} : ${e.statusText || 'requête refusée'}`;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  getMeta(): Observable<Meta> { return this.http.get<Meta>('/meta'); }
  predictMontant(d: DemandeMontant): Observable<ReponseMontant> { return this.http.post<ReponseMontant>('/predict/montant', d); }
  predictEmplois(d: DemandeEmplois): Observable<ReponseEmplois> { return this.http.post<ReponseEmplois>('/predict/emplois', d); }
  segment(d: DemandeSegment): Observable<ReponseSegment> { return this.http.post<ReponseSegment>('/segment', d); }
  getPrevision(): Observable<ReponsePrevision> { return this.http.get<ReponsePrevision>('/prevision'); }
}

