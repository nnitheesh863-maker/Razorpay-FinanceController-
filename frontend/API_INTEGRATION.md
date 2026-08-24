# API Integration

This document outlines the API communication layer between the React frontend and the Express backend.

## Backend State Discovery
Upon inspecting the backend (`backend/src`), only a single initialization route exists:
- `GET /api/v1/health` (located in `backend/src/app.ts`)

**Important Note**: The transactions, invoices, payments, reconciliation, metrics, AI agent, and audit APIs have **not yet been implemented on the backend**. As per the strict integration requirements (*"Only create modules for APIs that actually exist in the backend. Do not invent endpoints"*), only the health check API has been connected in Phase 3.

## Base URL Configuration
The API base URL is controlled by the Vite environment variable:
- `VITE_API_BASE_URL=http://localhost:5000/api/v1`
- If omitted, it defaults to `http://localhost:5000/api/v1`

*Note: Environment files (`.env`, `.env.*`) have been explicitly added to `.gitignore` to prevent secret leakage.*

## Axios Client Configuration
The frontend uses a centralized Axios instance located at `src/api/axios.ts`.

### Features
- **Timeout**: 15 seconds
- **Request Interceptor**: Automatically attaches `Authorization: Bearer <token>` from localStorage if available. (Note: Full auth implementation is reserved for Phase 4).
- **Response Interceptor**: Intercepts error statuses (e.g., 401, 500) and extracts the normalized backend error message, preventing raw Axios stack traces from bubbling up to UI components.

## Available Endpoints

### Health API (`src/api/health.api.ts`)

#### Check Backend Health
- **Method**: `GET`
- **Endpoint**: `/health`
- **Frontend Function**: `checkBackendHealth()`

**Expected Response**
```json
{
  "success": true,
  "data": {
    "server": "healthy",
    "timestamp": "2026-08-24T10:00:00.000Z"
  },
  "message": "Operation successful"
}
```

## Error Handling
When the backend returns an error (e.g., HTTP 400), it expects the following response structure:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid parameters"
  }
}
```
The Axios interceptor extracts `error.message` or `message` and rethrows a standard Javascript Error containing that specific string. Components should display this error string to the user.

## Next Steps for Future Phases
As backend modules (Transactions, Invoices, Reconciliation, etc.) are actually built, their respective `.api.ts` files and `.types.ts` structures will be added to `src/api` and `src/types` respectively, adhering to the actual backend contract rather than assumptions.
