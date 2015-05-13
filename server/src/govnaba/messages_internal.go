package govnaba

import (
	"encoding/json"
	_ "errors"
	"github.com/gorilla/securecookie"
	"github.com/jmoiron/sqlx"
	"log"
)

// These messages help main broadcast goroutine to remove structs related to disconnected clients.
// Its methods should be never called.
type ClientDisconnectMessage struct {
	MessageBase
}

func NewClientDisconnectMessage(cl *Client) *ClientDisconnectMessage {
	return &ClientDisconnectMessage{MessageBase{ClientDisconnectMessageType, cl}}
}

func (msg *ClientDisconnectMessage) ToClient() []byte {
	log.Fatalln("Tried to call ToClient on a disconnection message")
	return nil
}

func (msg *ClientDisconnectMessage) GetDestination() Destination {
	log.Fatalln("Tried to call GetDestination on a disconnection message")
	return Destination{}
}

type UsersOnlineMessage struct {
	MessageBase
	Board string
	Count int
}

func (msg *UsersOnlineMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *UsersOnlineMessage) GetDestination() Destination {
	return Destination{BoardDestination, msg.Board, 0}
}

func NewUsersOnlineMessage(board string, count int) *UsersOnlineMessage {
	return &UsersOnlineMessage{
		MessageBase{UsersOnlineMessageType, nil},
		board,
		count,
	}
}

// This message is used to signal the client that it sent a wrong message.
type ProtocolErrorMessage struct {
	MessageBase
}

func NewProtocolErrorMessage(cl *Client) *ProtocolErrorMessage {
	return &ProtocolErrorMessage{MessageBase{ProtocolErrorMessageType, cl}}
}

func (msg *ProtocolErrorMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *ProtocolErrorMessage) GetDestination() Destination {
	return Destination{ClientDestination, "", msg.Client.Id}
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
	MessageBase
	LocationType byte
	NewLocation  string
}

func (msg *ChangeLocationMessage) ToClient() []byte {
	return nil
}

func (msg *ChangeLocationMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
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
	MessageBase
	Filename string
}

func (msg *FileUploadSuccessfulMessage) GetDestination() Destination {
	return Destination{ClientDestination, "", msg.Client.Id}
}

func (msg *FileUploadSuccessfulMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

var SecureCookie *securecookie.SecureCookie

type UserLoginMessage struct {
	MessageBase
	Key string
}

type UserLoginSuccessfulMessage struct {
	MessageBase
	Cookie string
}

func (msg *UserLoginMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	return nil
}

func (msg *UserLoginMessage) Process(db *sqlx.DB) []OutMessage {
	if len(msg.Key) > 64 || len(msg.Key) < 1 {
		return []OutMessage{&InvalidRequestErrorMessage{
			MessageBase{InvalidRequestErrorMessageType, msg.Client},
			InvalidArguments,
			"The key has invalid length.",
		}}
	}
	userId := 0
	const query = `WITH new_row AS (
		INSERT INTO users (key)
		SELECT $1::varchar
		WHERE NOT EXISTS (SELECT * FROM users WHERE key = $1)
		RETURNING *
		)
		SELECT id FROM new_row
		UNION
		SELECT id FROM users WHERE key = $1::varchar;`
	err := db.Get(&userId, query, msg.Key)
	if err != nil {
		log.Printf("%#v", err)
	}
	cook, err := SecureCookie.Encode("userid", userId)
	if err != nil {
		log.Println(err)
	}
	log.Println(userId)
	return []OutMessage{
		&UserLoginSuccessfulMessage{
			MessageBase{UserLoginSuccessfulMessageType, msg.Client},
			cook,
		},
	}
}

func (msg *UserLoginSuccessfulMessage) GetDestination() Destination {
	return Destination{ClientDestination, "", msg.Client.Id}
}

func (msg *UserLoginSuccessfulMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}
