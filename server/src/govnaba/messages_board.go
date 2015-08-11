package govnaba

import (
	"encoding/json"
	_ "errors"
	"github.com/jmoiron/sqlx"
	"log"
)

// This message is used for requesting available boards list
type GetBoardsMessage struct {
	MessageBase
}

func (msg *GetBoardsMessage) FromClient(cl *Client, msgBytes []byte) error {
	return nil
}

func (msg *GetBoardsMessage) Process(db *sqlx.DB) []OutMessage {
	boards := BoardListMessage{
		MessageBase: MessageBase{BoardListMessageType, msg.Client},
		Boards:      make([]string, 16),
	}
	rows, _ := db.Queryx(`SELECT name FROM boards;`)
	i := 0
	for rows.Next() {
		rows.Scan(&boards.Boards[i])
		i++
	}
	return []OutMessage{&boards}
}

// This message is used for sending available boards to the client.
type BoardListMessage struct {
	MessageBase
	Boards []string
}

func (msg *BoardListMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *BoardListMessage) GetDestination() Destination {
	return Destination{DestinationType: ResponseDestination}
}

// This message is used for requesting a set of threads from some board.
type GetBoardThreadsMessage struct {
	MessageBase
	Board string
	// How many threads to return
	Count int
	// How many threads*Count to skip. This can be used for pagination.
	SkipBatches int
}

type PostWithNum struct {
	Post
	PostNum int
}

// This is used for sending requested threads to the client.
type BoardThreadListMessage struct {
	MessageBase
	Board string
	// A slice of threads where each thread is a slice of Post's.
	Threads [][]PostWithNum
}

func (msg *GetBoardThreadsMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	return nil
}

func (msg *GetBoardThreadsMessage) Process(db *sqlx.DB) []OutMessage {
	// dats a bigass query
	// probably slow as fuck
	const query = `
	SELECT thread_id AS threadid, board_local_id AS localid, created_date AS date, user_id AS userid, 
		is_locked AS islocked, is_pinned AS ispinned, topic, contents, attrs, postnum
	FROM (SELECT *, row_number() OVER (PARTITION BY thread_id ORDER BY is_op DESC, board_local_id DESC) AS rnum,
			row_number() OVER (PARTITION BY thread_id ORDER BY is_op DESC, board_local_id ASC) as postnum FROM 
			(SELECT id, last_bump_date, is_pinned, is_locked FROM threads where board_id = (SELECT id FROM boards WHERE name = $1) ORDER BY is_pinned DESC, last_bump_date DESC LIMIT $2 OFFSET $3 * $2::integer) AS top_threads
			INNER JOIN
			posts
			ON thread_id = top_threads.id) AS posts_rnum
	WHERE rnum <= 6
	ORDER BY is_pinned DESC, last_bump_date DESC, board_local_id ASC;`

	posts := []PostWithNum{}
	err := db.Select(&posts, query, msg.Board, msg.Count, msg.SkipBatches)
	if err != nil {
		// this never fails, it returns empty results instead
		log.Printf("%#v", err)
		return nil
	}
	answer := BoardThreadListMessage{
		MessageBase: MessageBase{BoardThreadListMessageType, msg.Client},
		Board:       msg.Board,
		Threads:     [][]PostWithNum{},
	}
	currThreadId := -1
	thrIndex := -1
	for _, post := range posts {
		if post.UserId == msg.Client.Id {
			post.Attrs.Put("own", true)
		}
		if currThreadId != post.ThreadId {
			answer.Threads = append(answer.Threads, []PostWithNum{})
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
	return Destination{DestinationType: ResponseDestination}
}
