package govnaba

import (
	"log"
	"errors"
	"encoding/json"
	"github.com/jmoiron/sqlx"
	"code.google.com/p/go-uuid/uuid"
)

type ClientDisconnectMessage struct {
	MessageType byte
	Id uuid.UUID
}

func NewClientDisconnectMessage(id uuid.UUID) *ClientDisconnectMessage {
	return &ClientDisconnectMessage{ClientDisconnectMessageType, id}
}

func (msg *ClientDisconnectMessage) ToClient() []byte {
	log.Fatalln("Tried to call ToClient on a disconnection message")
	return nil
}

func (msg *ClientDisconnectMessage) FromClient(_ *Client, _ []byte) error {
	return errors.New("")
}

func (msg *ClientDisconnectMessage) Process(db *sqlx.DB) []Message {
	log.Fatalln("Tried to call Process on a disconnection message")
	return nil
}

func (msg *ClientDisconnectMessage) GetDestination() Destination {
	log.Fatalln("Tried to call GetDestination on a disconnection message")
	return Destination{}
}

type ProtocolErrorMessage struct {
	MessageType byte
	Id uuid.UUID
}

func NewProtocolErrorMessage(id uuid.UUID) *ProtocolErrorMessage {
	return &ProtocolErrorMessage{ProtocolErrorMessageType, id}
}

func (msg *ProtocolErrorMessage) ToClient() []byte {
	msgMap := map[string]interface{}{
		"error": true,
		"errorMessage": "Couldn't understand your message",
	}
	str, _ := json.Marshal(msgMap)
	return str
}

func (msg *ProtocolErrorMessage) FromClient(_ *Client, _ []byte) error {
	return errors.New("")
}

func (msg *ProtocolErrorMessage) Process(db *sqlx.DB) []Message {
	log.Fatalln("Tried to call Process on a protocol error message")
	return nil
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
	MessageType byte
	Id uuid.UUID `json:"-"`
	LocationType byte
	NewLocation string
}

func NewChangeLocationMessage() *ChangeLocationMessage {
	return &ChangeLocationMessage{MessageType: ChangeLocationMessageType,}
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

func (msg *ChangeLocationMessage) Process(db *sqlx.DB) []Message {
	return []Message{msg}
	// todo: split into leave and enter notifications for other clients
	// todo: return thread posts if needed
	// todo: return board threads if needed
}

func (msg *ChangeLocationMessage) GetDestination() Destination {
	return Destination{} // garbage value
}