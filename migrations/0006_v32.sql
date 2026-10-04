-- CALU V3.2. Cache da resposta sob demanda do Coach.
-- Não duplica refeição, água, meta nem o insight diário (daily_insights).

create table if not exists coach_cache (
  user_id text not null,
  day text not null,
  question_hash text not null,
  context_hash text not null,
  payload text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day, question_hash)
);
