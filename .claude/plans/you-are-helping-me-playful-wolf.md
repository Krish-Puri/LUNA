# Plan: Connect Frontend to Backend API

## Context

The backend is fully built and running on port 8000 with all CRUD endpoints for sessions, messages, users, and voice notes. The frontend currently uses mock data in Zustand stores. This plan replaces that mock data with real API calls so the app works end-to-end.

No authentication exists yet — the app will use a single default user stored in localStorage.

---

## Approach

### API Layer (`frontend/src/api/`)

Create a thin fetch-based API client:

```
frontend/src/api/
├── client.js       # Base fetch wrapper, base URL = http://localhost:8000
├── sessions.js     # GET/POST /api/sessions
├── messages.js     # GET/POST /api/messages
└── users.js        # POST/GET /api/users
```

### User Flow (No Auth)

- On app load, check `localStorage` for `luna_user_id`
- If missing, `POST /api/users/` with `{ email: "default@luna.app", name: "Luna User" }`, store returned `id` in localStorage
- All subsequent calls pass `user_id` as a query param

### Session Store Refactor (`sessionStore.js`)

Replace `generateMockSessions()` with:
- `fetchSessions(userId)` → `GET /api/sessions/?user_id=X`
- `createSession(userId)` → `POST /api/sessions/`
- `deleteSession(sessionId)` → `DELETE /api/sessions/{id}`
- Map backend `last_message_at` → compute `group` (today/yesterday/earlier) client-side
- Keep `preview`, `time`, `id`, `messages` from backend response

### Chat Store Refactor (`chatStore.js`)

- `loadMessages(sessionId)` → `GET /api/messages/session/{id}`
- `sendMessage(sessionId, content)` → `POST /api/messages/session/{id}/` with `{ role: "user", content }`
- Keep existing `addUserMessage`, `addLunaMessage`, `setTyping` — those handle UI state

### SessionsPage Changes (`SessionsPage.jsx`)

1. On mount, ensure user exists → load sessions
2. Remove `setTimeout` LUNA simulation — messages come from backend
3. Wire voice recording → `POST /api/messages/session/{id}/voice` with `FormData`
4. After voice upload, poll or refetch messages to show the new message

### Sidebar Grouping

Backend returns `last_message_at` per session. Frontend computes `group`:
```
if today → "today"
if yesterday → "yesterday"
if older → "earlier"
```

---

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/api/client.js` | New — base fetch wrapper |
| `frontend/src/api/sessions.js` | New — session API calls |
| `frontend/src/api/messages.js` | New — message API calls |
| `frontend/src/api/users.js` | New — user API calls |
| `frontend/src/store/sessionStore.js` | Replace mock data with API calls |
| `frontend/src/store/chatStore.js` | Replace mock loading with API calls |
| `frontend/src/pages/SessionsPage.jsx` | Replace LUNA simulation with real API, wire voice upload |
| `frontend/src/store/voiceStore.js` | Add upload action |

---

## Voice Upload Flow

1. User stops recording → `audioBlob` in `voiceStore`
2. `SessionsPage` calls `POST /api/messages/session/{id}/voice` with `FormData` containing the audio file
3. Backend saves file, creates message + voice_note record
4. Frontend refetches messages to show the new voice message

---

## Verification

1. Start backend: `python -m uvicorn backend.main:app --reload --port 8000`
2. Start frontend: `npm run dev` (from `frontend/`)
3. Open http://localhost:5173
4. Create new session → appears in sidebar
5. Send text message → appears in chat, session preview updates
6. Record + send voice note → appears in chat with audio player
7. Reload page → sessions persist from database
8. Delete session → disappears from sidebar
