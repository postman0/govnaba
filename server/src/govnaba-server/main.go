package main

import (
	_ "errors"
	"flag"
	"fmt"
	"github.com/gorilla/securecookie"
	"github.com/gorilla/websocket"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"govnaba"
	"log"
	"net/http"
	"strings"
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
var clients map[int]*govnaba.Client
var boardsClientsMap map[string]map[int]*govnaba.Client

func sendMessage(msg govnaba.OutMessage) {
	dest := msg.GetDestination()
	if dest.DestinationType == govnaba.ClientDestination {
		clients[dest.Id].WriteChannel <- msg
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
				clients[cl.Id] = cl
			}
		case msg := <-globalChannel:
			{
				switch m := msg.(type) {
				case *govnaba.ClientDisconnectMessage:
					{
						delete(clients, m.Client.Id)
						for _, boardClients := range boardsClientsMap {
							delete(boardClients, m.Client.Id)
						}
					}
				case *govnaba.ChangeLocationMessage:
					{
						log.Println(msg)
						for _, boardClients := range boardsClientsMap {
							delete(boardClients, m.Client.Id)
						}
						if m.LocationType == govnaba.Board {
							boardClients, ok := boardsClientsMap[m.NewLocation]
							if ok {
								boardClients[m.Client.Id] = clients[m.Client.Id]
							} else {
								clients[m.Client.Id].WriteChannel <- &govnaba.InvalidRequestErrorMessage{
									govnaba.MessageBase{govnaba.InvalidRequestErrorMessageType, m.Client},
									govnaba.ResourceDoesntExist,
									"Board doesn't exist",
								}
							}
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

func getUserFromIP(req *http.Request) (int, http.Header) {
	var userID int = 0
	const query = `WITH new_row AS (
		INSERT INTO users (ip)
		SELECT $1
		WHERE NOT EXISTS (SELECT * FROM users WHERE ip = $1)
		RETURNING *
		)
		SELECT id FROM new_row
		UNION
		SELECT id FROM users WHERE ip = $1;`
	err := db.Get(&userID, query, strings.Split(req.RemoteAddr, ":")[0])
	if err != nil {
		log.Fatalf("New user creation failed: %s", err)
		return 0, nil
	} else {
		var header http.Header
		header = make(map[string][]string)
		encId, _ := secureCookie.Encode("userid", userID)
		log.Println(encId)
		cookie := http.Cookie{
			Name:    "userid",
			Value:   encId,
			Expires: time.Now().AddDate(1, 0, 0),
		}
		header.Add("Set-Cookie", cookie.String())
		return userID, header
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
	govnaba.SecureCookie = secureCookie
	globalChannel = make(chan govnaba.OutMessage, 10)
	newClientsChannel = make(chan *govnaba.Client, 10)
	clients = make(map[int]*govnaba.Client)
	boardsClientsMap = make(map[string]map[int]*govnaba.Client)
	var err error
	db, err = sqlx.Connect("postgres", fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%s connect_timeout=5",
		*dbUser, *dbPassword, *dbName, *dbHost, *dbPort))
	if err != nil {
		log.Fatalln("Couldn't connect to the database")
	}
	db.Ping()

	rows, _ := db.Queryx(`SELECT name FROM boards;`)
	for rows.Next() {
		var boardName string
		rows.Scan(&boardName)
		boardsClientsMap[boardName] = make(map[int]*govnaba.Client)
	}
	go HandleClients()

	http.DefaultServeMux.HandleFunc("/connect", func(rw http.ResponseWriter, req *http.Request) {
		log.Printf("New client from %s", req.RemoteAddr)
		var userId int = 0
		c, err := req.Cookie("userid")
		if err == nil {
			err = secureCookie.Decode("userid", c.Value, &userId)
		}
		var header http.Header = nil
		if err != nil {
			log.Printf("cookie decoding error: %s", err)
			userId, header = getUserFromIP(req)
		}
		conn, err := upgrader.Upgrade(rw, req, header)
		if err != nil {
			log.Printf("Upgrade failed: %v", err)
		} else {
			log.Printf("User id %d connected.", userId)
		}
		newClientsChannel <- govnaba.NewClient(conn, userId, globalChannel, db)
	})
	log.Println("Starting server...")
	server.ListenAndServe()
}
