-- Enable row level security and policies
alter table grids enable row level security;

-- Example: allow select to all, but updates only to owner via a join (placeholder)
-- For demo, we keep read-only public access; extend as needed.
create policy grids_select_all on grids for select using (true);
