
ALTER TABLE threads 
	ALTER COLUMN board_id SET NOT NULL;

ALTER TABLE posts
	ALTER COLUMN thread_id SET NOT NULL,
	ALTER COLUMN board_local_id SET NOT NULL;
