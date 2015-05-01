package govnaba

import (
	"code.google.com/p/go-uuid/uuid"
	"encoding/json"
	_ "errors"
	"github.com/jmoiron/sqlx"
	"log"
)

// These messages help main broadcast goroutine to remove structs related to disconnected clients.
// Its methods should be never called.
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

// This message is used to signal the client that it sent a wrong message.
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

// Constants used in ChangeLocationMessage
const (
	// Not implemented
	MainPage = iota
	Board
	// Not implemented
	Thread
)

// These messages are used by clients for controlling incoming message stream.
// Some messages are sent only to clients which are browsing some board or thread.
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

// Process currently does nothing for these messages. All processing is done by the broadcast goroutine.
func (msg *ChangeLocationMessage) Process(db *sqlx.DB) []OutMessage {
	return []OutMessage{msg}
	// todo: split into leave and enter notifications for other clients
}

func (msg *ChangeLocationMessage) GetDestination() Destination {
	return Destination{} // garbage value
}

// This message tells the client that a file upload was successful.
type FileUploadSuccessfulMessage struct {
	MessageType byte
	ClientId    uuid.UUID `json:"-"`
	Filename    string
}

func (msg *FileUploadSuccessfulMessage) GetDestination() Destination {
	return Destination{ClientDestination, "", msg.ClientId}
}

func (msg *FileUploadSuccessfulMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}
