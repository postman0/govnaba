
ALTER TABLE threads
	ADD COLUMN is_pinned boolean DEFAULT false NOT NULL,
	ADD COLUMN is_locked boolean DEFAULT false NOT NULL;