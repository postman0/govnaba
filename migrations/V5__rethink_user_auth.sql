
ALTER TABLE users 
	DROP COLUMN client_id,
	ADD COLUMN ip inet,
	ADD COLUMN key varchar(64);