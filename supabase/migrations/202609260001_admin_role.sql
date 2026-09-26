-- Back-office staff role. Kept in its own migration because Postgres does not
-- allow a new enum value to be used in the transaction that adds it.
alter type public.app_role add value if not exists 'admin';
