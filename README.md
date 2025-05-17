# fhir-cmc-app

This repository contains a proof-of-concept for sharing CMC stability data
between a sponsor, contract research organisation (CRO) and regulator.  Each
party runs their own HAPI FHIR server.  The sponsor application now produces
FHIR resources that follow the [HL7 Stability IG](https://build.fhir.org/ig/HL7/uv-dx-pq/stability.html).

## FHIR resource mapping

* **Protocols** are stored as `PlanDefinition` resources using the
  `PlanDefinition-drug-pq` profile.  The protocol `subjectReference` points to a
  `MedicinalProductDefinition` representing the product under test.
* **Medicinal products** are created as `MedicinalProductDefinition` resources
  and referenced from both `Medication` (test batches) and `PlanDefinition`.
* **Batches** are represented by `Medication` resources.  Each batch now also
  contains an `ingredient.itemReference` to its `MedicinalProductDefinition` for
  clearer linkage.
* **Stability tests** are `ActivityDefinition` resources.  Actions within a
  protocol reference these tests via `definitionCanonical`.  Tests reference the
  measurements they produce using the standard
  `observationResultRequirement` field and any sample requirements via
  `specimenRequirement`.

The project contains separate frontend and backend applications in the
`sponsor-app`, `cro-app` and `regulator-app` folders.  Each backend is built with
FastAPI and communicates with its respective FHIR server.
