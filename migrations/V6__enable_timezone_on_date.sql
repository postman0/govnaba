
ALTER TABLE posts
	ALTER created_date SET DATA TYPE TIMESTAMP WITH TIME ZONE,
	ALTER created_date SET DEFAULT 'now'::timestamp with time zone;