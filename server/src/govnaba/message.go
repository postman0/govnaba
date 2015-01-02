package govnaba

import (
	"github.com/jmoiron/sqlx"
	"code.google.com/p/go-uuid/uuid"
)

const (
	ProtocolErrorMessageType = iota
	ClientDisconnectMessageType
	CreateThreadMessageType
)


type MessageConstructor func() Message
var MessageConstructors = [...](MessageConstructor){
	//func() Message { return nil },
	nil,
	nil,
	func() Message { return NewCreateThreadMessage() },
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
	Board string
	Id uuid.UUID
}
