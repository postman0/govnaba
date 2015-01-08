package govnaba

import (
	"code.google.com/p/go-uuid/uuid"
	"encoding/json"
	_ "errors"
	"github.com/jmoiron/sqlx"
	"log"
)

type GetBoardsMessage struct {
	MessageType byte
	ClientId    uuid.UUID
}

func (msg *GetBoardsMessage) FromClient(cl *Client, msgBytes []byte) error {
	msg.ClientId = cl.Id
	return nil
}

func (msg *GetBoardsMessage) Process(db *sqlx.DB) []OutMessage {
	boards := BoardListMessage{MessageType: BoardListMessageType, Boards: make([]string, 16)}
	boards.ClientId = msg.ClientId
	rows, _ := db.Queryx(`SELECT name FROM boards;`)
	i := 0
	for rows.Next() {
		rows.Scan(&boards.Boards[i])
		i++
	}
	return []OutMessage{&boards}
}

type BoardListMessage struct {
	MessageType byte
	ClientId    uuid.UUID `json:"-"`
	Boards      []string
}

func (msg *BoardListMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *BoardListMessage) GetDestination() Destination {
	return Destination{DestinationType: ClientDestination, Id: msg.ClientId}
}
