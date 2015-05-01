package govnaba

import (
	"code.google.com/p/go-uuid/uuid"
	"github.com/jmoiron/sqlx"
)

// Type constants used for message identification.
const (
	ProtocolErrorMessageType = iota
	ClientDisconnectMessageType
	CreateThreadMessageType
	ChangeLocationMessageType
	AddPostMessageType
	GetBoardsMessageType
	BoardListMessageType
	GetBoardThreadsMessageType
	BoardThreadListMessageType
	GetThreadMessageType
	ThreadPostsMessageType
	FileUploadSuccessfulMessageType
)

// This type is used in reconstructing messages sent by clients.
// Members of this type should return a structure conforming to InMessage
// with MessageType field set to its corresponding type constant.
type MessageConstructor func() InMessage

// Available message constructors.
var MessageConstructors = map[byte]MessageConstructor{
	CreateThreadMessageType:    func() InMessage { return &CreateThreadMessage{MessageType: CreateThreadMessageType} },
	ChangeLocationMessageType:  func() InMessage { return &ChangeLocationMessage{MessageType: ChangeLocationMessageType} },
	AddPostMessageType:         func() InMessage { return &AddPostMessage{MessageType: AddPostMessageType} },
	GetBoardsMessageType:       func() InMessage { return &GetBoardsMessage{MessageType: GetBoardsMessageType} },
	GetBoardThreadsMessageType: func() InMessage { return &GetBoardThreadsMessage{MessageType: GetBoardThreadsMessageType} },
	GetThreadMessageType:       func() InMessage { return &GetThreadMessage{MessageType: GetThreadMessageType} },
}

// InMessage describes messages which are recieved from client.
type InMessage interface {
	// FromClient is used to populate the message structure with the data sent by the. client.
	FromClient(*Client, []byte) error
	// Process is used to handle the message.
	// Returned OutMessage structs are sent to the clients.
	Process(*sqlx.DB) []OutMessage
}

// OutMessage describes messages which are sent to the clients.
type OutMessage interface {
	// GetDestination is used to determine if message should be sent
	// to all clients on some board or only to one client.
	GetDestination() Destination
	// ToClient encodes message in order to send it via websocket.
	// It should be used to strip data which should not be sent to the client.
	ToClient() []byte
}

// Destination types.
const (
	// Send to one client
	ClientDestination = iota
	// Broadcast on single board
	BoardDestination
	// Not implemented
	MainPageDestination
)

// Destination struct helps to determine where should the message be sent.
type Destination struct {
	DestinationType byte
	Board           string
	Id              uuid.UUID
}
