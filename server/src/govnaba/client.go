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
			for _, msg := range message.Process(cl.db) {
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

func NewClient(conn *websocket.Conn, uuid uuid.UUID, broadcastChannel chan Message, db *sqlx.DB) *Client {
	c := Client{make(chan Message, 5), broadcastChannel, uuid, conn, db}
	go c.writeLoop()
	go c.receiveLoop()
	return &c

}