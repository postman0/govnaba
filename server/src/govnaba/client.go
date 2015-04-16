package govnaba

import (
	"code.google.com/p/go-uuid/uuid"
	"encoding/json"
	"github.com/gorilla/websocket"
	"github.com/jmoiron/sqlx"
	"log"
)

type Client struct {
	WriteChannel     chan OutMessage
	broadcastChannel chan OutMessage
	Id               uuid.UUID
	conn             *websocket.Conn
	db               *sqlx.DB
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
		messageType, success := m["MessageType"].(float64)
		if !success {
			log.Printf("Couldn't find message type in JSON")
			cl.WriteChannel <- NewProtocolErrorMessage(cl.Id)
			continue
		}
		messageConstructor := MessageConstructors[byte(messageType)]
		if messageConstructor == nil {
			log.Printf("Invalid message type")
			cl.WriteChannel <- NewProtocolErrorMessage(cl.Id)
			continue
		}
		message := messageConstructor()
		err = message.FromClient(cl, buf)
		if err != nil {
			log.Printf("Couldn't decode message: %s", err)
			cl.WriteChannel <- NewProtocolErrorMessage(cl.Id)
			continue
		}
		log.Printf("%v", message)
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

func NewClient(conn *websocket.Conn, uuid uuid.UUID, broadcastChannel chan OutMessage, db *sqlx.DB) *Client {
	c := Client{make(chan OutMessage, 5), broadcastChannel, uuid, conn, db}
	go c.writeLoop()
	go c.receiveLoop()
	return &c

}
