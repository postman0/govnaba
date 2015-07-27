package main

import (
	"fmt"
	"github.com/gorilla/securecookie"
	"github.com/gorilla/websocket"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"gopkg.in/yaml.v2"
	"govnaba"
	"io/ioutil"
	"log"
	"net/http"
	"runtime"
	"strings"
	"time"
)

type Config struct {
	BindAddress     string
	CookieSecretKey string
	Database        struct {
		Host     string
		Port     string
		Name     string
		User     string
		Password string
	}
	SiteName        string
	MainPageContent string
	RulesContent    string
	BoardConfigs    map[string]govnaba.BoardConfig
}

var config Config

var secureCookie *securecookie.SecureCookie

var globalChannel chan govnaba.OutMessage

var db *sqlx.DB

// literally nothing
type placeholder struct{}

var newClientsChannel chan *govnaba.Client

// a map of maps which contain clients as keys and nothing as values
var clients map[int]map[*govnaba.Client]placeholder
var boardsClientsMap map[string]map[*govnaba.Client]placeholder

func sendMessage(msg govnaba.OutMessage) {
	dest := msg.GetDestination()
	if dest.DestinationType == govnaba.UserDestination {
		userClients, ok := clients[dest.Id]
		if !ok || (userClients == nil) {
			log.Println("no clients for msg %v", msg)
		} else {
			for cl := range userClients {
				if cl != nil {
					cl.WriteChannel <- msg
				}
			}
		}
	} else if dest.DestinationType == govnaba.BoardDestination {
		for client := range boardsClientsMap[dest.Board] {
			log.Printf("Sending message %v of type %T to client %v", msg, msg, *client)
			client.WriteChannel <- msg
		}
	}
}

// Send website config to the client
func sendConfig(cl *govnaba.Client) {
	configMsg := &govnaba.SiteConfigMessage{
		MessageBase:     govnaba.MessageBase{govnaba.SiteConfigMessageType, cl},
		SiteName:        config.SiteName,
		MainPageContent: config.MainPageContent,
		RulesContent:    config.RulesContent,
		BoardConfigs:    config.BoardConfigs,
	}
	cl.WriteChannel <- configMsg
}

// Handle broadcasts and new clients
func HandleClients() {
	for {
		select {
		case cl := <-newClientsChannel:
			{
				userClients, ok := clients[cl.Id]
				if !ok {
					clients[cl.Id] = map[*govnaba.Client]placeholder{
						cl: placeholder{},
					}
				} else {
					userClients[cl] = placeholder{}
				}
				sendConfig(cl)
			}
		case msg := <-globalChannel:
			{
				switch m := msg.(type) {
				case *govnaba.ClientDisconnectMessage:
					{
						close(m.Client.WriteChannel)
						delete(clients[m.Client.Id], m.Client)
						if len(clients[m.Client.Id]) == 0 {
							delete(clients, m.Client.Id)
						}
						for board, boardClients := range boardsClientsMap {
							delete(boardClients, m.Client)
							sendMessage(govnaba.NewUsersOnlineMessage(board, len(boardClients)))
						}
					}
				case *govnaba.ChangeLocationMessage:
					{
						log.Println(msg)
						for board, boardClients := range boardsClientsMap {
							delete(boardClients, m.Client)
							sendMessage(govnaba.NewUsersOnlineMessage(board, len(boardClients)))
						}
						if m.LocationType == govnaba.Board {
							boardClients, ok := boardsClientsMap[m.NewLocation]
							if ok {
								boardClients[m.Client] = placeholder{}
								sendMessage(govnaba.NewUsersOnlineMessage(m.NewLocation, len(boardClients)))
							} else {
								m.Client.WriteChannel <- &govnaba.InvalidRequestErrorMessage{
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
	confBytes, err := ioutil.ReadFile("config.yml")
	if err != nil {
		log.Fatalf("Got an error while reading config file: %s", err)
	}
	err = yaml.Unmarshal(confBytes, &config)
	if err != nil {
		log.Fatalf("Error in config file: %s", err)
	}

	server := http.Server{
		Addr:         config.BindAddress,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
	}
	upgrader := websocket.Upgrader{
		5 * time.Second,
		0, 0,
		nil, nil,
		func(r *http.Request) bool { return true },
	}

	secureCookie = securecookie.New([]byte(config.CookieSecretKey), nil)
	govnaba.SecureCookie = secureCookie
	globalChannel = make(chan govnaba.OutMessage, 10)
	newClientsChannel = make(chan *govnaba.Client, 10)
	clients = make(map[int]map[*govnaba.Client]placeholder)
	boardsClientsMap = make(map[string]map[*govnaba.Client]placeholder)
	db, err = sqlx.Connect("postgres", fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%s connect_timeout=5",
		config.Database.User, config.Database.Password,
		config.Database.Name, config.Database.Host, config.Database.Port))
	if err != nil {
		log.Fatalf("Couldn't connect to the database: %s", err)
	}
	db.Ping()

	rows, _ := db.Queryx(`SELECT name FROM boards;`)
	for rows.Next() {
		var boardName string
		rows.Scan(&boardName)
		boardsClientsMap[boardName] = make(map[*govnaba.Client]placeholder)
	}
	govnaba.SetupPostProcessors(config.BoardConfigs)
	go HandleClients()

	http.DefaultServeMux.HandleFunc("/connect", func(rw http.ResponseWriter, req *http.Request) {
		log.Printf("New client from %s", req.RemoteAddr)
		log.Printf("Current goroutine count: %d", runtime.NumGoroutine())
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
