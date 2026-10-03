-- CALU: dados por usuário. Toda leitura e escrita passa por authMiddleware
-- e filtra user_id. Fotos de refeição não são armazenadas.

create table if not exists profiles (
  user_id text primary key,
  name text not null,
  age integer,
  sex text,
  height_cm double precision,
  weight_kg double precision,
  goal text not null,
  activity text not null,
  diet text not null default 'livre',
  diet_note text,
  restrictions text,
  plan text not null default 'free',
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists goals (
  user_id text primary key,
  calories integer not null,
  protein double precision not null,
  carbohydrates double precision not null,
  fat double precision not null,
  fiber double precision not null,
  water_ml integer not null,
  is_estimate boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists meals (
  id text primary key,
  user_id text not null,
  day text not null,
  meal_type text not null,
  eaten_at timestamptz not null,
  source text not null,
  note text,
  uncertainties text not null default '[]',
  insight text,
  calories double precision not null default 0,
  protein double precision not null default 0,
  carbohydrates double precision not null default 0,
  fat double precision not null default 0,
  fiber double precision not null default 0,
  incomplete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meals_user_day_idx on meals (user_id, day);

create table if not exists food_items (
  id text primary key,
  meal_id text not null,
  user_id text not null,
  name text not null,
  quantity double precision not null,
  unit text not null,
  calories double precision,
  protein double precision,
  carbohydrates double precision,
  fat double precision,
  fiber double precision,
  confidence double precision,
  source text not null,
  data_status text not null,
  base_quantity double precision not null,
  base_calories double precision,
  base_protein double precision,
  base_carbohydrates double precision,
  base_fat double precision,
  base_fiber double precision,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists food_items_meal_idx on food_items (meal_id);
create index if not exists food_items_user_idx on food_items (user_id);

create table if not exists water_logs (
  id text primary key,
  user_id text not null,
  day text not null,
  amount_ml integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists water_user_day_idx on water_logs (user_id, day);

create table if not exists weight_logs (
  id text primary key,
  user_id text not null,
  day text not null,
  weight_kg double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weight_user_idx on weight_logs (user_id, day);

create table if not exists habits (
  user_id text primary key,
  water boolean not null default true,
  produce boolean not null default false,
  meals boolean not null default true,
  activity boolean not null default false,
  sleep boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists habit_checks (
  id text primary key,
  user_id text not null,
  day text not null,
  habit text not null,
  done boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, day, habit)
);

create table if not exists ai_messages (
  id text primary key,
  user_id text not null,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_messages_user_idx on ai_messages (user_id, created_at);

create table if not exists ai_memory (
  id text primary key,
  user_id text not null,
  fact text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_memory_user_idx on ai_memory (user_id);

create table if not exists ai_usage (
  user_id text not null,
  day text not null,
  image_count integer not null default 0,
  text_count integer not null default 0,
  chat_count integer not null default 0,
  primary key (user_id, day)
);

create table if not exists notification_prefs (
  user_id text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists analytics_events (
  id text primary key,
  user_id text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists analytics_user_idx on analytics_events (user_id, created_at);
