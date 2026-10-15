"""Fonctions communes : chargement des modèles et préparation des variables.
Les règles de préparation reprennent exactement celles des notebooks."""
from pathlib import Path
from datetime import date

import joblib
import numpy as np
import pandas as pd

RACINE = Path(__file__).resolve().parent.parent
MODELES = RACINE / "models"
DONNEES = RACINE / "data"

# Période réellement couverte par les contrats utilisés pour l'entraînement.
# Les modèles montant et emplois utilisent des variables calendaires : ne pas
# accepter une date située hors de cette plage (extrapolation non évaluée).
DATE_CONTRAT_MIN = date(2017, 7, 4)
DATE_CONTRAT_MAX = date(2023, 5, 11)

# Activités regroupées en « Autres » à l'entraînement (moins de 100 contrats)
ACTIVITES_RARES = {"Pêche", "Artisanat"}

# Erreurs moyennes mesurées en validation croisée (notebook 01_montant), en TND
MAE_MONTANT_AVEC_TAUX = 1944
MAE_MONTANT_SANS_TAUX = 2969

NOMS_EMPLOIS = {0: "0 emploi", 1: "1 emploi", 2: "2 emplois ou plus"}
NOMS_SEGMENTS = {
    0: "Microcrédits de petit montant",
    1: "Crédits moyens à durée courte",
    2: "Crédits de montant élevé, davantage d’emplois déclarés",
    3: "Crédits moyens à durée standard",
}
LIBELLES_COHORTES = {
    1: "Même activité, gouvernorat, création, tranche de montant et tranche d’emplois existants",
    2: "Même activité, gouvernorat, création et tranche de montant",
    3: "Même activité, gouvernorat et création d’activité",
    4: "Même activité et gouvernorat",
    5: "Même activité et création d’activité, tous gouvernorats",
    6: "Même activité, tous gouvernorats",
}


def charger_modeles() -> dict:
    return {
        "montant_a": joblib.load(MODELES / "montant_avec_taux.joblib"),
        "montant_b": joblib.load(MODELES / "montant_sans_taux.joblib"),
        "emplois": joblib.load(MODELES / "emplois_classif.joblib"),
        "segmentation": joblib.load(MODELES / "segmentation.joblib"),
        "cohortes_emplois": pd.read_csv(DONNEES / "emplois_cohortes.csv", encoding="utf-8"),
        "profils_segments": pd.read_csv(DONNEES / "profil_segments.csv", encoding="utf-8"),
    }


def groupe_activite(activite: str) -> str:
    return "Autres" if activite in ACTIVITES_RARES else activite


def _categories(bundle: dict, colonne: str) -> list[str]:
    prep = bundle["model"].named_steps["prep"] if "model" in bundle else bundle["prep"]
    encodeur = prep.named_transformers_["cat"]
    if hasattr(encodeur, "named_steps"):
        encodeur = encodeur.named_steps["onehot"]
    return [str(c) for c in encodeur.categories_[bundle["cat"].index(colonne)]]


def listes_valeurs(modeles: dict) -> dict:
    b = modeles["emplois"]
    activites = [a for a in _categories(b, "activite_grp") if a != "Autres"] + sorted(ACTIVITES_RARES)
    return {
        "activites": sorted(set(activites)),
        "gouvernorats": _categories(b, "gouvernorat"),
        "date_min": DATE_CONTRAT_MIN.isoformat(),
        "date_max": DATE_CONTRAT_MAX.isoformat(),
        "evaluation_emplois": b.get("evaluation"),
        "borne_montant_tnd": (b.get("evaluation") or {}).get("borne_montant_tnd", {"min": 500, "max": 20000.6}),
        "borne_emplois_existants": (b.get("evaluation") or {}).get("borne_emplois_existants", {"min": 0, "max": 50}),
        "effectif_total": (b.get("evaluation") or {}).get("n_total"),
    }


def tranche_montant(montant_tnd: float) -> str:
    bornes = [0, 3000, 5000, 7500, 10000, 15000, 20000.61, float("inf")]
    libelles = ["<3 000", "3 000–4 999", "5 000–7 499", "7 500–9 999", "10 000–14 999", "15 000–20 000", ">20 000"]
    for bas, haut, libelle in zip(bornes[:-1], bornes[1:], libelles):
        if bas <= montant_tnd < haut:
            return libelle
    return libelles[-1]


def tranche_emplois_existants(nombre: int) -> str:
    if nombre == 0:
        return "0"
    if nombre == 1:
        return "1"
    if nombre <= 3:
        return "2–3"
    return "4+"


