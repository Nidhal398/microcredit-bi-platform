# Local model artifacts (not published)

Fitted model binaries are generated from company contract data and are excluded from public Git. The API loader expects these local files:

- montant_avec_taux.joblib
- montant_sans_taux.joblib
- emplois_classif.joblib
- segmentation.joblib

api/ uses scikit-learn 1.4.2 compatibility for the existing fitted artifacts. Treat joblib/pickle files as trusted executable input; never load model files from an untrusted source. The forecast API currently reads stored values from data/prevision_3_mois.csv; the saved prevision_arima.pkl is used by local analysis/training workflows, not loaded by the API route.

