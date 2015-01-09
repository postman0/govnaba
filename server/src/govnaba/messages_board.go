package govnaba

import (
	"code.google.com/p/go-uuid/uuid"
	"encoding/json"
	_ "errors"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq/hstore"
	"log"
	"time"
)

type GetBoardsMessage struct {
	MessageType byte
	ClientId    uuid.UUID
}

func (msg *GetBoardsMessage) FromClient(cl *Client, msgBytes []byte) error {
	msg.ClientId = cl.Id
	return nil
}

func (msg *GetBoardsMessage) Process(db *sqlx.DB) []OutMessage {
	boards := BoardListMessage{MessageType: BoardListMessageType, Boards: make([]string, 16)}
	boards.ClientId = msg.ClientId
	rows, _ := db.Queryx(`SELECT name FROM boards;`)
	i := 0
	for rows.Next() {
		rows.Scan(&boards.Boards[i])
		i++
	}
	return []OutMessage{&boards}
}

type BoardListMessage struct {
	MessageType byte
	ClientId    uuid.UUID `json:"-"`
	Boards      []string
}

func (msg *BoardListMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *BoardListMessage) GetDestination() Destination {
	return Destination{DestinationType: ClientDestination, Id: msg.ClientId}
}

type GetBoardThreadsMessage struct {
	MessageType byte
	ClientId    uuid.UUID
	Board       string
	Count       int
	SkipBatches int
}

type Post struct {
	ThreadId int `json:"-"`
	LocalId  int
	Topic    string
	Contents string
	Date     time.Time
	Attrs    hstore.Hstore `json:"-"`
}

type BoardThreadListMessage struct {
	MessageType byte
	ClientId    uuid.UUID `json:"-"`
	Board       string
	Threads     [][]Post
}

func (msg *GetBoardThreadsMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	msg.ClientId = cl.Id
	return nil
}

func (msg *GetBoardThreadsMessage) Process(db *sqlx.DB) []OutMessage {
	const query = `
	SELECT thread_id AS threadid, board_local_id AS localid, created_date AS date, topic, contents, attrs
	FROM (SELECT *, row_number() OVER (PARTITION BY thread_id ORDER BY is_op DESC, board_local_id DESC) AS rnum FROM 
			(SELECT id, last_bump_date FROM threads where board_id = (SELECT id FROM boards WHERE name = $1) ORDER BY last_bump_date DESC LIMIT $2 OFFSET $3 * $2::integer) AS top_threads
			INNER JOIN
			posts
			ON thread_id = top_threads.id) AS posts_rnum
	WHERE rnum <= 6
	ORDER BY last_bump_date DESC, board_local_id ASC;`

	posts := []Post{}
	err := db.Select(&posts, query, msg.Board, msg.Count, msg.SkipBatches)
	if err != nil {
		log.Println(err)
		return nil
		// todo: handle
	}
	answer := BoardThreadListMessage{
		MessageType: BoardThreadListMessageType,
		ClientId:    msg.ClientId,
		Board:       msg.Board,
		Threads:     [][]Post{},
	}
	currThreadId := -1
	thrIndex := -1
	for _, post := range posts {
		if currThreadId != post.ThreadId {
			answer.Threads = append(answer.Threads, []Post{})
			thrIndex++
			currThreadId = post.ThreadId
		}
		answer.Threads[thrIndex] = append(answer.Threads[thrIndex], post)
	}
	return []OutMessage{&answer}
}

func (msg *BoardThreadListMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *BoardThreadListMessage) GetDestination() Destination {
	return Destination{DestinationType: ClientDestination, Id: msg.ClientId}
}
