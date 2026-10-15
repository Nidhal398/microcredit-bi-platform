-- PostgreSQL schema-only extract for the microcredit DWH.

-- Source: local DWH.sql export. This file intentionally contains no COPY/INSERT data.

-- The source export contains beneficiary and contract records; do not publish or distribute that dump.

-- This DDL describes structure, not validation of business meanings. Validate unit conventions before reusing measures.

-- Apply only to an empty database with PostgreSQL 16-compatible syntax.



CREATE TABLE public.dim_activite (
    "KACT" character varying,
    "LIBELLE" character varying,
    "Activite_Perso_ID" integer NOT NULL
);

CREATE TABLE public.dim_activite_contract (
    "KACT" character varying,
    "LIBELLE" character varying,
    "Activite_Contrat_ID" integer NOT NULL
);

CREATE TABLE public.dim_beneficiaire (
    "Activite_Perso_ID" integer,
    geo_id integer,
    education_id integer,
    profession_id integer,
    etat_civil_id integer,
    "NDOCID" character varying,
    "TYPDOC" character varying,
    "KLOC_P" character varying,
    "TOTDETTE" double precision,
    "TOTDETTEPERS" double precision,
    "BENEFICIAIRE_ID" integer NOT NULL
);

CREATE TABLE public.dim_contract (
    contract_id integer NOT NULL,
    "BRADIE" character varying,
    "CREACT" character varying,
    "NCONTRAT" character varying NOT NULL,
    "KFCRED_IMF" character varying,
    "KNAT_SC" character varying,
    "TYPDOC_G" character varying,
    "NDOCID_G" character varying,
    "KMODAMRT" character varying,
    "KMODPAIE" character varying
);

CREATE TABLE public.dim_date (
    date_id integer NOT NULL,
    date_complete date NOT NULL,
    jour integer NOT NULL,
    mois integer NOT NULL,
    nom_mois character varying(20),
    trimestre integer,
    annee integer NOT NULL,
    jour_semaine character varying(10)
);

CREATE TABLE public.dim_etat_civil (
    etat_civil_id integer NOT NULL,
    "KECIV" character varying,
    "LIBELLE" character varying
);

CREATE TABLE public.dim_forme_credit (
    "KFCRED" character varying,
    "LIBELLE" character varying,
    forme_credit_id integer NOT NULL
);

CREATE TABLE public.dim_geographique (
    geo_id integer NOT NULL,
    "KPOST" character varying NOT NULL,
    "KGOUV" character varying NOT NULL,
    "LIB_GOUVERNORAT" character varying,
    "KDEL" character varying,
    "LIB_DELEGATION" character varying
);

CREATE TABLE public.dim_natures_credits (
    "KNCRED" character varying,
    "LIBELLE" character varying,
    nature_id integer NOT NULL
);

CREATE TABLE public.dim_nib_education (
    "CODE" character varying,
    "LIBELLE" character varying,
    education_id integer NOT NULL
);

CREATE TABLE public.dim_periodicite (
    "KPER" character varying,
    "LIBELLE" character varying,
    periodicite_id integer NOT NULL
);

CREATE TABLE public.dim_profession (
    profession_id integer NOT NULL,
    "KPRO" character varying,
    "LIBELLE" character varying
);

CREATE TABLE public.fact_contract (
    fact_contract_id integer NOT NULL,
    "NTXFRAIS1" double precision,
    "NTXFRAIS2" double precision,
    "MINITIAL" double precision,
    "CMR" double precision,
    "NECH" integer,
    "TECH" character varying,
    "NMOISGRACE" integer,
    "NTXINTANN" double precision,
    "NTXTEG" double precision,
    "NTXFRAIS" double precision,
    "MFRAIS" double precision,
    "MASSUR" double precision,
    "MTVA" double precision,
    "NTXASSUR" double precision,
    "NTXEPARGNE" double precision,
    "NEMPEXT" integer,
    "NEMPNV" integer,
    contract_id integer NOT NULL,
    "BENEFICIAIRE_ID" integer NOT NULL,
    forme_credit_id integer NOT NULL,
    nature_id integer NOT NULL,
    periodicite_id integer NOT NULL,
    "Activite_Contrat_ID" integer NOT NULL,
    date_contract_id integer NOT NULL,
    geo_id integer,
    date_debloc_id integer NOT NULL,
    date_prem_ech_id integer NOT NULL,
    date_dern_ech_id integer NOT NULL,
    date_radiation_id integer
);

ALTER TABLE public.dim_date ALTER COLUMN date_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.dim_date_date_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE ONLY public.dim_beneficiaire
    ADD CONSTRAINT "DIM_BENEFICIAIRE_pkey1" PRIMARY KEY ("BENEFICIAIRE_ID");

ALTER TABLE ONLY public.dim_activite_contract
    ADD CONSTRAINT dim_activite_contract_pkey PRIMARY KEY ("Activite_Contrat_ID");

ALTER TABLE ONLY public.dim_activite
    ADD CONSTRAINT dim_activite_pkey PRIMARY KEY ("Activite_Perso_ID");

ALTER TABLE ONLY public.dim_contract
    ADD CONSTRAINT dim_contract_pkey PRIMARY KEY (contract_id);

ALTER TABLE ONLY public.dim_date
    ADD CONSTRAINT dim_date_date_complete_key UNIQUE (date_complete);

ALTER TABLE ONLY public.dim_date
    ADD CONSTRAINT dim_date_pkey PRIMARY KEY (date_id);

ALTER TABLE ONLY public.dim_etat_civil
    ADD CONSTRAINT dim_etat_civil_pkey PRIMARY KEY (etat_civil_id);

ALTER TABLE ONLY public.dim_forme_credit
    ADD CONSTRAINT dim_forme_credit_pkey PRIMARY KEY (forme_credit_id);

ALTER TABLE ONLY public.dim_geographique
    ADD CONSTRAINT dim_geographique_pkey PRIMARY KEY (geo_id);

ALTER TABLE ONLY public.dim_natures_credits
    ADD CONSTRAINT dim_natures_credits_pkey PRIMARY KEY (nature_id);

ALTER TABLE ONLY public.dim_nib_education
    ADD CONSTRAINT dim_nib_education_pkey PRIMARY KEY (education_id);

ALTER TABLE ONLY public.dim_periodicite
    ADD CONSTRAINT dim_periodicite_pkey PRIMARY KEY (periodicite_id);

ALTER TABLE ONLY public.dim_profession
    ADD CONSTRAINT dim_profession_pkey PRIMARY KEY (profession_id);

ALTER TABLE ONLY public.fact_contract
    ADD CONSTRAINT fact_contract_pkey PRIMARY KEY (fact_contract_id);

ALTER TABLE ONLY public.dim_beneficiaire
    ADD CONSTRAINT uq_benef UNIQUE ("TYPDOC", "NDOCID");