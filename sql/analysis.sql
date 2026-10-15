-- Read-only aggregate examples for the public(dimensions + fact) DWH.
-- No person-level identifiers or contract numbers are selected.
-- MINITIAL and CMR are divided by 1,000 to match the Power BI measures;
-- validate this unit convention against the IMF data-flow guide before reuse.

-- 1. Monthly contract activity and initial amount, using contract date.
SELECT
    d.annee,
    d.mois,
    d.nom_mois,
    COUNT(*) AS fact_rows,
    COUNT(DISTINCT f.contract_id) AS distinct_contracts,
    ROUND((SUM(f."MINITIAL") / 1000.0)::numeric, 2) AS initial_amount_tnd
FROM public.fact_contract AS f
JOIN public.dim_date AS d
  ON d.date_id = f.date_contract_id
GROUP BY d.annee, d.mois, d.nom_mois
ORDER BY d.annee, d.mois;

-- 2. Portfolio by financed contract activity and governorate.
SELECT
    COALESCE(a.LIBELLE, 'Non renseignée') AS contract_activity,
    COALESCE(g.LIB_GOUVERNORAT, 'Non renseigné') AS governorate,
    COUNT(*) AS fact_rows,
    COUNT(DISTINCT f.contract_id) AS distinct_contracts,
    ROUND((SUM(f."MINITIAL") / 1000.0)::numeric, 2) AS initial_amount_tnd,
    ROUND(AVG(f."NTXTEG")::numeric, 2) AS mean_teg_source_units
FROM public.fact_contract AS f
LEFT JOIN public.dim_activite_contract AS a
  ON a."Activite_Contrat_ID" = f."Activite_Contrat_ID"
LEFT JOIN public.dim_geographique AS g
  ON g.geo_id = f.geo_id
GROUP BY a.LIBELLE, g.LIB_GOUVERNORAT
ORDER BY initial_amount_tnd DESC NULLS LAST;

-- 3. Declared new employment by financed activity.
-- This is the value declared on the contract, not verified employment impact.
SELECT
    COALESCE(a.LIBELLE, 'Non renseignée') AS contract_activity,
    COUNT(*) AS fact_rows,
    SUM(COALESCE(f.NEMPNV, 0)) AS declared_new_jobs,
    SUM(COALESCE(f.NEMPEXT, 0)) AS declared_existing_jobs,
    ROUND(
        (SUM(f."MINITIAL") / 1000.0)
        / NULLIF(SUM(COALESCE(f.NEMPNV, 0)), 0),
        2
    ) AS amount_per_declared_new_job_tnd
FROM public.fact_contract AS f
LEFT JOIN public.dim_activite_contract AS a
  ON a."Activite_Contrat_ID" = f."Activite_Contrat_ID"
GROUP BY a.LIBELLE
ORDER BY declared_new_jobs DESC;

-- 4. Distribution of the declared NEMPNV field; keep NULL as its own category.
SELECT
    f.NEMPNV AS declared_new_jobs_value,
    COUNT(*) AS fact_rows,
    ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 2) AS percent_of_rows
FROM public.fact_contract AS f
GROUP BY f.NEMPNV
ORDER BY f.NEMPNV NULLS FIRST;

-- 5. Check whether contract_id is unique in the fact table.
-- The exported DDL makes fact_contract_id unique, not contract_id.
SELECT COUNT(*) AS duplicate_contract_id_groups
FROM (
    SELECT f.contract_id
    FROM public.fact_contract AS f
    GROUP BY f.contract_id
    HAVING COUNT(*) > 1
) AS duplicates;

