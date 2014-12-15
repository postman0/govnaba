package govnaba

import (
	"encoding/json"
	"log"
	"github.com/jmoiron/sqlx"
	"code.google.com/p/go-uuid/uuid"
)

const (
	ChatMessageType = iota
)


type MessageConstructor func() Message
var MessageConstructors = [...](MessageConstructor){
	func() Message { return NewChatMessage() },
}

type Message interface {
	ToClient() string
	FromClient(*Client, string)
	Process(*sqlx.DB) []Message
}

type ChatMessage struct {
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

