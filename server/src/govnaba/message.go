package govnaba

import (
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
	InvalidRequestErrorMessageType
	FileUploadErrorMessageType
	InternalServerErrorMessageType
	UserLoginMessageType
	UserLoginSuccessfulMessageType
	PostingSuccesfulMessageType
)

// This type is used in reconstructing messages sent by clients.
// Members of this type should return a structure conforming to InMessage
// with MessageType field set to its corresponding type constant.
type MessageConstructor func(*Client) InMessage

// Available message constructors.
var MessageConstructors = map[byte]MessageConstructor{
	CreateThreadMessageType: func(cl *Client) InMessage {
		return &CreateThreadMessage{MessageBase: MessageBase{CreateThreadMessageType, cl}}
	},
	ChangeLocationMessageType: func(cl *Client) InMessage {
		return &ChangeLocationMessage{MessageBase: MessageBase{ChangeLocationMessageType, cl}}
	},
	AddPostMessageType: func(cl *Client) InMessage { return &AddPostMessage{MessageBase: MessageBase{AddPostMessageType, cl}} },
	GetBoardsMessageType: func(cl *Client) InMessage {
		return &GetBoardsMessage{MessageBase: MessageBase{GetBoardsMessageType, cl}}
	},
	GetBoardThreadsMessageType: func(cl *Client) InMessage {
		return &GetBoardThreadsMessage{MessageBase: MessageBase{GetBoardThreadsMessageType, cl}}
	},
	GetThreadMessageType: func(cl *Client) InMessage {
		return &GetThreadMessage{MessageBase: MessageBase{GetThreadMessageType, cl}}
	},
	UserLoginMessageType: func(cl *Client) InMessage {
		return &UserLoginMessage{MessageBase: MessageBase{UserLoginMessageType, cl}}
	},
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

type MessageBase struct {
	MessageType int
	Client      *Client `json:"-"`
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
	Id              int
}
