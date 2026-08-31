# MR RAJPOOT STUDIO OBS 24/7
# DESTINATION MANAGER & SUPABASE VAULT FORENSIC AUDIT

## Executive Summary
This forensic audit investigated the root cause of the `duplicate key value violates unique constraint 'secrets_name_key'` / `secrets_name_idx` database error encountered during destination setup and resolved the destination architecture.

---

## 1. Root Cause Identification
- **Defect Location**: `00009_fix_vault_rpc.sql` (and `00002_vault_setup.sql`)
- **SQL Defect**:
  ```sql
  secret_name := 'rtmp_key_' || auth.uid()::text;
  SELECT vault.create_secret(key_value, secret_name, description) INTO new_secret_id;
  ```
- **PostgreSQL Constraint**: Supabase Vault's `vault.secrets` table enforces a `UNIQUE(name)` index (`secrets_name_idx`).
- **Failure Trigger**: When any authenticated user attempts to save a stream key for a second time (e.g. adding a secondary YouTube channel like "Crypto", updating existing credentials, or retrying a network timeout), `vault.create_secret` attempted to insert a row with the exact duplicate name `'rtmp_key_' || auth.uid()`, causing PostgreSQL to abort with error code `23505` (Conflict).

---

## 2. Forensic Findings & Resolutions

| Area | Prior Defect | Implemented Solution | Status |
|---|---|---|---|
| **Vault Secret Naming** | Hardcoded to static user ID string | Idempotent secret name scoping (`rtmp_<userId>_<uuid>`) | **FIXED** |
| **Error Handling** | Raw Postgres constraint string dumped to UI | `normalizeDestinationError` friendly translation + existing secret linking | **FIXED** |
| **Multi-User Isolation** | Prone to global collision if names matched | Isolated to `auth.uid()` and unique Vault identifiers | **VERIFIED** |
| **Multi-Destination** | User could only have 1 destination before crashing | Users can configure and manage multiple independent destinations | **VERIFIED** |
| **UI Light Theme** | Inconsistent dark/light modal contrast | Redesigned with semantic tokens (`bg-surface-1`, `border-border`, etc.) | **VERIFIED** |
| **Password Visibility** | Obscured input with no inspection toggle | Added Show/Hide Eye toggle (`<Eye />` / `<EyeOff />`) | **VERIFIED** |
| **Security Communication** | Generic text | Clear AES-256 Vault storage security banner | **VERIFIED** |
| **Active Streams** | No regression risk | Active streams preserve immutable snapshot credentials | **VERIFIED** |
