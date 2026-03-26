# Changelog

All notable changes to this project will be documented in this file.

## 0.2.0 - 2026-03-24

### Features

- Expand agent management with editable detail views, faster client-side detail loading, and direct config updates
- Improve agent creation flow with stronger defaults, generated persona/bootstrap drafts, and simplified sub-agent behavior
- Refresh dashboard and agent list presentation for clearer status, workspace, and telemetry visibility
- Prepare internal chat runtime, API routes, and streaming plumbing while keeping the Chat entry disabled in the product UI

### Fixes

- Fix Turbopack NFT tracing warnings for release builds by tightening route tracing and runtime imports
- Reduce slow page transitions by moving heavy agent detail data loading off the initial server render

### Documentation

- Update release metadata for the 0.2.0 production release

## 0.1.0 - 2026-03-24

### Features

- Add OpenClaw Gateway onboarding flow with auto-detect and manual connection modes
- Add dashboard overview with gateway status, token trends, and agent analysis views
- Add agent management pages with listing, creation, sync feedback, and status display
- Add gateway settings page for refresh, reconnect, disconnect, and runtime inspection
- Add product README with feature overview, setup steps, and screenshot mapping

### Documentation

- Document first public release structure and usage flow
