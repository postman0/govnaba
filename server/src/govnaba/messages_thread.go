package govnaba

import (
	"code.google.com/p/go-uuid/uuid"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"log"
	"time"
)

// An utility type for unmarshallling attributes from the database.
type PostAttributes map[string]interface{}

// This shows what post processors are used for various boards.
// Processors will be called in the order of their placement in the slice.
var EnabledPostProcessors = map[string][]PostProcessor{
	"test": []PostProcessor{ImageProcessor},
}

// Scan unmarshals JSON into a map[string]interface{}.
// If the value is NULL then the result is a nil map.
func (pa *PostAttributes) Scan(src interface{}) error {
	switch src.(type) {
	case []byte:
		err := json.Unmarshal(src.([]byte), pa)
		if err != nil {
			return errors.New(fmt.Sprintf("Invalid JSON: %s.", err))
		}
	case string:
		err := json.Unmarshal([]byte(src.(string)), pa)
		if err != nil {
			return errors.New(fmt.Sprintf("Invalid JSON: %s.", err))
		}
	case nil:
		// do nothing, nil map
	default:
		return errors.New("Unsuitable value for post attributes.")
	}
	return nil
}

// Value marshals the map into JSON.
func (pa PostAttributes) Value() (driver.Value, error) {
	b, err := json.Marshal(pa)
	if err != nil {
		return []byte{}, errors.New(fmt.Sprintf("Can't marshal attributes to JSON: %s", err))
	} else {
		return b, nil
	}
}

// Helper struct used in various situations.
type Post struct {
	Board string `json:"-"`
	// Parent thread's id on the board?
	ThreadId int `json:"-"`
	// Post's id on the board?
	LocalId  int
	Topic    string
	Contents string
	Date     time.Time
	Attrs    PostAttributes
}

// These messages are used for both creating new threads
// and notifying other client about a new thread.
type CreateThreadMessage struct {
	MessageType byte
	ClientId    uuid.UUID `json:"-"`
	Board       string
	Topic       string
	Contents    string
	Date        time.Time
	Attrs       PostAttributes
	// dunno for what this is used, apparently this is database-local thread id
	// and clients have no business knowing it
	ThreadId int
	// Board-related id
	LocalId int
}

func (msg *CreateThreadMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	msg.ClientId = cl.Id
	return nil
}

// Process for these messages checks if the board exists, applies post processors for the board,
// creates a new thread and the op-post.
func (msg *CreateThreadMessage) Process(db *sqlx.DB) []OutMessage {
	row := db.QueryRowx(`SELECT EXISTS(SELECT 1 FROM boards WHERE name = $1);`, msg.Board)
	var boardExists bool
	row.Scan(&boardExists)
	if !boardExists {
		log.Printf("Tried to post into invalid board /%s/", msg.Board)
		return []OutMessage{&InvalidRequestErrorMessage{
			InvalidRequestErrorMessageType,
			msg.ClientId,
			ResourceDoesntExist,
			"Board doesnt exist",
		}}
	}
	p := Post{
		Board:    msg.Board,
		Topic:    msg.Topic,
		Contents: msg.Contents,
		Attrs:    msg.Attrs,
	}
	var err error = nil
	for _, pp := range EnabledPostProcessors[msg.Board] {
		err = pp(msg.ClientId, &p)
		if err != nil {
			log.Printf("Invalid post: %s", err)
			return []OutMessage{&InvalidRequestErrorMessage{
				InvalidRequestErrorMessageType,
				msg.ClientId,
				InvalidArguments,
				err.Error(),
			}}
		}
	}
	msg.Board = p.Board
	msg.Topic = p.Topic
	msg.Contents = p.Contents
	msg.Attrs = p.Attrs
	tx := db.MustBegin()
	row = tx.QueryRowx(`INSERT INTO threads (board_id) VALUES ((SELECT id FROM boards WHERE name = $1)) RETURNING id;`, msg.Board)
	var thread_id int
	err = row.Scan(&thread_id)
	if err != nil {
		log.Printf("%#v", err)
	}
	err = tx.Get(msg, `INSERT INTO posts (user_id, thread_id, board_local_id, topic, contents, attrs, is_op) 
		VALUES (NULL, $1, nextval($2 || '_board_id_seq'), $3, $4, $5, TRUE)
		RETURNING board_local_id AS localid, created_date AS date;`,
		thread_id, msg.Board, msg.Topic, msg.Contents, msg.Attrs)
	tx.Commit()
	if err != nil {
		log.Printf("%#v", err)
		return nil
		// todo: return error
	}
	//TODO: determine why the fuck this is needed
	msg.ThreadId = thread_id
	return []OutMessage{msg}
}

