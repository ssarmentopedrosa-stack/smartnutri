-- SmartNutri V2.2. Ledger de custo e índice de limpeza do rate limit.
-- Não altera dados existentes. Idempotente.

alter table ai_calls add column if not exists pricing_version text;
alter table ai_calls add column if not exists total_tokens integer;
alter table ai_calls add column if not exists error_type text;

create index if not exists ai_calls_operation_idx on ai_calls (operation, created_at);
create index if not exists rate_limits_window_idx on rate_limits (window_id);