-- 6. Count unmatched dimensional keys. geo_id and date_radiation_id are nullable,
-- so NULL is excluded from the unmatched count for those optional references.
SELECT 'contract_id -> dim_contract.contract_id' AS relationship, COUNT(*) AS unmatched_rows
FROM public.fact_contract AS f
LEFT JOIN public.dim_contract AS d ON d.contract_id = f.contract_id
WHERE d.contract_id IS NULL
UNION ALL
SELECT 'BENEFICIAIRE_ID -> dim_beneficiaire.BENEFICIAIRE_ID', COUNT(*)
FROM public.fact_contract AS f
LEFT JOIN public.dim_beneficiaire AS d ON d."BENEFICIAIRE_ID" = f."BENEFICIAIRE_ID"
WHERE d."BENEFICIAIRE_ID" IS NULL
UNION ALL
SELECT 'forme_credit_id -> dim_forme_credit.forme_credit_id', COUNT(*)
FROM public.fact_contract AS f
LEFT JOIN public.dim_forme_credit AS d ON d.forme_credit_id = f.forme_credit_id
WHERE d.forme_credit_id IS NULL
UNION ALL
SELECT 'nature_id -> dim_natures_credits.nature_id', COUNT(*)
FROM public.fact_contract AS f
LEFT JOIN public.dim_natures_credits AS d ON d.nature_id = f.nature_id
WHERE d.nature_id IS NULL
UNION ALL
SELECT 'periodicite_id -> dim_periodicite.periodicite_id', COUNT(*)
FROM public.fact_contract AS f
LEFT JOIN public.dim_periodicite AS d ON d.periodicite_id = f.periodicite_id
WHERE d.periodicite_id IS NULL
UNION ALL
SELECT 'Activite_Contrat_ID -> dim_activite_contract.Activite_Contrat_ID', COUNT(*)
FROM public.fact_contract AS f
LEFT JOIN public.dim_activite_contract AS d ON d."Activite_Contrat_ID" = f."Activite_Contrat_ID"
WHERE d."Activite_Contrat_ID" IS NULL
UNION ALL
SELECT 'date_contract_id -> dim_date.date_id', COUNT(*)
FROM public.fact_contract AS f
LEFT JOIN public.dim_date AS d ON d.date_id = f.date_contract_id
WHERE d.date_id IS NULL
UNION ALL
SELECT 'date_debloc_id -> dim_date.date_id', COUNT(*)
FROM public.fact_contract AS f
LEFT JOIN public.dim_date AS d ON d.date_id = f.date_debloc_id
WHERE f.date_debloc_id IS NOT NULL AND d.date_id IS NULL
UNION ALL
SELECT 'date_prem_ech_id -> dim_date.date_id', COUNT(*)
FROM public.fact_contract AS f
LEFT JOIN public.dim_date AS d ON d.date_id = f.date_prem_ech_id
WHERE d.date_id IS NULL
UNION ALL
SELECT 'date_dern_ech_id -> dim_date.date_id', COUNT(*)
FROM public.fact_contract AS f
LEFT JOIN public.dim_date AS d ON d.date_id = f.date_dern_ech_id
WHERE d.date_id IS NULL
UNION ALL
SELECT 'date_radiation_id -> dim_date.date_id', COUNT(*)
FROM public.fact_contract AS f
LEFT JOIN public.dim_date AS d ON d.date_id = f.date_radiation_id
WHERE f.date_radiation_id IS NOT NULL AND d.date_id IS NULL
UNION ALL
SELECT 'geo_id -> dim_geographique.geo_id', COUNT(*)
FROM public.fact_contract AS f
LEFT JOIN public.dim_geographique AS d ON d.geo_id = f.geo_id
WHERE f.geo_id IS NOT NULL AND d.geo_id IS NULL
ORDER BY relationship;

-- 7. Aggregate contract totals by credit form; labels come from the reference table.
SELECT
    COALESCE(c."LIBELLE", 'Non renseignée') AS credit_form,
    COUNT(*) AS fact_rows,
    COUNT(DISTINCT f.contract_id) AS distinct_contracts,
    ROUND((SUM(f."MINITIAL") / 1000.0)::numeric, 2) AS initial_amount_tnd,
    ROUND(AVG(f."NECH")::numeric, 2) AS mean_installment_count
FROM public.fact_contract AS f
LEFT JOIN public.dim_forme_credit AS c
  ON c.forme_credit_id = f.forme_credit_id
GROUP BY c."LIBELLE"
ORDER BY initial_amount_tnd DESC NULLS LAST;

-- No overdue/default KPI is provided: this schema has no payment-event history.
