package govnaba

import (
	"code.google.com/p/go-uuid/uuid"
	"github.com/jmoiron/sqlx"
)

const (
	ProtocolErrorMessageType = iota
	ClientDisconnectMessageType
	CreateThreadMessageType
	ChangeLocationMessageType
	AddPostMessageType
	GetBoardsMessageType
	BoardListMessageType
)

type MessageConstructor func() InMessage

var MessageConstructors = map[byte]MessageConstructor{
	CreateThreadMessageType:   func() InMessage { return &CreateThreadMessage{MessageType: CreateThreadMessageType} },
	ChangeLocationMessageType: func() InMessage { return &ChangeLocationMessage{MessageType: ChangeLocationMessageType} },
	AddPostMessageType:        func() InMessage { return &AddPostMessage{MessageType: AddPostMessageType} },
	GetBoardsMessageType:      func() InMessage { return &GetBoardsMessage{MessageType: GetBoardsMessageType} },
}

type InMessage interface {
	FromClient(*Client, []byte) error
	Process(*sqlx.DB) []OutMessage
}

type OutMessage interface {
	GetDestination() Destination
	ToClient() []byte
}

const (
	ClientDestination = iota
	BoardDestination
	MainPageDestination
)

type Destination struct {
	DestinationType byte
	Board           string
	Id              uuid.UUID
}
