"""Vérification locale des fonctions API sans dépendance TestClient/httpx2."""
from pydantic import ValidationError

from api.main import (
    ETAT,
    DemandeEmplois,
    DemandeMontant,
    DemandeSegment,
    health,
    meta,
    predict_emplois,
    predict_montant,
    segment,
)
from api import ml_utils as ml


ETAT["modeles"] = ml.charger_modeles()
ETAT["listes"] = ml.listes_valeurs(ETAT["modeles"])

assert health()["statut"] == "ok"
catalogue = meta()
activite = catalogue["activites"][0]
gouvernorat = catalogue["gouvernorats"][0]
date_valide = catalogue["date_max"]

emplois = predict_emplois(DemandeEmplois(
    montant_tnd=8000,
    emplois_existants=1,
    date_contrat=date_valide,
    activite=activite,
    gouvernorat=gouvernorat,
))
assert set(emplois["probabilites"]) == set(ml.NOMS_EMPLOIS.values())
assert emplois["contrats_comparables"]["effectif"] > 0
assert abs(sum(emplois["probabilites"].values()) - 1) < 0.01

montant = predict_montant(DemandeMontant(
    activite=activite,
    gouvernorat=gouvernorat,
    duree_mois=18,
    mois_grace=0,
    type_echeance="C",
    emplois_a_creer=1,
    emplois_existants=1,
    creation_activite=False,
    date_contrat=date_valide,
))
assert montant["montant_estime_tnd"] >= 0

profil = segment(DemandeSegment(
    montant_tnd=3000,
    duree_mois=15,
    teg=40,
    emplois_a_creer=1,
    emplois_existants=1,
    activite=activite,
))
assert profil["profil"]["effectif"] > 0

try:
    DemandeEmplois(
        montant_tnd=8000,
        date_contrat="2026-10-14",
        activite=activite,
        gouvernorat=gouvernorat,
    )
except ValidationError:
    pass
else:
    raise AssertionError("Une date hors de la période d'entraînement a été acceptée.")

print("API locale OK : santé, métadonnées, montant, emplois, comparables, segment et limite de date.")

