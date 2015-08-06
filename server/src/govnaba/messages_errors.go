package govnaba

import (
	"encoding/json"
	"log"
)

const (
	ResourceDoesntExist = iota
	InvalidArguments
	InsufficientRights
)

// These messages are intended for signaling client's errors to themselves.
type InvalidRequestErrorMessage struct {
	MessageBase
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
	return Destination{DestinationType: ResponseDestination}
}

type FileUploadErrorMessage struct {
	MessageBase
}

func (msg *FileUploadErrorMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *FileUploadErrorMessage) GetDestination() Destination {
	return Destination{DestinationType: ResponseDestination}
}

// This message type is intended for notifying clients
// about an unsolvable error on the server's end.
type InternalServerErrorMessage struct {
	MessageBase
}

func (msg *InternalServerErrorMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *InternalServerErrorMessage) GetDestination() Destination {
	return Destination{DestinationType: ResponseDestination}
}
