-- The API's server-side client (the secret key, role service_role) had no
-- select/insert/update/delete on any public table, so every server write
-- failed with "permission denied for table ..." (for example the Freight
-- Broker registration form). Restore Supabase's standard grants for
-- service_role, which is only ever used by the server and bypasses RLS.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
