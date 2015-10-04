CREATE TABLE users (
	id serial PRIMARY KEY,
	ip inet,
	key varchar(64)
);

CREATE TABLE boards (
	id serial PRIMARY KEY,
	name varchar(50) UNIQUE NOT NULL
);

CREATE TABLE threads (
	id serial PRIMARY KEY,
	board_id integer NOT NULL REFERENCES boards (id) ON DELETE RESTRICT,
	last_bump_date timestamp DEFAULT LOCALTIMESTAMP,
	is_pinned boolean DEFAULT false NOT NULL,
	is_locked boolean DEFAULT false NOT NULL,
	posts_count integer DEFAULT 0
);

CREATE TABLE posts (
	id serial PRIMARY KEY,
	user_id integer REFERENCES users (id) ON DELETE CASCADE,
	thread_id integer NOT NULL REFERENCES threads (id) ON DELETE CASCADE,
	board_local_id integer NOT NULL,
	created_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	topic varchar(50),
	contents text,
	attrs json,
	is_op boolean DEFAULT FALSE NOT NULL
);
