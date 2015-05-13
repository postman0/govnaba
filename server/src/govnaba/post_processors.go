package govnaba

import (
	"errors"
	"fmt"
	"github.com/jmoiron/sqlx"
	"log"
	"regexp"
	"strconv"
)

// Post processors are used for doing various processing of the new post
// before it gets saved into the database.
type PostProcessor func(*Client, *Post) error

// This shows what post processors are used for various boards
// before uploading a post into the database.
// Processors will be called in the order of their placement in the slice.
var EnabledPostProcessorsPre = map[string][]PostProcessor{
	"test": []PostProcessor{AnswerLinksProcessor, ImageProcessor, SageProcessorPre, OPProcessor},
}

// Same as EnabledPostProcessorsPre but these are used
// after putting the post into the database.
// Errors are ignored.
var EnabledPostProcessorsPost = map[string][]PostProcessor{
	"test": []PostProcessor{SageProcessorPost},
}

// ImageProcessor limits attached to the post images to one.
func ImageProcessor(cl *Client, p *Post) error {
	imgsAttr, ok := p.Attrs["images"]
	if !ok {
		return nil
	}
	switch imgsAttr.(type) {
	case []interface{}:
		//trim image slice to first element, for example
		imgName, ok := imgsAttr.([]interface{})[0].(string)
		if !ok {
			return errors.New(fmt.Sprintf("Invalid images attribute format in the message: %T", imgsAttr))
		}
		p.Attrs["images"] = []string{imgName}
	default:
		return errors.New(fmt.Sprintf("Invalid images attribute format in the message: %T", imgsAttr))
	}
	return nil
}

func SageProcessorPre(cl *Client, p *Post) error {
	_, saged := p.Attrs["sage"]
	if saged {
		p.Attrs["sage"] = true
	}
	return nil
}

func SageProcessorPost(cl *Client, p *Post) error {
	_, saged := p.Attrs["sage"]
	if !saged {
		cl.db.Exec(`UPDATE threads SET last_bump_date = DEFAULT WHERE id = (SELECT thread_id FROM posts WHERE board_local_id = $1);`, p.ThreadId)
	}
	return nil
}

func OPProcessor(cl *Client, p *Post) error {
	_, opCheck := p.Attrs["op"]
	if opCheck {
		var opId int
		cl.db.Get(&opId, `SELECT users.id FROM 
			users INNER JOIN posts ON posts.user_id = users.id
			INNER JOIN threads ON posts.thread_id = threads.id
			INNER JOIN boards ON threads.board_id = boards.id
			WHERE boards.name = $1 AND posts.board_local_id = $2;`,
			p.Board, p.ThreadId)
		if cl.Id == opId {
			p.Attrs["op"] = true
		} else {
			delete(p.Attrs, "op")
		}

	}
	return nil
}

func AnswerLinksProcessor(cl *Client, p *Post) error {
	r, err := regexp.Compile(`>>(\d+)`)
	if err != nil {
		log.Fatalln(err)
	}
	matches := r.FindAllStringSubmatch(p.Contents, -1)
	postIds := make([]string, len(matches))
	for i, m := range matches {
		postIds[i] = m[1]
	}
	// keys are board-relative ids of the post,
	// values are board-relative thread ids
	refMap := make(map[string]int)
	query, args, err := sqlx.In(`SELECT p.board_local_id AS post_id, op.board_local_id AS op_id 
		FROM posts AS p INNER JOIN posts AS op ON p.thread_id = op.thread_id AND op.is_op = TRUE
		INNER JOIN threads ON p.thread_id = threads.id
		INNER JOIN boards ON board_id = boards.id AND boards.name = ?
		WHERE p.board_local_id IN (?);`, p.Board, postIds)
	if err != nil {
		log.Fatalln(err)
	}
	query = cl.db.Rebind(query)
	rows, err := cl.db.Queryx(query, args...)
	if err != nil {
		log.Printf("Query error: %s", err)
		return nil
	}
	defer rows.Close()
	for rows.Next() {
		var postId, threadId int
		err := rows.Scan(&postId, &threadId)
		if err != nil {
			log.Println(err)
			return nil
		}
		refMap[strconv.Itoa(postId)] = threadId
	}
	p.Attrs["refs"] = refMap
	return nil
}
