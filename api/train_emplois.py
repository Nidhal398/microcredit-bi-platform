"""Entraîne et évalue le classifieur d'emplois avec une séparation temporelle.

Depuis la racine du projet :
    python -m api.train_emplois

Le test final correspond aux 12 derniers mois disponibles. Le modèle est
ensuite réentraîné sur tout l'historique pour le déploiement. Seules des
agrégations anonymisées sont exportées pour afficher les contrats comparables.
"""
from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, balanced_accuracy_score, f1_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
MODELS = ROOT / "models"
NUM = ["montant_tnd", "NEMPEXT", "annee", "trimestre", "mois"]
CAT = ["activite_grp", "gouvernorat", "CREACT"]
FEATURES = NUM + CAT
TARGET = "emplois_cl"
CLASSES = (0, 1, 2)
AMOUNT_BINS = [0, 3000, 5000, 7500, 10000, 15000, 20000.61, np.inf]
AMOUNT_LABELS = ["<3 000", "3 000–4 999", "5 000–7 499", "7 500–9 999", "10 000–14 999", "15 000–20 000", ">20 000"]
EMPLOYEE_LABELS = ["0", "1", "2–3", "4+"]


def make_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        [
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scale", StandardScaler())]), NUM),
            ("cat", Pipeline([
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]), CAT),
        ]
    )


def make_candidates() -> dict[str, object]:
    return {
        "Random Forest équilibrée": RandomForestClassifier(
            n_estimators=300, min_samples_leaf=5, class_weight="balanced",
            random_state=42, n_jobs=1,
        ),
        "Régression logistique équilibrée": LogisticRegression(
            max_iter=1500, class_weight="balanced", random_state=42,
        ),
    }


def metrics(y_true: pd.Series, y_pred: np.ndarray) -> dict[str, float]:
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "f1_macro": float(f1_score(y_true, y_pred, labels=CLASSES, average="macro", zero_division=0)),
    }


def build_cohorts(df: pd.DataFrame) -> None:
    data = df[FEATURES + [TARGET]].copy()
    data["tranche_montant"] = pd.cut(
        data["montant_tnd"], bins=AMOUNT_BINS, labels=AMOUNT_LABELS,
        right=False, include_lowest=True,
    ).astype("string")
    data["tranche_emplois_existants"] = pd.cut(
        data["NEMPEXT"], bins=[-1, 0, 1, 3, np.inf], labels=EMPLOYEE_LABELS,
    ).astype("string")
    levels = [
        (1, ["activite_grp", "gouvernorat", "CREACT", "tranche_montant", "tranche_emplois_existants"]),
        (2, ["activite_grp", "gouvernorat", "CREACT", "tranche_montant"]),
        (3, ["activite_grp", "gouvernorat", "CREACT"]),
        (4, ["activite_grp", "gouvernorat"]),
        (5, ["activite_grp", "CREACT"]),
        (6, ["activite_grp"]),
    ]
    exports = []
    for level, keys in levels:
        tab = data.groupby(keys + [TARGET], observed=True, dropna=False).size().unstack(TARGET, fill_value=0)
        for c in CLASSES:
            if c not in tab.columns:
                tab[c] = 0
        tab = tab[list(CLASSES)]
        tab["effectif"] = tab.sum(axis=1)
        tab = tab.reset_index()
        tab.insert(0, "niveau", level)
        tab = tab.rename(columns={c: f"classe_{c}" for c in CLASSES})
        exports.append(tab)
    out = pd.concat(exports, ignore_index=True, sort=False)
    out.to_csv(DATA / "emplois_cohortes.csv", index=False, encoding="utf-8")


