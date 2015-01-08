package govnaba

import (
	"code.google.com/p/go-uuid/uuid"
	"encoding/json"
	_ "errors"
	"github.com/jmoiron/sqlx"
	"log"
)

type ClientDisconnectMessage struct {
	MessageType byte
	Id          uuid.UUID
}

func NewClientDisconnectMessage(id uuid.UUID) *ClientDisconnectMessage {
	return &ClientDisconnectMessage{ClientDisconnectMessageType, id}
}

func (msg *ClientDisconnectMessage) ToClient() []byte {
	log.Fatalln("Tried to call ToClient on a disconnection message")
	return nil
}

func (msg *ClientDisconnectMessage) GetDestination() Destination {
	log.Fatalln("Tried to call GetDestination on a disconnection message")
	return Destination{}
}

type ProtocolErrorMessage struct {
	MessageType byte
	Id          uuid.UUID `json:"-"`
}

func NewProtocolErrorMessage(id uuid.UUID) *ProtocolErrorMessage {
	return &ProtocolErrorMessage{ProtocolErrorMessageType, id}
}

func (msg *ProtocolErrorMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *ProtocolErrorMessage) GetDestination() Destination {
	return Destination{ClientDestination, "", msg.Id}
}

const (
	MainPage = iota
	Board
	Thread
)

type ChangeLocationMessage struct {
	MessageType  byte
	Id           uuid.UUID `json:"-"`
	LocationType byte
	NewLocation  string
}

func NewChangeLocationMessage() *ChangeLocationMessage {
	return &ChangeLocationMessage{MessageType: ChangeLocationMessageType}
}

func (msg *ChangeLocationMessage) ToClient() []byte {
	return nil
}

func (msg *ChangeLocationMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	msg.Id = cl.Id
	return nil
}

func (msg *ChangeLocationMessage) Process(db *sqlx.DB) []OutMessage {
	return []OutMessage{msg}
	// todo: split into leave and enter notifications for other clients
}

func (msg *ChangeLocationMessage) GetDestination() Destination {
	return Destination{} // garbage value
}
