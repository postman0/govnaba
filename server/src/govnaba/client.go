package govnaba

import (
	"code.google.com/p/go-uuid/uuid"
	"github.com/gorilla/websocket"
)

type Client struct {
	WriteChannel chan<- GovnabaMessage
	Id uuid.UUID
	conn *websocket.Conn
}

func NewClient(conn *websocket.Conn, uuid uuid.UUID) *Client {
	c := Client{make(chan<- GovnabaMessage, 5), uuid, conn}
	return &c
}