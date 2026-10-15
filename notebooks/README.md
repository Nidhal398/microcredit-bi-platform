# Notebook

MLStage_public.ipynb is a sanitized copy of the local analysis notebook. It contains SQL extraction and ML analysis code, but no saved cell outputs or literal database password. Configure these variables in the notebook process before running it:

- DWH_DB_USER
- DWH_DB_PASSWORD
- DWH_DB_HOST (defaults to localhost)
- DWH_DB_PORT (defaults to 5432)
- DWH_DB_NAME (defaults to DWH)

Install optional notebook dependencies from the repository root:

    python -m pip install -r requirements-notebook.txt

The notebook still requires an authorized PostgreSQL connection and private data. Never commit the original notebook, query results, or database credentials.

