-- ============================================================
-- Cura — capture the "ensure_rls" event trigger into version control.
--
-- This function + event trigger already existed live on production
-- (added directly via the SQL editor at some point, never through a
-- tracked migration) — found via schema drift while auditing the
-- project for launch-readiness. It's a defense-in-depth safety net,
-- independent of anything the app code does: whenever a new table is
-- created in the public schema, it force-enables row level security on
-- that table, so a future migration can never accidentally ship a
-- public table with RLS off by omission.
--
-- This migration is idempotent (create-or-replace / drop-if-exists then
-- create) so applying it against production, where these objects
-- already exist, is a no-op — it exists purely so a fresh project
-- rebuilt from this repo's migrations ends up with the same protection.
-- ============================================================

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
     if cmd.schema_name is not null and cmd.schema_name in ('public') and cmd.schema_name not in ('pg_catalog', 'information_schema') and cmd.schema_name not like 'pg_toast%' and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
     else
        raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     end if;
  end loop;
end;
$$;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  execute function public.rls_auto_enable();
