CREATE TABLE users (
	id serial PRIMARY KEY,
	client_id uuid
);

CREATE TABLE boards (
	id serial PRIMARY KEY,
	name varchar(50) UNIQUE NOT NULL
);

CREATE TABLE threads (
	id serial PRIMARY KEY,
	board_id integer REFERENCES boards (id) ON DELETE RESTRICT,
	last_bump_date timestamp DEFAULT LOCALTIMESTAMP
);

CREATE TABLE posts (
	id serial PRIMARY KEY,
	user_id integer REFERENCES users (id) ON DELETE CASCADE,
	thread_id integer REFERENCES threads (id) ON DELETE CASCADE,
	board_local_id integer,
	created_date timestamp DEFAULT LOCALTIMESTAMP,
	topic varchar(50),
	contents text,
	attrs hstore
);
