DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS stories;
DROP TABLE IF EXISTS starting_paragraphs;
DROP TABLE IF EXISTS ending_paragraphs;
DROP TABLE IF EXISTS paragraphs;
DROP TABLE IF EXISTS paragraphs_keywords;
DROP TABLE IF EXISTS keywords;
DROP TABLE IF EXISTS collaborators_stories;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT,
  password TEXT
);

CREATE TABLE IF NOT EXISTS stories (
  id SERIAL PRIMARY KEY,
  created_user_id INTEGER,
  last_updated_user_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  starting_paragraph_id INTEGER,
  ending_paragraph_id INTEGER,
  title TEXT
);

CREATE TABLE IF NOT EXISTS starting_paragraphs (
  id SERIAL PRIMARY KEY,
  paragraph TEXT
);

CREATE TABLE IF NOT EXISTS ending_paragraphs (
  id SERIAL PRIMARY KEY,
  paragraph TEXT
);

CREATE TABLE IF NOT EXISTS paragraphs (
  id SERIAL PRIMARY KEY,
  created_user_id INTEGER,
  last_updated_user_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  story_id INTEGER,
  paragraph TEXT
);

CREATE TABLE IF NOT EXISTS paragraphs_keywords (
  id SERIAL PRIMARY KEY,
  paragraph_id INTEGER,
  keyword_id INTEGER
);

CREATE TABLE IF NOT EXISTS keywords (
  id SERIAL PRIMARY KEY,
  keyword TEXT,
  type TEXT
);

CREATE TABLE IF NOT EXISTS collaborators_stories (
  id SERIAL PRIMARY KEY,
  collaborator_id INTEGER,
  story_id INTEGER,
  keyword1_id INTEGER,
  keyword2_id INTEGER,
  keyword3_id INTEGER
);