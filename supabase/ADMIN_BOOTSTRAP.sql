-- Sustituye el email y ejecuta después de crear tu usuario en Supabase Auth.
update public.profiles
set role='admin'
where id=(select id from auth.users where email='TU_EMAIL');
