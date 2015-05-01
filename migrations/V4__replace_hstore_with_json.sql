
ALTER TABLE posts
	ALTER COLUMN attrs SET DATA TYPE json USING hstore_to_json(attrs);