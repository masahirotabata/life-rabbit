create table users (
  id bigserial primary key,
  email varchar(255) not null unique,
  password_hash varchar(255) not null,
  created_at timestamptz not null default now()
);

create table goals (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  title varchar(255) not null,
  annual_income numeric(12,2) not null,
  days_per_year int not null default 365,
  achieved boolean not null default false,
  created_at timestamptz not null default now()
);

create table tasks (
  id bigserial primary key,
  goal_id bigint not null references goals(id) on delete cascade,
  title varchar(255) not null,
  completed boolean not null default false,
  completed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index idx_tasks_goal on tasks(goal_id);

create table currency_events (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  goal_id bigint not null references goals(id) on delete cascade,
  task_id bigint null references tasks(id) on delete set null,
  currency varchar(16) not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index idx_events_user on currency_events(user_id);
create index idx_events_goal on currency_events(goal_id);
