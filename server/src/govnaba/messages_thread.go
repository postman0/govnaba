package govnaba

import (
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
type PostAttributes struct {
	clientAttrs  map[string]interface{}
	checkedAttrs map[string]interface{}
}

func (pa *PostAttributes) Get(key string) (interface{}, bool) {
	val, ok := pa.checkedAttrs[key]
	if !ok {
		val, ok = pa.clientAttrs[key]
	}
	return val, ok
}

func (pa *PostAttributes) Put(key string, value interface{}) {
	if pa.checkedAttrs == nil {
		pa.checkedAttrs = make(map[string]interface{})
	}
	pa.checkedAttrs[key] = value
}

// This is used for unmarshalling values from the client.
func (pa *PostAttributes) UnmarshalJSON(buf []byte) error {
	err := json.Unmarshal(buf, &pa.clientAttrs)
	pa.checkedAttrs = make(map[string]interface{})
	return err
}

// This is used for marshalling values sent to the client.
func (pa *PostAttributes) MarshalJSON() ([]byte, error) {
	return json.Marshal(pa.checkedAttrs)
}

// Scan unmarshals JSON from the database into a map[string]interface{}.
// If the value is NULL then the result is a nil map.
func (pa *PostAttributes) Scan(src interface{}) error {
	switch src.(type) {
	case []byte:
		err := json.Unmarshal(src.([]byte), &pa.checkedAttrs)
		if err != nil {
			return errors.New(fmt.Sprintf("Invalid JSON: %s.", err))
		}
	case string:
		err := json.Unmarshal([]byte(src.(string)), &pa.checkedAttrs)
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
	b, err := json.Marshal(&pa)
	if err != nil {
		return []byte{}, errors.New(fmt.Sprintf("Can't marshal attributes to JSON: %s", err))
	} else {
		return b, nil
	}
}

// Helper struct used in various situations.
type Post struct {
	Board string
	// Parent thread's id on the board
	ThreadId int
	// Is parent thread locked?
	IsLocked bool
	// Is parent thread pinned?
	IsPinned bool
	// Post's id on the board
	LocalId int
	// Author's userid
	UserId   int `json:"-"`
	Topic    string
	Contents string
	Date     time.Time
	Attrs    PostAttributes
}

// These messages are used for both creating new threads
// and notifying other client about a new thread.
type CreateThreadMessage struct {
	MessageBase
	Post
}

func (msg *CreateThreadMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
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
			MessageBase{InvalidRequestErrorMessageType, msg.Client},
			ResourceDoesntExist,
			"Board doesnt exist",
		}}
	}
	var err error = nil
	for _, pp := range EnabledPostProcessors[msg.Board] {
		err = pp.Before(msg.Client, &msg.Post)
		if err != nil {
			log.Printf("Invalid post: %s", err)
			return []OutMessage{&InvalidRequestErrorMessage{
				MessageBase{InvalidRequestErrorMessageType, msg.Client},
				InvalidArguments,
				err.Error(),
			}}
		}
	}

	tx := db.MustBegin()
	row = tx.QueryRowx(`INSERT INTO threads (board_id) VALUES ((SELECT id FROM boards WHERE name = $1)) RETURNING id;`, msg.Board)
	var thread_id int
	err = row.Scan(&thread_id)
	if err != nil {
		log.Printf("%#v", err)
	}
	err = tx.Get(msg, `INSERT INTO posts (user_id, thread_id, board_local_id, topic, contents, attrs, is_op) 
		VALUES ($1, $2, nextval($3 || '_board_id_seq'), $4, $5, $6, TRUE)
		RETURNING board_local_id AS localid, created_date AS date;`,
		msg.Client.Id, thread_id, msg.Board, msg.Topic, msg.Contents, msg.Attrs)
	if err != nil {
		tx.Rollback()
		log.Printf("CreateThread error: %s from %s", err, msg.Client.conn.RemoteAddr())
		return []OutMessage{&InternalServerErrorMessage{MessageBase{InternalServerErrorMessageType, msg.Client}}}
	}
	_, err = db.Exec(`UPDATE threads SET posts_count = posts_count + 1 WHERE id = $1;`, thread_id)
	if err != nil {
		tx.Rollback()
		log.Printf("CreateThread error: %s from %s", err, msg.Client.conn.RemoteAddr())
		return []OutMessage{&InternalServerErrorMessage{MessageBase{InternalServerErrorMessageType, msg.Client}}}
	}
	tx.Commit()
	if err != nil {
		log.Printf("%#v", err)
		return nil
		// todo: return error
	}

	for _, pp := range EnabledPostProcessors[msg.Board] {
		_ = pp.After(msg.Client, &msg.Post)
	}

	return []OutMessage{msg, &PostingSuccesfulMessage{
		MessageBase{PostingSuccesfulMessageType, msg.Client},
		msg.LocalId,
	},
	}
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
	MessageBase
	Post
}

