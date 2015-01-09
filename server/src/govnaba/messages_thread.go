package govnaba

import (
	"code.google.com/p/go-uuid/uuid"
	"encoding/json"
	"github.com/jmoiron/sqlx"
	"log"
)

type CreateThreadMessage struct {
	MessageType byte
	ClientId    uuid.UUID `json:"-"`
	Board       string
	Topic       string
	Contents    string
	ThreadId    int
	LocalId     int
}

func (msg *CreateThreadMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	msg.ClientId = cl.Id
	return nil
}

func (msg *CreateThreadMessage) Process(db *sqlx.DB) []OutMessage {
	row := db.QueryRowx(`SELECT EXISTS(SELECT 1 FROM boards WHERE name = $1);`, msg.Board)
	var boardExists bool
	row.Scan(&boardExists)
	if !boardExists {
		log.Printf("Tried to post into invalid board /%s/", msg.Board)
		return nil
		// todo: return error
	}
	tx := db.MustBegin()
	row = tx.QueryRowx(`INSERT INTO threads (board_id) VALUES ((SELECT id FROM boards WHERE name = $1)) RETURNING id;`, msg.Board)
	var thread_id int
	err := row.Scan(&thread_id)
	if err != nil {
		log.Println(err)
	}
	row = tx.QueryRowx(`INSERT INTO posts (user_id, thread_id, board_local_id, topic, contents) 
		VALUES (NULL, $1, nextval($2 || '_board_id_seq'), $3, $4) RETURNING board_local_id;`,
		thread_id, msg.Board, msg.Topic, msg.Contents)
	var post_id int
	err = row.Scan(&post_id)
	tx.Commit()
	if err != nil {
		log.Println(err)
		return nil
		// todo: return error
	}
	msg.LocalId = post_id
	msg.ThreadId = thread_id
	return []OutMessage{msg}
}

func (msg *CreateThreadMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *CreateThreadMessage) GetDestination() Destination {
	return Destination{DestinationType: BoardDestination, Board: msg.Board}
}

type AddPostMessage struct {
	MessageType   byte
	ClientId      uuid.UUID `json:"-"`
	Board         string
	Topic         string
	Contents      string
	ThreadLocalId int
	AnswerLocalId int
}

func (msg *AddPostMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	msg.ClientId = cl.Id
	return nil
}

func (msg *AddPostMessage) Process(db *sqlx.DB) []OutMessage {

	const insertPostQuery = `INSERT INTO posts (user_id, thread_id, topic, contents, board_local_id) VALUES 
		((SELECT users.id FROM users WHERE client_id = $1),
		(SELECT threads.id FROM threads, boards, posts WHERE board_id = boards.id AND thread_id = threads.id AND boards.name = $2 AND posts.board_local_id = $3),
		$4,
		$5,
		nextval($2 || '_board_id_seq')
		) RETURNING posts.board_local_id;`

	tx := db.MustBegin()
	row := tx.QueryRowx(insertPostQuery, msg.ClientId.String(), msg.Board, msg.ThreadLocalId, msg.Topic, msg.Contents)
	var answerId int
	err := row.Scan(&answerId)
	if err != nil {
		tx.Rollback()
		log.Println(err)
		// todo: return error
		return nil
	}
	tx.Exec(`UPDATE threads SET last_bump_date = DEFAULT WHERE id = (SELECT thread_id FROM posts WHERE board_local_id = $1);`, msg.ThreadLocalId)
	tx.Commit()
	msg.AnswerLocalId = answerId
	return []OutMessage{msg}
}

func (msg *AddPostMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *AddPostMessage) GetDestination() Destination {
	return Destination{DestinationType: BoardDestination, Board: msg.Board}
}
