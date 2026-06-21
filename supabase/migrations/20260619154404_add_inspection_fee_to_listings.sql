-- Inspection escrow fee (PRD §14). Nullable until the agent sets it.
alter table public.listings
  add column if not exists inspection_fee numeric default null;
