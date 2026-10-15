# Security and publication boundary

## Excluded local artifacts

Local data/ contains a contract-level extract with beneficiary/contract identifiers and financial attributes, plus derived exports. Local models/ contains fitted binary models generated from company data. They are excluded from public Git.

The original notebook contained saved query outputs and a database connection configured with a literal password. It remains local and is excluded. notebooks/MLStage_public.ipynb is a sanitized copy: outputs are cleared and connection parameters are read from environment variables.

## Safe handling

- Keep real Excel files, DWH dumps, source extracts, credentials, and fitted artifacts outside Git.
- Use local environment variables for notebook database access; never commit a password or connection string.
- Review git status and the staged file list before each public push.
- Treat pickle/joblib files as executable input; load only trusted artifacts.
- The API has no production authentication and currently allows all CORS origins.

