# SQL assets

This folder contains a schema-only extract and read-only analysis examples based on the PostgreSQL DWH export. It does not contain the export itself or any beneficiary/contract rows.

## Files

- `schema.sql` — schema-only extract with 13 `CREATE TABLE` statements, the date-key identity definition, 13 primary keys, and 2 unique constraints. No `COPY`, `INSERT`, owner, login, password, or data statements are included.
- `analysis.sql` — read-only analytical queries for contract counts/amounts over time, activity and geography, declared employment, and referential-quality checks.

## Use and limits

Run `schema.sql` only against an empty PostgreSQL database, after reviewing it for your PostgreSQL version. The DDL reproduces the exported structure; it does not populate reference data or prove the ETL works.

`analysis.sql` is a collection of examples, not a migration or a production report. Review its unit assumptions and aggregation grain before running it. It deliberately avoids selecting names, beneficiary document numbers, or contract identifiers.

The original `DWH.sql` export includes 13 `COPY` blocks containing real rows. It stays outside this repository. Never commit it, raw beneficiary identifiers, contract extracts, or query results that can identify a person or disclose restricted company figures.

`fact_contract` contains amount, installment, rate/fee, insurance/tax, employment-declaration, and date/geography keys. The export declares primary/unique constraints but no foreign keys. The analytical script therefore includes anti-join checks rather than claiming referential integrity is enforced.

Power BI converts `MINITIAL` and `CMR` by dividing by 1,000 in its measures. Confirm the source unit against the IMF flow guide before using those amounts outside the report.

For field meanings, date roles, model joins, and KPI limitations, see [`docs/data-warehouse.md`](../docs/data-warehouse.md) and [`docs/powerbi.md`](../docs/powerbi.md).
