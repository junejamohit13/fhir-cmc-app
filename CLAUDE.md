# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Run Commands
- **Start HAPI FHIR Server**: `cd hapi-server && mvn spring-boot:run`
- **Start an Entity App**: `cd [cro|sponsor|regulator]-app && docker-compose up`
- **Frontend Dev**: `cd [entity]-app/frontend && npm start`
- **Backend Dev**: `cd [entity]-app/backend && uvicorn main:app --reload`
- **Run Frontend Tests**: `cd [entity]-app/frontend && npm test`
- **Run Backend Tests**: `cd [entity]-app/backend && pytest`
- **Destroy AWS Resources**: `cd terraform/environments/[entity] && terraform destroy -auto-approve`

## Code Style Guidelines
- **Python**: Use FastAPI patterns, type hints, Pydantic models, proper error handling with try/except
- **JavaScript/React**: Use functional components, Material UI styling, React Router for navigation
- **FHIR**: Follow HAPI JPA conventions for Java code, use proper FHIR resource types and references
- **Docker**: Each entity (CRO, Sponsor, Regulator) has its own containers for FHIR, backend, frontend
- **Error Handling**: Log errors with contextual information, return appropriate HTTP status codes
- **API Communication**: Use standard HTTP requests between services, proper JSON/FHIR formatting

## Infrastructure Configuration
- **FHIR Domains**: The terraform configuration now supports dedicated domains for FHIR servers using the `fhir_domain_name` variable
- **URL Format**: FHIR URLs are configured as `https://${fhir_domain_name}/fhir` if provided, falling back to `https://${domain_name}/fhir`
- **Examples**: 
  - Sponsor: `sponsor-fhir.cmc-fhir-demo.com`
  - CRO: `cro-fhir.example.com`
- **Implementation**: Added variables, Route53 records, and updated ECS environment variables to use the dedicated FHIR domains

## Recent Changes
- Added support for dedicated FHIR subdomains for both sponsor and CRO environments
- Updated Terraform configuration to allow different URLs for FHIR servers
- Updated environment variables to use the new FHIR-specific domains when available
- Ensured backward compatibility for deployments without dedicated FHIR domains