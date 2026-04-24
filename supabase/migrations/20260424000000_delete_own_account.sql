-- Allow users to delete their own account and all associated data
create or replace function delete_own_account()
returns void
language sql
security definer
as $$
  delete from completions where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
$$;
