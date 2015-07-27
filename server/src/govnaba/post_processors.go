package govnaba

import (
	"errors"
	"fmt"
	"github.com/dchest/captcha"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
	"github.com/mitchellh/mapstructure"
	"github.com/oschwald/geoip2-golang"
	"log"
	"net"
	"regexp"
	"strconv"
)

var geodb *geoip2.Reader

func init() {
	var err error
	geodb, err = geoip2.Open("GeoLite2-Country.mmdb")
	if err != nil {
		log.Fatalf("Couldn't open GeoIP2 database: %s", err)
	}
}

// Post processors are used for doing various processing of the new post
// before and/or after it gets saved into the database.
type PostProcessor struct {
	Before, After func(*Client, *Post) error
}

// Contains all post processors.
var PostProcessorRegistry = map[string]PostProcessor{
	"sage":    PostProcessor{SageProcessorBefore, SageProcessorAfter},
	"op":      PostProcessor{OPProcessor, NilProcessor},
	"captcha": PostProcessor{CaptchaProcessor, NilProcessor},
	"image":   PostProcessor{ImageProcessor, NilProcessor},
	"answers": PostProcessor{AnswerLinksProcessor, AnswerMapProcessor},
	"country": PostProcessor{CountryProcessor, NilProcessor},
}

// This shows what post processors are used for various boards.
// Processors will be called in the order of their placement in the slice.
var EnabledPostProcessors = map[string][]PostProcessor{}

// This function must be called on application startup to set up
// enabled post processors for each board.
func SetupPostProcessors(boardConfigs map[string]BoardConfig) error {
	for board, cfg := range boardConfigs {
		procs := []PostProcessor{}
		for _, procName := range cfg.EnabledFeatures {
			if proc, ok := PostProcessorRegistry[procName]; ok {
				procs = append(procs, proc)
			} else {
				return errors.New(fmt.Sprintf("There is no such post processor: %s", procName))
			}
		}
		EnabledPostProcessors[board] = procs
	}
	return nil
}

// Does nothing.
func NilProcessor(cl *Client, p *Post) error {
	return nil
}

// ImageProcessor limits attached to the post images to one.
func ImageProcessor(cl *Client, p *Post) error {
	imgsAttr, ok := p.Attrs.Get("images")
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
		p.Attrs.Put("images", []string{imgName})
	default:
		return errors.New(fmt.Sprintf("Invalid images attribute format in the message: %T", imgsAttr))
	}
	return nil
}

func SageProcessorBefore(cl *Client, p *Post) error {
	_, saged := p.Attrs.Get("sage")
	if saged {
		p.Attrs.Put("sage", true)
	}
	return nil
}

func SageProcessorAfter(cl *Client, p *Post) error {
	_, saged := p.Attrs.Get("sage")
	if !saged {
		cl.db.Exec(`UPDATE threads SET last_bump_date = DEFAULT WHERE id = (SELECT thread_id FROM posts WHERE board_local_id = $1);`, p.ThreadId)
	}
	return nil
}

func OPProcessor(cl *Client, p *Post) error {
	_, opCheck := p.Attrs.Get("op")
	if opCheck {
		var opId int
		cl.db.Get(&opId, `SELECT users.id FROM 
			users INNER JOIN posts ON posts.user_id = users.id
			INNER JOIN threads ON posts.thread_id = threads.id
			INNER JOIN boards ON threads.board_id = boards.id
			WHERE boards.name = $1 AND posts.board_local_id = $2;`,
			p.Board, p.ThreadId)
		if cl.Id == opId {
			p.Attrs.Put("op", true)
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
	if len(postIds) < 1 {
		return nil
	}
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
	p.Attrs.Put("refs", refMap)
	return nil
}

func AnswerMapProcessor(cl *Client, p *Post) error {
	rawRefs, _ := p.Attrs.Get("refs")
	refs, ok := rawRefs.(map[string]int)
	if !ok || refs == nil {
		log.Printf("Unsuitable refs type for %v", refs)
		return nil
	}
	var i = 0
	for postId := range refs {
		if i > 9 {
			break
		}
		firstTime := true
		var err error
		for firstTime || (err != nil && err.(*pq.Error).Code.Class() == "40") {
			firstTime = false
			tx, err := cl.db.Beginx()
			if err != nil {
				log.Printf("error starting transaction in answer map building: %#v", err)
				return nil
			}
			_, err = tx.Exec("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;")
			if err != nil {
				log.Printf("error setting isolation level: %#v", err)
				tx.Rollback()
				return nil
			}
			var pa PostAttributes = PostAttributes{}
			err = tx.Get(&pa, `SELECT attrs FROM posts INNER JOIN threads ON thread_id = threads.id 
				WHERE board_local_id = $1 AND board_id = (SELECT id FROM boards WHERE name = $2);`,
				postId, p.Board)
			if err != nil {
				log.Printf("%#v", err)
				tx.Rollback()
				return nil
			}
			rawAnswerMap, _ := pa.Get("answers")
			answerMap, ok := rawAnswerMap.(map[string]interface{})
			if !ok || (answerMap == nil) {
				log.Printf("Unsuitable answer map type for %v, got %T", rawAnswerMap, rawAnswerMap)
				answerMap = make(map[string]interface{})
			}
			answerMap[strconv.Itoa(p.LocalId)] = p.ThreadId
			pa.Put("answers", answerMap)
			_, err = tx.Exec(`UPDATE posts SET attrs = $1
				FROM threads WHERE thread_id = threads.id AND board_id = (SELECT id FROM boards WHERE name = $2)
				AND board_local_id = $3;`, pa, p.Board, postId)
			if err != nil {
				log.Printf("%#v", err)
				tx.Rollback()
			}
			err = tx.Commit()
			if err != nil {
				log.Printf("%#v", err)
				tx.Rollback()
			}
		}
		i++
	}
	return nil
}

func CaptchaProcessor(cl *Client, p *Post) error {
	errMsgInvalid := errors.New("Captcha data is invalid or missing.")
	var capData struct {
		Id       string
		Solution string
	}
	val, _ := p.Attrs.Get("captcha")
	err := mapstructure.Decode(val, &capData)
	if err != nil {
		log.Println(err)
		return errMsgInvalid
	}
	log.Println(capData)
	ok := captcha.VerifyString(capData.Id, capData.Solution)
	if !ok {
		return errors.New("Captcha has expired or solution is wrong.")
	}
	return nil
}

// Determines from which country the user is posting.
func CountryProcessor(cl *Client, p *Post) error {
	host, _, _ := net.SplitHostPort(cl.conn.RemoteAddr().String())
	record, err := geodb.Country(net.ParseIP(host))
	if err != nil || record.Country.IsoCode == "" {
		log.Printf("Couldn't determine country for userid %d, ip %s: %s", cl.Id, host, err)
		p.Attrs.Put("country", "_unknown")
	} else {
		p.Attrs.Put("country", record.Country.IsoCode)
	}
	return nil
}