func (msg *CreateThreadMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *CreateThreadMessage) GetDestination() Destination {
	return Destination{DestinationType: BoardDestination, Board: msg.Board}
}

// AddPostMessage is used for creating new posts
// and notifying other clients on the board about those posts.
type AddPostMessage struct {
	MessageType byte
	ClientId    uuid.UUID `json:"-"`
	Board       string
	Topic       string
	Contents    string
	Attrs       PostAttributes
	Date        time.Time
	// Parent thread id
	ThreadLocalId int
	// This post's id
	AnswerLocalId int
}

func (msg *AddPostMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	msg.ClientId = cl.Id
	return nil
}

// Process applies post processors to the new post and stores it in the database.
func (msg *AddPostMessage) Process(db *sqlx.DB) []OutMessage {

	p := Post{
		Board:    msg.Board,
		Topic:    msg.Topic,
		Contents: msg.Contents,
		Attrs:    msg.Attrs,
		ThreadId: msg.ThreadLocalId,
	}
	var err error = nil
	for _, pp := range EnabledPostProcessors[msg.Board] {
		err = pp(msg.ClientId, &p)
		if err != nil {
			log.Printf("Invalid post: %s", err)
			return []OutMessage{&InvalidRequestErrorMessage{
				InvalidRequestErrorMessageType,
				msg.ClientId,
				InvalidArguments,
				err.Error(),
			}}
		}
	}
	msg.Board = p.Board
	msg.Topic = p.Topic
	msg.Contents = p.Contents
	msg.Attrs = p.Attrs
	msg.ThreadLocalId = p.ThreadId
	const insertPostQuery = `INSERT INTO posts (user_id, thread_id, topic, contents, attrs, board_local_id) VALUES 
		((SELECT users.id FROM users WHERE client_id = $1),
		(SELECT threads.id FROM threads, boards, posts WHERE board_id = boards.id AND thread_id = threads.id AND boards.name = $2 AND posts.board_local_id = $3),
		$4,
		$5,
		$6,
		nextval($2 || '_board_id_seq')
		) RETURNING posts.board_local_id, created_date;`

	tx := db.MustBegin()
	row := tx.QueryRowx(insertPostQuery, msg.ClientId.String(),
		msg.Board, msg.ThreadLocalId, msg.Topic, msg.Contents, msg.Attrs)
	var answerId int
	var date time.Time
	err = row.Scan(&answerId, &date)
	if err != nil {
		tx.Rollback()
		log.Printf("%#v", err)
		// todo: return error
		return nil
	}
	tx.Exec(`UPDATE threads SET last_bump_date = DEFAULT WHERE id = (SELECT thread_id FROM posts WHERE board_local_id = $1);`, msg.ThreadLocalId)
	tx.Commit()
	msg.AnswerLocalId = answerId
	msg.Date = date
	return []OutMessage{msg}
}

func (msg *AddPostMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *AddPostMessage) GetDestination() Destination {
	return Destination{DestinationType: BoardDestination, Board: msg.Board}
}

// GetThreadMessage is used for requesting all posts of a thread.
type GetThreadMessage struct {
	MessageType byte
	ClientId    uuid.UUID `json:"-"`
	Board       string
	// Thread id
	LocalId int
}

// This message is used for sending thread's posts to the client who requested them.
type ThreadPostsMessage struct {
	MessageType byte
	ClientId    uuid.UUID `json:"-"`
	Board       string
	Posts       []Post
}

func (msg *GetThreadMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	msg.ClientId = cl.Id
	return nil
}

func (msg *GetThreadMessage) Process(db *sqlx.DB) []OutMessage {
	const query = `
	SELECT board_local_id AS localid, created_date AS date, topic, contents, attrs  FROM posts
	WHERE thread_id =
		(SELECT thread_id FROM posts, threads, boards WHERE board_local_id = $1 AND thread_id = threads.id AND board_id = boards.id AND boards.name = $2)
	ORDER BY board_local_id ASC;
	`
	answer := ThreadPostsMessage{
		MessageType: ThreadPostsMessageType,
		ClientId:    msg.ClientId,
		Board:       msg.Board,
		Posts:       []Post{},
	}
	err := db.Select(&answer.Posts, query, msg.LocalId, msg.Board)
	if err != nil {
		log.Printf("%#v", err)
		return nil
	}
	return []OutMessage{&answer}
}

func (msg *ThreadPostsMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *ThreadPostsMessage) GetDestination() Destination {
	return Destination{DestinationType: ClientDestination, Id: msg.ClientId}
}
