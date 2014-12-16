package govnaba

import (
	"encoding/json"
	"log"
	"code.google.com/p/go-uuid/uuid"
	"github.com/gorilla/websocket"
	"github.com/jmoiron/sqlx"
)

type Client struct {
	WriteChannel chan Message
	broadcastChannel chan Message
	Id uuid.UUID
	conn *websocket.Conn
	db *sqlx.DB
}

func (cl *Client) receiveLoop() {
	for {
		_, buf, err := cl.conn.ReadMessage()
		if err != nil {
			log.Printf("Error on reading from websocket: %v", err)
			cl.broadcastChannel <- NewClientDisconnectMessage(cl.Id)
			return
		}
		var m map[string]interface{}
		err = json.Unmarshal(buf, &m)
		if err != nil {
			log.Printf("JSON unmarshalling error: %v", err)
			cl.WriteChannel <- NewProtocolErrorMessage(cl.Id)
			continue
		}
		constructorIndex, success := m["MessageType"].(float64)
		if !success {
			log.Printf("Couldn't find message type in JSON")
			cl.WriteChannel <- NewProtocolErrorMessage(cl.Id)
			continue
		}
		if int(constructorIndex) >= len(MessageConstructors) {
			log.Printf("Unknown message type")
			cl.WriteChannel <- NewProtocolErrorMessage(cl.Id)
			continue
		}
		messageConstructor := MessageConstructors[byte(constructorIndex)]
		if messageConstructor == nil {
			log.Printf("Tried to receive internal message from client")
			cl.WriteChannel <- NewProtocolErrorMessage(cl.Id)
			continue
		}
		message := messageConstructor()
		err = message.FromClient(cl, buf)
		if err != nil {
			log.Printf("Couldn't decode message")
			cl.WriteChannel <- NewProtocolErrorMessage(cl.Id)
			continue
		}
		go func() {
			for _, msg := range message.Process(cl.db) {
				cl.broadcastChannel <- msg
			}
		}()
	}
}

func (cl *Client) writeLoop() {
	for message := range cl.WriteChannel {
		cl.conn.WriteMessage(websocket.TextMessage, message.ToClient())
	}
}

func NewClient(conn *websocket.Conn, uuid uuid.UUID, broadcastChannel chan Message, db *sqlx.DB) *Client {
	c := Client{make(chan Message, 5), broadcastChannel, uuid, conn, db}
	go c.writeLoop()
	go c.receiveLoop()
	return &c

}