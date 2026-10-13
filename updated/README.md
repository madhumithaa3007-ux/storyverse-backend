# StoryVerse AI — Updated Source Package

This update adds standalone characters and standalone character chat while preserving story-based characters and their existing chat route.

## What's included

- Standalone characters saved independently from story casts, with a short backstory field.
- Home button to add a standalone character and a separate standalone character strip.
- A dedicated standalone chat page with saved-persona selection, scene setting, separate chat history, and safe inline `*action*` formatting.
- A separate `POST /chat-standalone-character` backend route and `standaloneChatEngine.js`.
- Separate Story Chats and Standalone Chats sections on the Chats page.
- Shorter story preview and chapter narration targets, while retaining Tanglish instructions and chapter route/choice structures.
- Brief asterisk-wrapped actions supported in story character chat.

## Frontend deployment

Deploy the contents of `Frontend/` as the static site. The pages expect `js/` and `css/` directories inside that frontend root. The standalone chat currently calls the existing Render URL in `Frontend/standalone-character-chat.html`; deploy the updated backend first so that URL has the new `/chat-standalone-character` route.

## Backend deployment

Deploy the contents of `Backend/` as the Node.js service. Install dependencies with `npm install`, then start with `npm start`.

Configure these environment variables in your host (do not commit a real `.env` file):

- `GEMINI_API_KEY` — required for Gemini generation.
- `GEMINI_MODEL` — optional; defaults to `gemini-2.5-flash`.
- `SUPABASE_URL` — required for story persistence.
- `SUPABASE_ANON_KEY` — required for story persistence.

See `Backend/.env.example` for a template. Existing story saving requires a Supabase `stories` table matching the current repository implementation.

## Validation performed

- Node syntax checks passed for the included backend/shared JavaScript and inline scripts in the HTML pages.
- Local-storage smoke test passed for standalone character create/read, chat create/read, and chat deletion.
- No live Gemini or Supabase API calls were run in this workspace because dependencies and deployment credentials are not installed here.
