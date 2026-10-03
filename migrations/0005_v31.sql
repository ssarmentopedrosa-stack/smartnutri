-- CALU V3.1. Cache do insight diário. Não apaga dado anterior.

create table if not exists daily_insights (
  user_id text not null,
  day text not null,
  context_hash text not null,
  text text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
