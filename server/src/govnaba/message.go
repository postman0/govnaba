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
)

type MessageConstructor func() Message

var MessageConstructors = [...](MessageConstructor){
	//func() Message { return nil },
	nil,
	nil,
	func() Message { return NewCreateThreadMessage() },
	func() Message { return NewChangeLocationMessage() },
	func() Message { return NewAddPostMessage() },
}

type Message interface {
	ToClient() []byte
	FromClient(*Client, []byte) error
	Process(*sqlx.DB) []Message
	GetDestination() Destination
}

const (
	ClientDestination = iota
	BoardDestination
)

type Destination struct {
	DestinationType byte
	Board           string
	Id              uuid.UUID
}
