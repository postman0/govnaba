package govnaba

import (
	"code.google.com/p/go-uuid/uuid"
	"encoding/json"
	"log"
)

const (
	ResourceDoesntExist = iota
	InvalidArguments
)

// These messages are intended for signaling client's errors to themselves.
type InvalidRequestErrorMessage struct {
	MessageType  byte
	ClientId     uuid.UUID `json:"-"`
	ErrorType    byte
	ErrorMessage string
}

func (msg *InvalidRequestErrorMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *InvalidRequestErrorMessage) GetDestination() Destination {
	return Destination{DestinationType: ClientDestination, Id: msg.ClientId}
}

type FileUploadErrorMessage struct {
	MessageType byte
	ClientId    uuid.UUID `json:"-"`
}

func (msg *FileUploadErrorMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *FileUploadErrorMessage) GetDestination() Destination {
	return Destination{DestinationType: ClientDestination, Id: msg.ClientId}
}

// This message type is intended for notifying clients
// about an unsolvable error on the server's end.
type InternalServerErrorMessage struct {
	MessageType byte
	ClientId    uuid.UUID `json:"-"`
}

func (msg *InternalServerErrorMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *InternalServerErrorMessage) GetDestination() Destination {
	return Destination{DestinationType: ClientDestination, Id: msg.ClientId}
}