func (msg *AddPostMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	return nil
}

// Process applies post processors to the new post and stores it in the database.
func (msg *AddPostMessage) Process(db *sqlx.DB) []OutMessage {

	var err error = nil
	for _, pp := range EnabledPostProcessors[msg.Board] {
		err = pp.Before(msg.Client, &msg.Post)
		if err != nil {
			log.Printf("Invalid post: %s", err)
			return []OutMessage{&InvalidRequestErrorMessage{
				MessageBase{InvalidRequestErrorMessageType, msg.Client},
				InvalidArguments,
				err.Error(),
			}}
		}
	}
	const insertPostQuery = `INSERT INTO posts (user_id, thread_id, topic, contents, attrs, board_local_id) VALUES 
		($1,
		(SELECT threads.id FROM threads, boards, posts 
			WHERE board_id = boards.id AND thread_id = threads.id AND boards.name = $2 AND posts.board_local_id = $3
			AND is_locked = FALSE),
		$4,
		$5,
		$6,
		nextval($2 || '_board_id_seq')
		) RETURNING posts.board_local_id, created_date;`

	tx := db.MustBegin()
	row := tx.QueryRowx(insertPostQuery, msg.Client.Id,
		msg.Board, msg.ThreadId, msg.Topic, msg.Contents, msg.Attrs)
	var answerId int
	var date time.Time
	err = row.Scan(&answerId, &date)
	if err != nil {
		tx.Rollback()
		log.Printf("%#v", err)
		return []OutMessage{&InvalidRequestErrorMessage{
			MessageBase{InvalidRequestErrorMessageType, msg.Client},
			InvalidArguments,
			"Thread doesn't exist or has been locked.",
		}}
	}
	_, err = db.Exec(`UPDATE threads SET posts_count = posts_count + 1
		WHERE id IN (SELECT thread_id FROM posts WHERE board_local_id = $1)
			AND board_id = (SELECT id FROM boards WHERE name = $2);`, msg.ThreadId, msg.Board)
	if err != nil {
		tx.Rollback()
		log.Printf("CreateThread error: %s from %s", err, msg.Client.conn.RemoteAddr())
		return []OutMessage{&InternalServerErrorMessage{MessageBase{InternalServerErrorMessageType, msg.Client}}}
	}
	tx.Commit()
	msg.LocalId = answerId
	msg.Date = date
	for _, pp := range EnabledPostProcessors[msg.Board] {
		_ = pp.After(msg.Client, &msg.Post)
	}
	return []OutMessage{msg, &PostingSuccesfulMessage{
		MessageBase{PostingSuccesfulMessageType, msg.Client},
		msg.LocalId,
	},
	}
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

type PostingSuccesfulMessage struct {
	MessageBase
	LocalId int
}

func (msg *PostingSuccesfulMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *PostingSuccesfulMessage) GetDestination() Destination {
	return Destination{DestinationType: ResponseDestination}
}

// GetThreadMessage is used for requesting all posts of a thread.
type GetThreadMessage struct {
	MessageBase
	Board string
	// Thread id
	LocalId int
}

// This message is used for sending thread's posts to the client who requested them.
type ThreadPostsMessage struct {
	MessageBase
	Board string
	Posts []Post
}

func (msg *GetThreadMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	return nil
}

func (msg *GetThreadMessage) Process(db *sqlx.DB) []OutMessage {
	const query = `
	SELECT board_local_id AS localid, created_date AS date, user_id AS userid, topic, contents, attrs,
	is_locked AS islocked, is_pinned AS ispinned
	FROM posts INNER JOIN threads ON thread_id = threads.id
	WHERE thread_id =
		(SELECT thread_id FROM posts, threads, boards WHERE board_local_id = $1 AND thread_id = threads.id AND board_id = boards.id AND boards.name = $2)
	ORDER BY board_local_id ASC;
	`
	answer := ThreadPostsMessage{
		MessageBase: MessageBase{ThreadPostsMessageType, msg.Client},
		Board:       msg.Board,
		Posts:       []Post{},
	}
	err := db.Select(&answer.Posts, query, msg.LocalId, msg.Board)
	if err != nil {
		log.Printf("%#v", err)
		return nil
	}
	for _, p := range answer.Posts {
		if p.UserId == msg.Client.Id {
			p.Attrs.Put("own", true)
		}
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
	return Destination{DestinationType: ResponseDestination}
}

// This message is used for both requesting a single post from a board
// and for sending requested post back to the client. The required
// parameters are board and post's local id.
type GetSinglePostMessage struct {
	MessageBase
	Post
}

func (msg *GetSinglePostMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	return nil
}

func (msg *GetSinglePostMessage) Process(db *sqlx.DB) []OutMessage {
	const query = `
	WITH post AS (
	SELECT board_local_id AS localid, created_date AS date, user_id AS userid, thread_id AS tid, topic, contents, attrs FROM
	posts INNER JOIN threads ON thread_id = threads.id
	WHERE board_local_id = $1 AND threads.board_id = (SELECT id FROM boards WHERE name = $2)
	)
	SELECT post.localid, post.date, post.userid, post.topic, post.contents, post.attrs, op.thread_id AS threadid
	FROM post CROSS JOIN LATERAL (SELECT board_local_id as thread_id FROM posts WHERE thread_id = tid AND is_op = TRUE) AS op;
	`
	err := db.Get(&msg.Post, query, msg.LocalId, msg.Board)
	if err != nil {
		log.Printf("GetSinglePost processing error: %#v", err)
		return nil
	}
	return []OutMessage{msg}
}

func (msg *GetSinglePostMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *GetSinglePostMessage) GetDestination() Destination {
	return Destination{DestinationType: ResponseDestination}
}

type DeletePostMessage struct {
	MessageBase
	Board   string
	LocalId int
}

func (msg *DeletePostMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	return nil
}

func (msg *DeletePostMessage) Process(db *sqlx.DB) []OutMessage {
	const getPostQuery = `
	WITH post AS (
	SELECT board_local_id AS localid, created_date AS date, user_id AS userid, thread_id AS tid, topic, contents, attrs FROM
	posts INNER JOIN threads ON thread_id = threads.id
	WHERE board_local_id = $1 AND threads.board_id = (SELECT id FROM boards WHERE name = $2)
	)
	SELECT post.localid, post.date, post.userid, post.topic, post.contents, post.attrs, op.thread_id AS threadid
	FROM post CROSS JOIN LATERAL (SELECT board_local_id as thread_id FROM posts WHERE thread_id = tid AND is_op = TRUE) AS op;
	`
	const updatePostQuery = `
		UPDATE posts SET contents = '', attrs = $1
		WHERE board_local_id = $2
			AND thread_id IN (SELECT threads.id FROM threads INNER JOIN boards ON board_id = boards.id 
				WHERE boards.name = $3);
	`
retry:
	tx, err := db.Beginx()
	if err != nil {
		log.Println(err)
		return []OutMessage{&InternalServerErrorMessage{MessageBase{InternalServerErrorMessageType, msg.Client}}}
	}
	var p Post
	tx.Exec(`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`)
	err = tx.Get(&p, getPostQuery, msg.LocalId, msg.Board)
	if err != nil {
		log.Printf("%#v", err)
		return []OutMessage{&InternalServerErrorMessage{MessageBase{InternalServerErrorMessageType, msg.Client}}}
	}
	var answer OutMessage
	isMod := msg.Client.IsModeratorOn(msg.Board)
	if p.UserId == msg.Client.Id || isMod {
		if isMod {
			p.Attrs.Put("deletedMod", true)
		} else {
			p.Attrs.Put("deleted", true)
		}
		r, err := tx.Exec(updatePostQuery, p.Attrs, p.LocalId, msg.Board)
		log.Printf("%#v", r)
		if err != nil {
			log.Printf("%#v", err)
		}
		err = tx.Commit()
		if err != nil {
			log.Printf("%#v", err)
			tx.Rollback()
			goto retry
		} else {
			answer = msg
		}
	} else {
		answer = &InvalidRequestErrorMessage{
			MessageBase{InvalidRequestErrorMessageType, msg.Client},
			InvalidArguments,
			"You don't own this post.",
		}
	}
	return []OutMessage{answer}
}

func (msg *DeletePostMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *DeletePostMessage) GetDestination() Destination {
	return Destination{DestinationType: ResponseDestination}
}
