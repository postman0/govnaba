package govnaba

import (
	"code.google.com/p/go-uuid/uuid"
	"encoding/json"
	"errors"
	"github.com/jmoiron/sqlx"
	"log"
)

type GetBoardsMessage struct {
	MessageType byte
	ClientId    uuid.UUID
}

func NewGetBoardsMessage() *GetBoardsMessage {
	return &GetBoardsMessage{MessageType: GetBoardsMessageType}
}

func (msg *GetBoardsMessage) FromClient(cl *Client, msgBytes []byte) error {
	msg.ClientId = cl.Id
	return nil
}

func (msg *GetBoardsMessage) Process(db *sqlx.DB) []Message {
	boards := NewBoardListMessage()
	boards.ClientId = msg.ClientId
	rows, _ := db.Queryx(`SELECT name FROM boards;`)
	i := 0
	for rows.Next() {
		rows.Scan(&boards.Boards[i])
		i++
	}
	return []Message{boards}
}

func (msg *GetBoardsMessage) ToClient() []byte {
	return nil
}

func (msg *GetBoardsMessage) GetDestination() Destination {
	return Destination{DestinationType: ClientDestination, Id: msg.ClientId}
}

type BoardListMessage struct {
	MessageType byte
	ClientId    uuid.UUID `json:"-"`
	Boards      []string
}

func NewBoardListMessage() *BoardListMessage {
	return &BoardListMessage{MessageType: BoardListMessageType, Boards: make([]string, 16)}
}

func (msg *BoardListMessage) FromClient(cl *Client, msgBytes []byte) error {
	return errors.New("tried to construct board list from client")
}

func (msg *BoardListMessage) Process(db *sqlx.DB) []Message {
	return nil
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
