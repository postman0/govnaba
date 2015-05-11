package govnaba

import (
	"errors"
	"fmt"
	_ "github.com/jmoiron/sqlx"
)

// Post processors are used for doing various processing of the new post
// before it gets saved into the database.
type PostProcessor func(*Client, *Post) error

// This shows what post processors are used for various boards
// before uploading a post into the database.
// Processors will be called in the order of their placement in the slice.
var EnabledPostProcessorsPre = map[string][]PostProcessor{
	"test": []PostProcessor{ImageProcessor, SageProcessorPre, OPProcessor},
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