def cohortes_comparables(p, bundle: dict) -> dict:
    """Retourne l'effectif et la distribution historique d'une cohorte agrégée."""
    table = bundle["cohortes_emplois"]
    act = groupe_activite(p.activite)
    creation = "O" if p.creation_activite else "N"
    contextes = {
        "activite_grp": act,
        "gouvernorat": p.gouvernorat,
        "CREACT": creation,
        "tranche_montant": tranche_montant(p.montant_tnd),
        "tranche_emplois_existants": tranche_emplois_existants(p.emplois_existants),
    }
    selection = None
    niveau_retenu = 6
    for niveau in range(1, 7):
        groupe = table[table["niveau"] == niveau]
        filtres = ["activite_grp", "gouvernorat"]
        if niveau in (1, 2, 3):
            filtres.append("CREACT")
        if niveau in (1, 2):
            filtres.append("tranche_montant")
        if niveau == 1:
            filtres.append("tranche_emplois_existants")
        for colonne in filtres:
            groupe = groupe[groupe[colonne].astype(str) == str(contextes[colonne])]
        if not groupe.empty:
            selection = groupe.iloc[0]
            niveau_retenu = niveau
            if int(selection["effectif"]) >= 10 or niveau == 6:
                break
    if selection is None:
        return {"effectif": 0, "niveau": "aucun dossier comparable trouvé", "distribution_observee": {}}
    n = int(selection["effectif"])
    distribution = {
        NOMS_EMPLOIS[c]: {
            "effectif": int(selection.get(f"classe_{c}", 0)),
            "part": round(float(selection.get(f"classe_{c}", 0)) / n, 3) if n else 0.0,
        }
        for c in (0, 1, 2)
    }
    return {
        "effectif": n,
        "niveau": LIBELLES_COHORTES[niveau_retenu],
        "distribution_observee": distribution,
        "minimum_indicatif": 10,
    }


def profils_segments(modeles: dict) -> dict[int, dict]:
    profils = {}
    for _, row in modeles["profils_segments"].iterrows():
        i = int(row["segment"])
        profils[i] = {
            "nom": NOMS_SEGMENTS.get(i, f"Segment {i + 1}"),
            "effectif": int(row["n"]),
            "part_pct": float(row["part_%"]),
            "montant_median_tnd": float(row["montant_med"]),
            "duree_mediane_mois": float(row["duree_med"]),
            "teg_moyen_pct": float(row["teg_moy"]),
            "emplois_declares_moyens": float(row["emplois_nv"]),
            "activite_dominante": str(row["activite_dominante"]),
            "part_activite_dominante_pct": float(row["part_activite_%"]),
        }
    return profils


def ligne_montant(p, avec_taux: bool, bundle: dict) -> pd.DataFrame:
    ligne = {
        "NECH": p.duree_mois, "NMOISGRACE": p.mois_grace,
        "NTXINTANN": p.taux_annuel if avec_taux else np.nan,
        "NEMPEXT": p.emplois_existants, "NEMPNV": p.emplois_a_creer,
        "delai_debloc_j": np.nan,                     # imputé par la médiane d'entraînement
        "annee": p.date_contrat.year, "trimestre": (p.date_contrat.month - 1) // 3 + 1,
        "mois": p.date_contrat.month,
        "TECH": p.type_echeance, "activite_grp": groupe_activite(p.activite),
        "gouvernorat": p.gouvernorat, "CREACT": "O" if p.creation_activite else "N",
    }
    return pd.DataFrame([ligne])[bundle["num"] + bundle["cat"]]


def ligne_emplois(p, bundle: dict) -> pd.DataFrame:
    ligne = {
        "montant_tnd": p.montant_tnd, "NEMPEXT": p.emplois_existants,
        "annee": p.date_contrat.year, "trimestre": (p.date_contrat.month - 1) // 3 + 1,
        "mois": p.date_contrat.month, "activite_grp": groupe_activite(p.activite),
        "gouvernorat": p.gouvernorat, "CREACT": "O" if p.creation_activite else "N",
    }
    return pd.DataFrame([ligne])[bundle["num"] + bundle["cat"]]


def ligne_segment(p, bundle: dict) -> pd.DataFrame:
    ligne = {
        "log_montant": np.log1p(p.montant_tnd), "NECH": p.duree_mois, "NTXTEG": p.teg,
        "emp_nv": min(p.emplois_a_creer, 5), "emp_ext": min(p.emplois_existants, 5),
        "activite_grp": groupe_activite(p.activite),
    }
    return pd.DataFrame([ligne])[bundle["num"] + bundle["cat"]]

