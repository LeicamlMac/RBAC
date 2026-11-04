-- =============================================================
-- Plataforma de Gestão de Eventos Acadêmicos - Script SQL
-- PostgreSQL 13+
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_role;

CREATE TYPE user_role AS ENUM ('ADMIN', 'EDITOR', 'USER');

-- Usuários / participantes
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'USER',
  registration  VARCHAR(30),               -- matrícula acadêmica (opcional)
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Eventos acadêmicos
CREATE TABLE events (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(160) NOT NULL,
  description  TEXT,
  location     VARCHAR(160),
  start_date   TIMESTAMPTZ  NOT NULL,
  end_date     TIMESTAMPTZ  NOT NULL,
  capacity     INTEGER      CHECK (capacity IS NULL OR capacity > 0),
  workload     INTEGER      NOT NULL DEFAULT 1 CHECK (workload > 0), -- carga horária (h) p/ certificado
  created_by   INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_event_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_events_start_date ON events (start_date);
CREATE INDEX idx_events_title ON events (LOWER(title));

-- Inscrições
CREATE TABLE subscriptions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_subscription UNIQUE (user_id, event_id)
);

CREATE INDEX idx_subscriptions_event ON subscriptions (event_id);

-- Certificados (um por inscrição)
CREATE TABLE certificates (
  id              SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL UNIQUE REFERENCES subscriptions(id) ON DELETE CASCADE,
  code            UUID    NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- Dados iniciais (seed)
-- Senha de todos os usuários abaixo: Senha@123
-- =============================================================
INSERT INTO users (name, email, password_hash, role, registration) VALUES
  ('Administrador', 'admin@universidade.edu', '$2a$10$37TDI37DTimpVIT1Lxxxl.4VRJI6AMJwuQiuaATc5tk0pLVnu0KVm', 'ADMIN',  NULL),
  ('Editor',        'editor@universidade.edu', '$2a$10$37TDI37DTimpVIT1Lxxxl.4VRJI6AMJwuQiuaATc5tk0pLVnu0KVm', 'EDITOR', NULL),
  ('Aluno Teste',   'user@universidade.edu',   '$2a$10$37TDI37DTimpVIT1Lxxxl.4VRJI6AMJwuQiuaATc5tk0pLVnu0KVm', 'USER',   '2026001');

INSERT INTO events (title, description, location, start_date, end_date, capacity, workload, created_by) VALUES
  ('Semana de Tecnologia', 'Palestras e oficinas sobre desenvolvimento de software.', 'Auditório Central', NOW() + INTERVAL '7 days',  NOW() + INTERVAL '9 days',  200, 20, 1),
  ('Workshop de Node.js',  'Construção de APIs REST com Express e PostgreSQL.',       'Laboratório 3',     NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days', 30,  4,  2),
  ('Congresso de Pesquisa','Apresentação de trabalhos de iniciação científica.',      'Centro de Convenções', NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days', NULL, 16, 1);

INSERT INTO subscriptions (user_id, event_id) VALUES (3, 3);
