package govnaba

import (
	"encoding/json"
	"log"
	"code.google.com/p/go-uuid/uuid"
	"github.com/gorilla/websocket"
)

type Client struct {
	WriteChannel chan GovnabaMessage
	broadcastChannel chan GovnabaMessage
	Id uuid.UUID
	conn *websocket.Conn
}

func (cl *Client) receiveLoop() {
	for {
		_, buf, err := cl.conn.ReadMessage()
		if err != nil {
			log.Printf("%v", err)
		}
		var m map[string]interface{}
		err = json.Unmarshal(buf, &m)
		if err != nil {
			log.Printf("%v", err)
		}
		message := MessageConstructors[byte(m["MessageType"].(float64))]()
		message.FromClient(cl, string(buf))
		go func() {
			for _, msg := range message.Process() {
				cl.broadcastChannel <- msg
			}
		}()
	}
}

func (cl *Client) writeLoop() {
	for message := range cl.WriteChannel {
		cl.conn.WriteMessage(websocket.TextMessage, []byte(message.ToClient()))
	}
}

func NewClient(conn *websocket.Conn, uuid uuid.UUID, broadcastChannel chan GovnabaMessage) *Client {
	c := Client{make(chan GovnabaMessage, 5), broadcastChannel, uuid, conn}
	go c.writeLoop()
	go c.receiveLoop()
	return &c

}