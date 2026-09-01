-- ============================================================
-- Cura Phase 4 — add task_suggestions to Realtime (AI-invoer via
-- MCP-server). Applied manually via the Supabase Dashboard SQL editor,
-- same as the other migrations in this repo (CLAUDE.md §4) — see
-- 20260630050000_realtime_publication.sql for the original set this
-- extends.
--
-- Without this, a suggestion the mcp-server edge function just wrote
-- would only show up after a pull-to-refresh/app-open, not live —
-- being in the publication is separate from (and in addition to) the
-- RLS policies from 20260810000000_ai_task_suggestions_mcp.sql, which
-- gate WHO sees an event once the table IS publishing them.
--
-- mcp_access_tokens deliberately does NOT go into the publication —
-- token management doesn't need to live-sync (CLAUDE.md §5 →
-- AI-voorstellen).
-- ============================================================

alter publication supabase_realtime add table public.task_suggestions;
