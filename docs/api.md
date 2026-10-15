# API reference

The application is api.main:app. Run locally on port 8000 with Uvicorn. /docs provides Swagger UI.

| Method | Route | Purpose |
|---|---|---|
| GET | /health | API and model load status |
| GET | /meta | Activity/governorate lists, date bounds, and employment evaluation metadata |
| POST | /predict/montant | Amount estimate with optional annual rate |
| POST | /predict/emplois | Declared-employment class, probabilities, and comparable-contract counts |
| POST | /segment | Descriptive segment profile |
| GET | /prevision | Monthly history and stored three-month forecast values |

Pydantic models validate fields and historical date/value ranges. The API loads artifacts at startup; if files are absent or fail to load, prediction endpoints are unavailable and /health reports degraded status.

Security boundary: the code is configured for local development, has no authentication, and currently allows all CORS origins. Do not expose this development API publicly without access control and restricted CORS.

