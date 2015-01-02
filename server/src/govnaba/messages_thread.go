package govnaba

import (
	"log"
	"encoding/json"
	"github.com/jmoiron/sqlx"
	"code.google.com/p/go-uuid/uuid"
)

type CreateThreadMessage struct {
	MessageType byte
	ClientId uuid.UUID `json:"-"`
	Board string	
	Topic string
	Contents string
	LocalId int
}

func NewCreateThreadMessage() *CreateThreadMessage {
	return &CreateThreadMessage{MessageType: CreateThreadMessageType, }
}

func (msg *CreateThreadMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	msg.ClientId = cl.Id
	return nil
}

func (msg *CreateThreadMessage) Process(db *sqlx.DB) []Message {
	row := db.QueryRowx(`SELECT EXISTS(SELECT 1 FROM boards WHERE name = $1);`, msg.Board);
	var boardExists bool
	row.Scan(&boardExists)
	if !boardExists {
		log.Printf("Tried to post into invalid board /%s/", msg.Board)
		return nil
		// return error
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
		// return error
	}
	msg.LocalId = post_id
	return []Message{msg}
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