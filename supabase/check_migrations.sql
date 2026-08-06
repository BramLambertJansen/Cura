-- ============================================================
-- Cura — migratie-status-check
--
-- Migraties in supabase/migrations/ worden HANDMATIG toegepast via de
-- Supabase Dashboard SQL-editor (zie README → Live zetten), dus er is geen
-- supabase_migrations-tabel die bijhoudt wat er al gedraaid is.
--
-- Plak dit hele bestand in de SQL-editor van het project en draai het. Je
-- krijgt één rij per migratie met status 'OK' of 'ONTBREEKT' plus, bij een
-- ontbrekende migratie, welk object er niet gevonden is.
--
-- Dit script is READ-ONLY: het wijzigt niets.
-- ============================================================

with checks(seq, migration, item, present) as (values

  -- 20260630000000_init.sql
  (1, '20260630000000_init', 'table households',
     to_regclass('public.households') is not null),
  (1, '20260630000000_init', 'table members',
     to_regclass('public.members') is not null),
  (1, '20260630000000_init', 'table household_members',
     to_regclass('public.household_members') is not null),
  (1, '20260630000000_init', 'table household_invites',
     to_regclass('public.household_invites') is not null),
  (1, '20260630000000_init', 'table rooms',
     to_regclass('public.rooms') is not null),
  (1, '20260630000000_init', 'table bundles',
     to_regclass('public.bundles') is not null),
  (1, '20260630000000_init', 'table tasks',
     to_regclass('public.tasks') is not null),
  (1, '20260630000000_init', 'table task_completions',
     to_regclass('public.task_completions') is not null),
  (1, '20260630000000_init', 'function is_household_member',
     to_regprocedure('public.is_household_member(text)') is not null),

  -- 20260630010000_household_rename_invite_hardening_indexes.sql
  (2, '20260630010000_household_rename_invite_hardening_indexes', 'policy households_update',
     exists (select 1 from pg_policies
             where schemaname = 'public' and tablename = 'households'
               and policyname = 'households_update')),
  (2, '20260630010000_household_rename_invite_hardening_indexes', 'policy household_invites_delete',
     exists (select 1 from pg_policies
             where schemaname = 'public' and tablename = 'household_invites'
               and policyname = 'household_invites_delete')),
  (2, '20260630010000_household_rename_invite_hardening_indexes', 'index members_household_id_idx',
     to_regclass('public.members_household_id_idx') is not null),
  (2, '20260630010000_household_rename_invite_hardening_indexes', 'index task_completions_completed_at_idx',
     to_regclass('public.task_completions_completed_at_idx') is not null),

  -- 20260630020000_task_due_date.sql
  (3, '20260630020000_task_due_date', 'column tasks.due_date',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'tasks'
               and column_name = 'due_date')),

  -- 20260630030000_members_update_policy.sql
  -- Bewust OMGEKEERD: deze policy hoort WEG te zijn zodra
  -- 20260728000000_security_hardening is toegepast (die dropt 'm ten gunste
  -- van de update_own_member-RPC). Staat hij er nog, dan is de hardening niet
  -- gedraaid — dat meldt de regel hieronder ook al.
  (4, '20260630030000_members_update_policy', 'policy members_update is opgeheven (verwacht: afwezig)',
     to_regclass('public.members') is not null
     and not exists (select 1 from pg_policies
                     where schemaname = 'public' and tablename = 'members'
                       and policyname = 'members_update')),

  -- 20260630040000_task_description.sql
  (5, '20260630040000_task_description', 'column tasks.description',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'tasks'
               and column_name = 'description')),

  -- 20260630050000_realtime_publication.sql
  (6, '20260630050000_realtime_publication', 'publication supabase_realtime: tasks',
     exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks')),
  (6, '20260630050000_realtime_publication', 'publication supabase_realtime: rooms',
     exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms')),
  (6, '20260630050000_realtime_publication', 'publication supabase_realtime: bundles',
     exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bundles')),
  (6, '20260630050000_realtime_publication', 'publication supabase_realtime: members',
     exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'members')),
  (6, '20260630050000_realtime_publication', 'publication supabase_realtime: task_completions',
     exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_completions')),

  -- 20260706000000_household_timezone.sql
  (7, '20260706000000_household_timezone', 'column households.time_zone',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'households'
               and column_name = 'time_zone')),

  -- 20260706010000_push_subscriptions.sql
  (8, '20260706010000_push_subscriptions', 'table push_subscriptions',
     to_regclass('public.push_subscriptions') is not null),
  (8, '20260706010000_push_subscriptions', 'policy push_subscriptions_select',
     exists (select 1 from pg_policies
             where schemaname = 'public' and tablename = 'push_subscriptions'
               and policyname = 'push_subscriptions_select')),

  -- 20260706020000_reminder_dispatches.sql
  (9, '20260706020000_reminder_dispatches', 'table reminder_dispatches',
     to_regclass('public.reminder_dispatches') is not null),

  -- 20260706030000_reminder_cron.sql
  (10, '20260706030000_reminder_cron', 'extension pg_cron',
     exists (select 1 from pg_extension where extname = 'pg_cron')),
  (10, '20260706030000_reminder_cron', 'extension pg_net',
     exists (select 1 from pg_extension where extname = 'pg_net')),
  (10, '20260706030000_reminder_cron', 'extension supabase_vault',
     exists (select 1 from pg_extension where extname = 'supabase_vault')),
  -- cron.job / vault.secrets bestaan pas als de extensie geïnstalleerd is, en
  -- een directe verwijzing naar een niet-bestaande relatie laat het HELE script
  -- al bij het parsen falen. Vandaar de case-guard (garandeert dat de andere tak
  -- niet geëvalueerd wordt) rond een query_to_xml die pas at runtime parset.
  (10, '20260706030000_reminder_cron', 'cron job cura-send-reminders',
     case when to_regclass('cron.job') is null then false else
       (xpath('/row/c/text()', query_to_xml(
         'select count(*) as c from cron.job where jobname = ''cura-send-reminders''',
         false, true, '')))[1]::text::int > 0 end),
  (10, '20260706030000_reminder_cron', 'cron job cura-prune-reminder-dispatches',
     case when to_regclass('cron.job') is null then false else
       (xpath('/row/c/text()', query_to_xml(
         'select count(*) as c from cron.job where jobname = ''cura-prune-reminder-dispatches''',
         false, true, '')))[1]::text::int > 0 end),
  -- Geen migratie, maar wel nodig voordat de cron iets zinnigs doet:
  (10, '20260706030000_reminder_cron', 'vault secret cura_cron_secret (handmatig)',
     case when to_regclass('vault.secrets') is null then false else
       (xpath('/row/c/text()', query_to_xml(
         'select count(*) as c from vault.secrets where name = ''cura_cron_secret''',
         false, true, '')))[1]::text::int > 0 end),
  (10, '20260706030000_reminder_cron', 'vault secret cura_functions_base_url (handmatig)',
     case when to_regclass('vault.secrets') is null then false else
       (xpath('/row/c/text()', query_to_xml(
         'select count(*) as c from vault.secrets where name = ''cura_functions_base_url''',
         false, true, '')))[1]::text::int > 0 end),

  -- 20260706040000_shopping_items.sql
  (11, '20260706040000_shopping_items', 'table shopping_items',
     to_regclass('public.shopping_items') is not null),
  (11, '20260706040000_shopping_items', 'publication supabase_realtime: shopping_items',
     exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shopping_items')),

  -- 20260708000000_member_quiet_hours.sql
  (12, '20260708000000_member_quiet_hours', 'column members.quiet_hours_start',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'members'
               and column_name = 'quiet_hours_start')),
  (12, '20260708000000_member_quiet_hours', 'column members.quiet_hours_end',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'members'
               and column_name = 'quiet_hours_end')),

  -- 20260709000000_shopping_item_category.sql
  (13, '20260709000000_shopping_item_category', 'column shopping_items.category',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'shopping_items'
               and column_name = 'category')),

  -- 20260709010000_shopping_item_amount_unit_description.sql
  (14, '20260709010000_shopping_item_amount_unit_description', 'column shopping_items.amount',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'shopping_items'
               and column_name = 'amount')),
  (14, '20260709010000_shopping_item_amount_unit_description', 'column shopping_items.unit',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'shopping_items'
               and column_name = 'unit')),
  (14, '20260709010000_shopping_item_amount_unit_description', 'column shopping_items.description',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'shopping_items'
               and column_name = 'description')),

  -- 20260713000000_task_checklist_started_at.sql
  (15, '20260713000000_task_checklist_started_at', 'column tasks.started_at',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'tasks'
               and column_name = 'started_at')),
  (15, '20260713000000_task_checklist_started_at', 'column tasks.checklist_items',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'tasks'
               and column_name = 'checklist_items')),

  -- 20260723000000_task_picked_up_at.sql
  (16, '20260723000000_task_picked_up_at', 'column tasks.picked_up_at',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'tasks'
               and column_name = 'picked_up_at')),

  -- 20260724000000_task_dagdeel.sql
  (17, '20260724000000_task_dagdeel', 'column tasks.dagdeel',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'tasks'
               and column_name = 'dagdeel')),

  -- 20260728000000_security_hardening.sql
  (18, '20260728000000_security_hardening', 'constraint household_members_user_id_unique',
     exists (select 1 from pg_constraint
             where conname = 'household_members_user_id_unique'
               and conrelid = to_regclass('public.household_members'))),
  (18, '20260728000000_security_hardening', 'function update_own_member',
     to_regprocedure('public.update_own_member(text, boolean, text, text)') is not null),
  (18, '20260728000000_security_hardening', 'function create_invite',
     to_regprocedure('public.create_invite(text, text)') is not null),
  (18, '20260728000000_security_hardening', 'policy household_invites_insert is opgeheven (verwacht: afwezig)',
     not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'household_invites'
                   and policyname = 'household_invites_insert')),
  (18, '20260728000000_security_hardening', 'policy tasks_update heeft with check',
     exists (select 1 from pg_policies
             where schemaname = 'public' and tablename = 'tasks'
               and policyname = 'tasks_update' and with_check is not null)),
  (18, '20260728000000_security_hardening', 'policy rooms_update heeft with check',
     exists (select 1 from pg_policies
             where schemaname = 'public' and tablename = 'rooms'
               and policyname = 'rooms_update' and with_check is not null)),

  -- 20260728010000_ensure_rls_event_trigger.sql
  (19, '20260728010000_ensure_rls_event_trigger', 'function rls_auto_enable',
     to_regprocedure('public.rls_auto_enable()') is not null),
  (19, '20260728010000_ensure_rls_event_trigger', 'event trigger ensure_rls',
     exists (select 1 from pg_event_trigger where evtname = 'ensure_rls')),

  -- 20260804000000_room_owner_removal.sql
  -- Bewust OMGEKEERD, zelfde patroon als het members_update-blok hierboven:
  -- deze kolom hoort WEG te zijn zodra deze migratie is toegepast.
  (20, '20260804000000_room_owner_removal', 'kolom rooms.owner_id is verwijderd (verwacht: afwezig)',
     not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'rooms'
                   and column_name = 'owner_id'))
)

select
  migration,
  case when bool_and(present) then 'OK' else 'ONTBREEKT' end as status,
  coalesce(
    string_agg(item, ', ') filter (where not present),
    '—'
  ) as ontbrekend
from checks
group by seq, migration
order by seq;
