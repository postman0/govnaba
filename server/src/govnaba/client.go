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
			log.Println("%v", err)
		}
		var m map[string]interface{}
		err = json.Unmarshal(buf, m)
		if err != nil {
			log.Println("%v, err")
		}
		message := MessageConstructors[m["MessageType"].(byte)]()
		message.FromClient(cl, string(buf))
		go func() {
			for _, msg := range message.Process() {
				cl.broadcastChannel <- msg
			}
		}()
	}
}

func (cl *Client) writeLoop() {
	message := <-cl.WriteChannel
	cl.conn.WriteMessage(websocket.TextMessage, []byte(message.ToClient()))
}

func NewClient(conn *websocket.Conn, uuid uuid.UUID, broadcastChannel chan GovnabaMessage) *Client {
	c := Client{make(chan GovnabaMessage, 5), broadcastChannel, uuid, conn}
	go c.writeLoop()
	go c.receiveLoop()
	return &c

}