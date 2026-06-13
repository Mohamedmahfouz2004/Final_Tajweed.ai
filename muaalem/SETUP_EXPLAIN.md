# Enabling the AI explanation endpoint (`/api/explain`)

The post-recitation report calls `POST /api/explain` on **this model server** (port `8888`), so it rides the same ngrok tunnel as the live recitation — no separate backend is needed. If that call returns **404**, the model server you are running does not have the route yet.

## Why it 404s

- **Stale local copy.** If you are running from a downloaded ZIP (a folder like `Final_Tajweed.ai-main`) taken before the explain feature was added, your local `muaalem_server.py` has no route. Update the code and **restart** the server.
- **No `muaalem/.env`.** That file is git-ignored, so it never ships in the repo or ZIP. Without it there is no `OPENROUTER_API_KEY`, so explanations fall back to static Arabic text (still HTTP 200, just not AI). This does **not** cause a 404 — only a stale copy does.

## Steps (Windows / PowerShell)

1. **Update the code** to the latest `main`:
   - `git pull` (if you cloned), or re-download the ZIP from GitHub and replace the folder.
   - Confirm `muaalem/explain_tajweed.py` exists and `muaalem/muaalem_server.py` contains `POST /api/explain`.

2. **Create the env file** and paste the team's OpenRouter key (ask the owner; do not commit it):
   ```powershell
   copy muaalem\.env.example muaalem\.env
   notepad muaalem\.env   # set OPENROUTER_API_KEY=sk-or-v1-...
   ```

3. **Restart the server** (uv provides `python-dotenv` and `httpx` from `uv.lock`):
   ```powershell
   uv run uvicorn muaalem_server:app --host 0.0.0.0 --port 8888
   ```
   On startup the console must print:
   ```
   ✅ Explain endpoint enabled at POST /api/explain (AI model=google/gemma-4-31b-it:free)
   ```
   If it prints `static fallback — set OPENROUTER_API_KEY ...`, the route works but your `.env` key is missing/empty.
   If it prints `⚠️ Explain endpoint DISABLED`, `explain_tajweed.py` is missing from your copy — update the code.

4. **Verify** through the tunnel (replace the host with your ngrok URL):
   ```powershell
   curl -X POST https://voice-plus-twisty.ngrok-free.dev/api/explain -H "Content-Type: application/json" -d "{\"mistakes\":[{\"error_type\":\"ghunna\",\"ayah_number\":1,\"ayah_text\":\"قُلْ هُوَ اللَّهُ أَحَدٌ\"}]}"
   ```
   Expect HTTP **200** with JSON containing `rules[].explanation_ar` and `"source": "ai"` (or `"static"` if the free model is rate-limited or no key is set). A 404 means the running server is still the old code — recheck step 1 and restart.

## Notes

- The model server never crashes because of this feature: if `python-dotenv` or `explain_tajweed.py` is missing, recitation still runs and only `/api/explain` is affected.
- Free OpenRouter slugs change often. If explanations are consistently `static`, set `OPENROUTER_MODEL` in `muaalem/.env` to a live `:free` slug from `https://openrouter.ai/api/v1/models`.
