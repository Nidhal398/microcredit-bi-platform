# Angular web application

The frontend is an Angular 21 application in frontend/, with lazy-loaded routes:

- / — home page and portfolio summary
- /predictions — amount estimate, declared-employment class, and descriptive segment forms
- /previsions — monthly history and stored forecast visualization
- /methode — methods, evaluation metadata, and limitations
- /dashboards — Power BI report iframe

ApiService calls /meta, /predict/montant, /predict/emplois, /segment, and /prevision. proxy.conf.json forwards those requests to FastAPI on port 8000 during local development. Chart.js is used for charts.

The dashboard report is external to this repository. Four local screenshot paths are fallback content only; screenshot files were not present at audit time.

