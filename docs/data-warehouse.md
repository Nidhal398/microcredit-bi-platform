# PostgreSQL data warehouse

## Evidence available here

The sanitized ML notebook contains a SELECT from public.fact_contract and joins to dimensions for contract, beneficiary, education, profession, civil status, personal activity, contract activity, credit form, credit nature, payment periodicity, geography, and date roles. It derives a training extract with contract and beneficiary attributes.

The notebook output recorded 13,632 rows and unique contract IDs. The local derived extract is intentionally not included.

## Join paths shown in the notebook

The SQL uses joins from fact_contract.contract_id to dim_contract.contract_id and fact_contract.BENEFICIAIRE_ID to dim_beneficiaire.BENEFICIAIRE_ID; beneficiary keys to education, profession, civil-status, and personal-activity dimensions; and fact keys to contract-activity, credit-form, credit-nature, periodicity, geography, and date dimensions. Separate date roles are used for contract, disbursement, and radiation dates.

These are query join expressions, not proof that database constraints are declared.

## Talend evidence and remaining gaps

The local Talend Open Studio workspace was inspected read-only and contains 13 jobs for contract/beneficiary loading, reference dimensions, and `fact_contract`. See [etl.md](etl.md) for the inventory and components observed. The workspace confirms that Talend jobs exist, but it does not by itself prove successful execution or establish database constraints.

There is no DDL/schema export, database initialization script, or DWH dump in this repository. Exact primary/foreign-key constraints, measures, refresh strategy, and full field mappings cannot be verified here. Do not publish a real DWH backup or beneficiary-level data.

