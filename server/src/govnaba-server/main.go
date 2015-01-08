package main

import (
	"code.google.com/p/go-uuid/uuid"
	"errors"
	"flag"
	"fmt"
	"github.com/gorilla/securecookie"
	"github.com/gorilla/websocket"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"govnaba"
	"log"
	"net/http"
	"time"
)

var bindAddress = flag.String("address", "0.0.0.0:8080", "address and port for the server to listen on")
var cookieHashKey = flag.String("secret", "sjnfi3wrv9	2j0edhwe7fhaerhgtewjfqhc3t0ewfsodc x nwhtrhyew9hw98fo", "secret key used for secure cookies")
var dbHost = flag.String("dbhost", "localhost", "postgresql server address")
var dbPort = flag.String("dbport", "5432", "postgresql server port")
var dbName = flag.String("dbname", "govnaba", "postgresql database name")
var dbUser = flag.String("dbuser", "postgres", "postgresql username")
var dbPassword = flag.String("dbpassword", "postgres", "postgresql user password")

var secureCookie *securecookie.SecureCookie

var globalChannel chan govnaba.OutMessage

var db *sqlx.DB

var newClientsChannel chan *govnaba.Client
var clients map[string]*govnaba.Client
var boardsClientsMap map[string]map[string]*govnaba.Client

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

func sendMessage(msg govnaba.OutMessage) {
	log.Printf("%v", msg)
	dest := msg.GetDestination()
	if dest.DestinationType == govnaba.ClientDestination {
		clients[dest.Id.String()].WriteChannel <- msg
	} else if dest.DestinationType == govnaba.BoardDestination {
		for _, client := range boardsClientsMap[dest.Board] {
			log.Printf("Sending message %v of type %T to client %v", msg, msg, *client)
			client.WriteChannel <- msg
		}
	}
}

// Handle broadcasts and new clients
func HandleClients() {
	for {
		select {
		case cl := <-newClientsChannel:
			{
				clients[cl.Id.String()] = cl
			}
		case msg := <-globalChannel:
			{
				switch m := msg.(type) {
				case *govnaba.ClientDisconnectMessage:
					{
						delete(clients, m.Id.String())
						for _, boardClients := range boardsClientsMap {
							delete(boardClients, m.Id.String())
						}
					}
				case *govnaba.ChangeLocationMessage:
					{
						log.Println(msg)
						for _, boardClients := range boardsClientsMap {
							delete(boardClients, m.Id.String())
						}
						if m.LocationType == govnaba.Board {
							boardClients := boardsClientsMap[m.NewLocation]
							boardClients[m.Id.String()] = clients[m.Id.String()]
						}
						log.Printf("%v", boardsClientsMap)
					}
				default:
					sendMessage(msg)
				}
			}
		}
	}
}

func main() {
	flag.Parse()

	server := http.Server{
		Addr:         *bindAddress,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
	}
	upgrader := websocket.Upgrader{
		5 * time.Second,
		0, 0,
		nil, nil,
		func(r *http.Request) bool { return true },
	}

	secureCookie = securecookie.New([]byte(*cookieHashKey), nil)
	globalChannel = make(chan govnaba.OutMessage, 10)
	newClientsChannel = make(chan *govnaba.Client, 10)
	clients = make(map[string]*govnaba.Client)
	boardsClientsMap = make(map[string]map[string]*govnaba.Client)
	db, err := sqlx.Connect("postgres", fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%s connect_timeout=5",
		*dbUser, *dbPassword, *dbName, *dbHost, *dbPort))
	if err != nil {
		log.Fatalln("Couldn't connect to the database")
	}
	db.Ping()

	rows, _ := db.Queryx(`SELECT name FROM boards;`)
	for rows.Next() {
		var boardName string
		rows.Scan(&boardName)
		boardsClientsMap[boardName] = make(map[string]*govnaba.Client)
	}
	go HandleClients()

	http.DefaultServeMux.HandleFunc("/connect", func(rw http.ResponseWriter, req *http.Request) {
		log.Printf("New client from %s", req.RemoteAddr)
		uuid_cl, err := getUUID(req)
		var header http.Header = nil
		if err != nil {
			uuid_cl = uuid.NewRandom()
			header = make(map[string][]string)
			encoded_uuid, _ := secureCookie.Encode("userid", uuid_cl.String())
			cookie := http.Cookie{
				Name:    "userid",
				Value:   encoded_uuid,
				Expires: time.Now().AddDate(1, 0, 0),
			}
			header.Add("Set-Cookie", cookie.String())
			db.MustExec(`INSERT INTO users (client_id) VALUES ($1);`, uuid_cl.String())
		}
		conn, err := upgrader.Upgrade(rw, req, header)
		if err != nil {
			log.Printf("Upgrade failed: %v", err)
		} else {
			log.Printf("Client connected.")
		}
		newClientsChannel <- govnaba.NewClient(conn, uuid_cl, globalChannel, db)
	})
	log.Println("Starting server...")
	server.ListenAndServe()
}
