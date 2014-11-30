package main

import (
	"net/http"
	"time"
	"errors"
	"log"
	"github.com/gorilla/websocket"
	"github.com/gorilla/securecookie"
	"code.google.com/p/go-uuid/uuid"
	"govnaba"
)

var cookieHashKey = []byte("sjnfi3wrv9	2j0edhwe7fhaerhgtewjfqhc3t0ewfsodc x nwhtrhyew9hw98fo")
var secureCookie *securecookie.SecureCookie
var globalChannel chan govnaba.GovnabaMessage
var newClientsChannel chan govnaba.Client
var clients []govnaba.Client

func getUUID(req *http.Request) (uuid.UUID, error) {
	cookie, err := req.Cookie("userid")
	if err != nil {
		return nil, err
	}
	var uuidStr string
	err = secureCookie.Decode("userid", cookie.Value, &uuidStr)
	if err != nil {
		return nil, err
	}
	uuid := uuid.Parse(uuidStr)
	if uuid == nil {
		return nil, errors.New("Couldn't decode UUID")
	}
	return uuid, nil
}

func AcceptNewClients() {
	i := 0
	for cl := range newClientsChannel {
		clients[i] = cl
	}
}

func BroadcastMessages() {
	for msg := range globalChannel {
		for _, client := range clients {
			client.WriteChannel <- msg
		}
	}
}

func main() {
	server := http.Server{
		Addr: "0.0.0.0:8080",
		ReadTimeout: 5 * time.Second,
		WriteTimeout: 5 * time.Second,
	}
	upgrader := websocket.Upgrader{
		5 * time.Second,
		0, 0,
		nil, nil,
		func (r *http.Request) bool { return true },
	}
	secureCookie = securecookie.New(cookieHashKey, nil)
	globalChannel = make(chan govnaba.GovnabaMessage, 10)
	newClientsChannel = make(chan govnaba.Client, 10)
	clients = make([]govnaba.Client, 20)
	go AcceptNewClients()
	go BroadcastMessages()
	http.DefaultServeMux.HandleFunc("/connect", func (rw http.ResponseWriter, req *http.Request) {
		log.Printf("New client from %s", req.RemoteAddr)
		uuid_cl, err := getUUID(req)
		var header http.Header = nil
		if err != nil {
			uuid_cl = uuid.NewRandom()
			header = make(map[string][]string)
			encoded_uuid, _ := secureCookie.Encode("userid", uuid_cl.String())
			cookie := http.Cookie{
				Name: "userid",
				Value: encoded_uuid,
				Expires: time.Now().AddDate(1, 0, 0),
			}
			header.Add("Set-Cookie", cookie.String())
		}
		conn, err := upgrader.Upgrade(rw, req, header)
		if err != nil {
			log.Printf("Upgrade failed: %v", err)
		} else {
			log.Printf("Client connected.")
		}
		_ = govnaba.NewClient(conn, uuid_cl, globalChannel)
	})		
	log.Println("Starting server...")
	server.ListenAndServe()
}