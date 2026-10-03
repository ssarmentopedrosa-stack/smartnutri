-- SmartNutri V2.1. Não altera migrations anteriores.

alter table profiles add column if not exists timezone text not null default 'America/Sao_Paulo';
alter table profiles add column if not exists consent_version text;
alter table profiles add column if not exists terms_version text;
alter table profiles add column if not exists privacy_version text;

alter table goals add column if not exists source text not null default 'AI_ESTIMATE';
alter table goals add column if not exists qualitative boolean not null default false;
update goals set source = 'USER_DEFINED' where is_estimate = false and source = 'AI_ESTIMATE';

alter table food_items add column if not exists nutrition_source text not null default 'AI_ESTIMATE';
alter table food_items add column if not exists identification_confidence double precision;
alter table food_items add column if not exists portion_confidence double precision;
alter table food_items add column if not exists nutrition_confidence double precision;
update food_items set nutrition_source = case source
  when 'taco' then 'TACO'
  when 'barcode' then 'OPEN_FOOD_FACTS'
  when 'user' then 'USER_CONFIRMED'
  else 'AI_ESTIMATE'
end
where nutrition_source = 'AI_ESTIMATE' and source in ('taco', 'barcode', 'user');

create index if not exists food_items_user_meal_idx on food_items (user_id, meal_id);
create index if not exists habit_checks_user_day_idx on habit_checks (user_id, day);

create table if not exists ai_calls (
  id text primary key,
  user_id text not null,
  operation text not null,
  provider text,
  model text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost double precision,
  success boolean not null,
  duration_ms integer,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists ai_calls_user_idx on ai_calls (user_id, created_at);

create table if not exists subscriptions (
  id text primary key,
  user_id text not null,
  provider text not null,
  provider_customer_id text,
  provider_subscription_id text,
  status text not null,
  plan text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on subscriptions (user_id, status);

create table if not exists rate_limits (
  user_id text not null,
  action text not null,
  window_id bigint not null,
  hits integer not null default 0,
  primary key (user_id, action, window_id)
);

create table if not exists barcode_cache (
  code text primary key,
  payload text not null,
  fetched_at timestamptz not null default now()
);

create table if not exists micro_habits (
  id text primary key,
  user_id text not null,
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists micro_habits_user_idx on micro_habits (user_id);
