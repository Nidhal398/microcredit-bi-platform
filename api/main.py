"""API FastAPI : prédictions du projet microcrédit.
Lancement (depuis le dossier du projet) :  uvicorn api.main:app --reload"""
from contextlib import asynccontextmanager
from datetime import date
from typing import Literal

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import ml_utils as ml

ETAT: dict = {"modeles": None, "listes": None, "erreur_chargement": None}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Charge les modèles ML au démarrage. En cas d'échec, l'API reste disponible
    mais retourne des erreurs 503 explicites sur les endpoints de prédiction."""
    try:
        ETAT["modeles"] = ml.charger_modeles()
        ETAT["listes"] = ml.listes_valeurs(ETAT["modeles"])
        ETAT["erreur_chargement"] = None
    except Exception as exc:
        ETAT["modeles"] = None
        ETAT["listes"] = None
        ETAT["erreur_chargement"] = str(exc)
        # L'API démarre quand même — les endpoints renverront 503
    yield


app = FastAPI(title="Microcrédit : API ML", version="1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)  # à restreindre en production


def _exiger_modeles():
    """Lève une 503 claire si les modèles n'ont pas pu être chargés."""
    if ETAT["modeles"] is None:
        detail = (
            f"Les modèles ML n'ont pas pu être chargés : {ETAT['erreur_chargement']}"
            if ETAT["erreur_chargement"]
            else "Les modèles ML ne sont pas encore disponibles."
        )
        raise HTTPException(503, detail=detail)


def verifier(activite: str, gouvernorat: str | None = None):
    _exiger_modeles()
    if activite not in ETAT["listes"]["activites"]:
        raise HTTPException(422, f"Activité inconnue : {activite}")
    if gouvernorat is not None and gouvernorat not in ETAT["listes"]["gouvernorats"]:
        raise HTTPException(422, f"Gouvernorat inconnu : {gouvernorat}")


class DemandeMontant(BaseModel):
    activite: str
    gouvernorat: str
    duree_mois: int = Field(ge=1, le=36)
    mois_grace: int = Field(0, ge=0, le=39)
    type_echeance: Literal["C", "V"]
    emplois_a_creer: int = Field(1, ge=0, le=24)
    emplois_existants: int = Field(1, ge=0, le=50)
    creation_activite: bool = False
    date_contrat: date = Field(ge=ml.DATE_CONTRAT_MIN, le=ml.DATE_CONTRAT_MAX)
    taux_annuel: float | None = Field(None, ge=15.12, le=26.4, description="Si fourni : le taux doit rester dans la plage observée à l'entraînement")


class DemandeEmplois(BaseModel):
    montant_tnd: float = Field(ge=500, le=20000.6)
    emplois_existants: int = Field(1, ge=0, le=50)
    date_contrat: date = Field(ge=ml.DATE_CONTRAT_MIN, le=ml.DATE_CONTRAT_MAX)
    activite: str
    gouvernorat: str
    creation_activite: bool = False


class DemandeSegment(BaseModel):
    montant_tnd: float = Field(ge=500, le=20000.6)
    duree_mois: int = Field(ge=1, le=36)
    teg: float = Field(ge=13.7, le=71.61)
    emplois_a_creer: int = Field(1, ge=0, le=24)
    emplois_existants: int = Field(1, ge=0, le=50)
    activite: str


@app.get("/health")
def health():
    """Statut de l'API et des modèles ML."""
    if ETAT["modeles"] is None:
        return {
            "statut": "degradé",
            "modeles": False,
            "erreur": ETAT["erreur_chargement"] or "Modèles non chargés",
        }
    return {
        "statut": "ok",
        "modeles": True,
        "modeles_disponibles": ["montant_a", "montant_b", "emplois", "segmentation"],
    }


@app.get("/meta")
def meta():
    """Retourne la liste des activités et gouvernorats acceptés."""
    _exiger_modeles()
    return ETAT["listes"]


