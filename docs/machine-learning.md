# Machine learning

## Data

The local extract is derived from the PostgreSQL microcredit warehouse and includes contract, beneficiary, geographic, financial, date, and declared-employment columns. Its 13,632 contract rows and model artifacts are not published. See data/README.md.

## Implemented objectives

### Historical credit amount estimation

The API offers two regressors: one accepts an annual rate, and one does not. The notebook reports five-fold cross-validation MAE of 1,944 TND with the rate and 2,969 TND without it. These are validation averages, not per-case guarantees, recommended credit amounts, or affordability estimates.

### Declared employment classification

api/train_emplois.py groups the target into 0, 1, and 2+ newly declared jobs and uses a chronological validation/test split. The API returns a predicted class, probabilities, and an aggregate of comparable contracts. The target is a contract declaration, not a verified job outcome or causal impact measure.

### Descriptive segmentation

The API assigns a dossier to one of four K-means profiles and returns descriptive profile statistics. This is exploratory segmentation, not a score of repayment risk, business success, or profitability.

### Monthly forecast

The API reads historical and three-month forecast values from local CSV files. It does not fit or refresh the forecast on each request. The API warning reports approximately 38% relative error and an 80% interval.

## Not implemented

The available extract does not provide a usable repayment-event target or verified activity outcomes. Default-risk, repayment-probability, business-survival, and realized employment-impact models are not implemented.

