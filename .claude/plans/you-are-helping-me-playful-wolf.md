# Plan: Message Editing for LUNA

## Context

Users should be able to edit a message they already sent. When they do:
1. The message is updated in the DB
2. All LUNA responses that came after that message are deleted
3. LUNA re-responds to the edited message (new stream)
4. The old LUNA response disappears from the chat UI

This mirrors how ChatGPT / Claude handles message editing.

---

## Approach

### Backend

**`backend/services/message_service.py`** — add:
```python
async def delete_messages_after(db, session_id: str, after_message_id: str) -> int:
    """Soft-delete all assistant messages created after a given message."""
    now = datetime.utcnow().isoformat()
    cursor = await db.execute(
        """UPDATE messages SET deleted_at = ?
           WHERE session_id = ? AND role = 'assistant'
             AND created_at > (SELECT created_at FROM messages WHERE id = ?)
             AND deleted_at IS NULL""",
        (now, session_id, after_message_id)
    )
    await db.commit()
    return cursor.rowcount
```

**`backend/routes/chat.py`** — `event_generator` checks if `message_id` is an existing message (user editing). If so:
1. Update the existing message content via `message_service.update_message`
2. Call `message_service.delete_messages_after` to remove subsequent LUNA responses
3. Continue streaming the new LUNA response

### Frontend

**`frontend/src/store/chatStore.js`** — add:
```javascript
editMessage: (id, newContent) => {
  set(state => ({
    messages: state.messages.map(m =>
      m.id === id ? { ...m, content: newContent, edited: true } : m
    ),
  }))
}
```

**`frontend/src/components/chat/MessageBubble.jsx`** — on user messages:
- Show pencil/edit icon on hover
- On click: call `onEdit(message)` prop

**`frontend/src/components/chat/InputComposer.jsx`** — add edit mode:
- New props: `editingMessage` (the message being edited), `onEditSubmit(newContent)`
- When `editingMessage` is set: show "Edit message" label, submit goes to `onEditSubmit`

**`frontend/src/pages/SessionsPage.jsx`**:
- `editingMessageRef` tracks the message being edited
- `handleEditMessage(message)` — sets editing state, focuses InputComposer
- `handleSendMessage` checks if editing: calls `PATCH /api/messages/{id}` then streams LUNA, removes all messages after the edited one from local state

---

## Files to Modify

| File | Change |
|------|--------|
| `backend/services/message_service.py` | Add `delete_messages_after()` function |
| `backend/routes/chat.py` | `event_generator`: detect edit, update message, delete subsequent LUNA responses |
| `frontend/src/store/chatStore.js` | Add `editMessage(id, newContent)` action |
| `frontend/src/components/chat/MessageBubble.jsx` | Hover edit icon on user messages; "(edited)" label |
| `frontend/src/components/chat/InputComposer.jsx` | `editingMessage` + `onEditSubmit` props |
| `frontend/src/pages/SessionsPage.jsx` | Wire edit flow; on edit, remove subsequent messages from UI |

---

## Verification

1. Start backend + frontend
2. Send "I'm feeling anxious" → LUNA responds
3. Hover over the user message → pencil icon appears → click it
4. Message enters edit mode → change to "I'm feeling great actually!" → submit
5. Old LUNA response disappears → new LUNA response appears tailored to edited message
6. `npm run build` → 0 errors