@app.post("/predict/montant")
def predict_montant(p: DemandeMontant):
    verifier(p.activite, p.gouvernorat)
    avec_taux = p.taux_annuel is not None
    bundle = ETAT["modeles"]["montant_a" if avec_taux else "montant_b"]
    try:
        X = ml.ligne_montant(p, avec_taux, bundle)
        montant = float(bundle["model"].predict(X)[0])
    except Exception as exc:
        raise HTTPException(500, f"Erreur lors de la prédiction du montant : {exc}") from exc
    return {
        "montant_estime_tnd": round(max(montant, 0), -1),
        "modele": "avec taux" if avec_taux else "sans taux",
        "marge_indicative_tnd": ml.MAE_MONTANT_AVEC_TAUX if avec_taux else ml.MAE_MONTANT_SANS_TAUX,
        "periode_donnees": f"{ml.DATE_CONTRAT_MIN.isoformat()} au {ml.DATE_CONTRAT_MAX.isoformat()}",
        "avertissement": "Estimation d'un montant observé dans des contrats historiques similaires ; ce n'est ni un montant recommandé ni une évaluation de la capacité de remboursement.",
    }


@app.post("/predict/emplois")
def predict_emplois(p: DemandeEmplois):
    verifier(p.activite, p.gouvernorat)
    bundle = ETAT["modeles"]["emplois"]
    try:
        X = ml.ligne_emplois(p, bundle)
        pipe = bundle["model"]
        proba = pipe.predict_proba(X)[0]
        classes = [int(c) for c in pipe.named_steps["model"].classes_]
    except Exception as exc:
        raise HTTPException(500, f"Erreur lors de la prédiction emplois : {exc}") from exc
    return {
        "classe_probable": ml.NOMS_EMPLOIS[int(pipe.predict(X)[0])],
        "probabilites": {ml.NOMS_EMPLOIS[c]: round(float(pr), 3) for c, pr in zip(classes, proba)},
        "contrats_comparables": ml.cohortes_comparables(p, ETAT["modeles"]),
        "periode_donnees": f"{ml.DATE_CONTRAT_MIN.isoformat()} au {ml.DATE_CONTRAT_MAX.isoformat()}",
        "avertissement": "Estimation des emplois déclarés dans les contrats historiques, pas des emplois effectivement vérifiés ni un effet causal du crédit. Les probabilités du modèle sont indicatives.",
    }


@app.post("/segment")
def segment(p: DemandeSegment):
    verifier(p.activite)
    b = ETAT["modeles"]["segmentation"]
    try:
        X = ml.ligne_segment(p, b)
        etiquette = int(b["km"].predict(b["prep"].transform(X))[0])
    except Exception as exc:
        raise HTTPException(500, f"Erreur lors de la segmentation : {exc}") from exc
    profil = ml.profils_segments(ETAT["modeles"])[etiquette]
    return {
        "segment": profil["nom"],
        "profil": profil,
        "avertissement": "Profil descriptif de contrats historiques ; ce segment n'est pas un score de réussite, de risque ou de rentabilité.",
    }


@app.get("/prevision")
def prevision():
    """Retourne l'historique mensuel et la prévision sur 3 mois."""
    try:
        hist = pd.read_csv(ml.DONNEES / "serie_mensuelle.csv")
        prev = pd.read_csv(ml.DONNEES / "prevision_3_mois.csv", index_col=0)
    except FileNotFoundError as exc:
        raise HTTPException(503, f"Fichier de données manquant : {exc}") from exc
    except Exception as exc:
        raise HTTPException(500, f"Erreur lecture données prévision : {exc}") from exc
    return {
        "historique": [{"mois": str(r.iloc[0])[:7], "nb_contrats": int(r.iloc[1])} for _, r in hist.iterrows()],
        "prevision": [{"mois": str(i)[:7], **{k: float(v) for k, v in row.items()}} for i, row in prev.iterrows()],
        "avertissement": "Prévision indicative (erreur relative d'environ 38 %) ; intervalle à 80 %.",
    }

