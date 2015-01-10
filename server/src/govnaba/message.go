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
	GetBoardThreadsMessageType
	BoardThreadListMessageType
	GetThreadMessageType
	ThreadPostsMessageType
)

type MessageConstructor func() InMessage

var MessageConstructors = map[byte]MessageConstructor{
	CreateThreadMessageType:    func() InMessage { return &CreateThreadMessage{MessageType: CreateThreadMessageType} },
	ChangeLocationMessageType:  func() InMessage { return &ChangeLocationMessage{MessageType: ChangeLocationMessageType} },
	AddPostMessageType:         func() InMessage { return &AddPostMessage{MessageType: AddPostMessageType} },
	GetBoardsMessageType:       func() InMessage { return &GetBoardsMessage{MessageType: GetBoardsMessageType} },
	GetBoardThreadsMessageType: func() InMessage { return &GetBoardThreadsMessage{MessageType: GetBoardThreadsMessageType} },
	GetThreadMessageType:       func() InMessage { return &GetThreadMessage{MessageType: GetThreadMessageType} },
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