def main() -> None:
    MODELS.mkdir(exist_ok=True)
    df = pd.read_pickle(DATA / "contrats_ml.pkl").copy()
    df["date_contrat"] = pd.to_datetime(df["date_contrat"], errors="coerce")
    df = df.dropna(subset=FEATURES + [TARGET, "date_contrat"])
    df[TARGET] = df[TARGET].astype(int).clip(upper=2)
    df["annee"] = df["date_contrat"].dt.year
    df["trimestre"] = df["date_contrat"].dt.quarter
    df["mois"] = df["date_contrat"].dt.month
    df = df.sort_values("date_contrat").reset_index(drop=True)

    date_max = df["date_contrat"].max().normalize()
    date_test_debut = date_max - pd.DateOffset(years=1) + pd.Timedelta(days=1)
    date_validation_debut = date_test_debut - pd.DateOffset(years=1)
    train = df[df["date_contrat"] < date_validation_debut]
    validation = df[(df["date_contrat"] >= date_validation_debut) & (df["date_contrat"] < date_test_debut)]
    developpement = df[df["date_contrat"] < date_test_debut]
    test = df[df["date_contrat"] >= date_test_debut]
    if min(len(train), len(validation), len(test)) == 0:
        raise ValueError("Historique insuffisant pour créer deux périodes temporelles de validation.")

    scores_validation = {}
    for nom, estimator in make_candidates().items():
        pipe = Pipeline([("prep", make_preprocessor()), ("model", estimator)])
        pipe.fit(train[FEATURES], train[TARGET])
        scores_validation[nom] = metrics(validation[TARGET], pipe.predict(validation[FEATURES]))
    # Choix sur la période de validation uniquement ; le test final reste indépendant.
    nom_choisi = max(scores_validation, key=lambda n: (scores_validation[n]["balanced_accuracy"], scores_validation[n]["f1_macro"]))

    candidates = make_candidates()
    pipe_test = Pipeline([("prep", make_preprocessor()), ("model", candidates[nom_choisi])])
    pipe_test.fit(developpement[FEATURES], developpement[TARGET])
    metriques_test = metrics(test[TARGET], pipe_test.predict(test[FEATURES]))
    baseline = np.full(len(test), int(developpement[TARGET].mode().iloc[0]))

    final_model = Pipeline([("prep", make_preprocessor()), ("model", candidates[nom_choisi])])
    final_model.fit(df[FEATURES], df[TARGET])
    evaluation = {
        "nom_modele": nom_choisi,
        "validation": {
            "debut": validation["date_contrat"].min().date().isoformat(),
            "fin": validation["date_contrat"].max().date().isoformat(),
            "n": int(len(validation)),
            "candidats": scores_validation,
        },
        "test_temporel": {
            "debut": test["date_contrat"].min().date().isoformat(),
            "fin": test["date_contrat"].max().date().isoformat(),
            "n_train": int(len(developpement)),
            "n_test": int(len(test)),
            "modele": metriques_test,
            "baseline_classe_majoritaire": metrics(test[TARGET], baseline),
        },
        "date_min": df["date_contrat"].min().date().isoformat(),
        "date_max": date_max.date().isoformat(),
        "n_total": int(len(df)),
        "distribution_cible": {str(k): int(v) for k, v in df[TARGET].value_counts().sort_index().items()},
        "borne_montant_tnd": {"min": float(df["montant_tnd"].min()), "max": float(df["montant_tnd"].max())},
        "borne_emplois_existants": {"min": int(df["NEMPEXT"].min()), "max": int(df["NEMPEXT"].max())},
    }
    joblib.dump({"model": final_model, "num": NUM, "cat": CAT, "classes": {0: "0 emploi", 1: "1 emploi", 2: "2 emplois ou plus"}, "evaluation": evaluation}, MODELS / "emplois_classif.joblib")
    build_cohorts(df)

    print(f"Modèle retenu après validation temporelle : {nom_choisi}")
    print(f"Validation : {evaluation['validation']['debut']} au {evaluation['validation']['fin']} ({len(validation)} contrats)")
    print(f"Test indépendant : {evaluation['test_temporel']['debut']} au {evaluation['test_temporel']['fin']} ({len(test)} contrats)")
    print("Modèle :", metriques_test)
    print("Référence classe majoritaire :", evaluation["test_temporel"]["baseline_classe_majoritaire"])
    print(f"Agrégats comparables écrits dans {DATA / 'emplois_cohortes.csv'}")


if __name__ == "__main__":
    main()

