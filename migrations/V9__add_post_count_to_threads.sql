
ALTER TABLE threads ADD COLUMN posts_count integer DEFAULT 0;
UPDATE threads SET posts_count = (SELECT count(*) FROM posts WHERE thread_id = threads.id);
