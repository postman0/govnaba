package govnaba

import (
	"github.com/jmoiron/sqlx"
	"code.google.com/p/go-uuid/uuid"
)

const (
	ProtocolErrorMessageType = iota
	ClientDisconnectMessageType
)


type MessageConstructor func() Message
var MessageConstructors = [...](MessageConstructor){
	//func() Message { return nil },
	nil,
	nil,
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

/*type ChatMessage struct {
	MessageType byte
	From uuid.UUID
	Contents string
}

func NewChatMessage() *ChatMessage {
	return &ChatMessage{MessageType: ChatMessageType}
}
func (msg *ChatMessage) ToClient() string {
	msgBytes, _ := json.Marshal(msg)
	return string(msgBytes)
}

func (msg *ChatMessage) FromClient(cl *Client, msgString string) {
	var m map[string]interface{}
	_ = json.Unmarshal([]byte(msgString), &m)
	msg.MessageType = byte(m["MessageType"].(float64))
	msg.From = cl.Id
	msg.Contents, _ = m["Contents"].(string)
}

func (msg *ChatMessage) Process(db *sqlx.DB) []Message {
	log.Printf("%v", msg)
	return []Message{msg}
}
*/
