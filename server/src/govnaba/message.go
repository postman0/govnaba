package govnaba

import (
	"encoding/json"
	"log"
	"code.google.com/p/go-uuid/uuid"
)

const (
	ChatMessageType = iota
)


type MessageConstructor func() GovnabaMessage
var MessageConstructors = [...](MessageConstructor){
	func() GovnabaMessage { return NewChatMessage() },
}

type GovnabaMessage interface {
	ToClient() string
	FromClient(*Client, string)
	Process() []GovnabaMessage
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
	_ = json.Unmarshal([]byte(msgString), m)
	msg.MessageType, _ = m["MessageType"].(byte)
	msg.From = cl.Id
	msg.Contents, _ = m["Contents"].(string)
}

func (msg *ChatMessage) Process() []GovnabaMessage {
	log.Println("%v", msg)
	return []GovnabaMessage{msg}
}

