package govnaba

import (
	"cmagic"
	"code.google.com/p/go-uuid/uuid"
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
	"github.com/jmoiron/sqlx"
	"github.com/nfnt/resize"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"io/ioutil"
	"log"
	"os"
	"time"
)

type Client struct {
	WriteChannel     chan OutMessage
	broadcastChannel chan OutMessage
	Id               uuid.UUID
	conn             *websocket.Conn
	db               *sqlx.DB
}

var MaxFileSizeKB int64 = 8 * 1024
var FileUploadPath string = "./client/static/uploads"
var validFileTypes map[string]string = map[string]string{
	"image/jpeg": "jpg",
	"image/png":  "png",
	"image/gif":  "gif",
}

func (cl *Client) receiveLoop() {
	for {
		msgType, rdr, err := cl.conn.NextReader()
		if err != nil {
			log.Printf("Error on reading from websocket: %v", err)
			cl.broadcastChannel <- NewClientDisconnectMessage(cl.Id)
			return
		}
		if msgType == websocket.TextMessage {
			buf, err := ioutil.ReadAll(rdr)
			if err != nil {
				log.Printf("Error on reading from websocket: %v", err)
				cl.broadcastChannel <- NewClientDisconnectMessage(cl.Id)
				return
			}
			var m map[string]interface{}
			err = json.Unmarshal(buf, &m)
			if err != nil {
				log.Printf("JSON unmarshalling error: %v", err)
				cl.WriteChannel <- NewProtocolErrorMessage(cl.Id)
				continue
			}
			messageType, success := m["MessageType"].(float64)
			if !success {
				log.Printf("Couldn't find message type in JSON")
				cl.WriteChannel <- NewProtocolErrorMessage(cl.Id)
				continue
			}
			messageConstructor := MessageConstructors[byte(messageType)]
			if messageConstructor == nil {
				log.Printf("Invalid message type")
				cl.WriteChannel <- NewProtocolErrorMessage(cl.Id)
				continue
			}
			message := messageConstructor()
			err = message.FromClient(cl, buf)
			if err != nil {
				log.Printf("Couldn't decode message: %s", err)
				cl.WriteChannel <- NewProtocolErrorMessage(cl.Id)
				continue
			}
			log.Printf("%v", message)
			go func() {
				for _, msg := range message.Process(cl.db) {
					cl.broadcastChannel <- msg
				}
			}()
		} else if msgType == websocket.BinaryMessage {
			cl.handleFileUpload(rdr)
		}
	}
}

func (cl *Client) writeLoop() {
	for message := range cl.WriteChannel {
		cl.conn.WriteMessage(websocket.TextMessage, message.ToClient())
	}
}

func (cl *Client) handleFileUpload(rdr io.Reader) {
	cmg, _ := cmagic.NewMagic(cmagic.MagicMimeType)
	cmg.LoadDatabases(nil)
	defer cmg.Close()
	buf := make([]byte, 512)
	readCount, _ := rdr.Read(buf)
	if readCount > 0 {
		mimetype, err := cmg.Buffer(buf)
		if err != nil {
			log.Printf("File upload failed: %s", err)
			return
		}
		ext, allowed := validFileTypes[mimetype]
		if allowed {
			curTime := time.Now().UnixNano()
			f, err := os.Create(fmt.Sprintf("%s/%d.%s", FileUploadPath, curTime, ext))
			if err != nil {
				log.Printf("File upload failed: %s", err)
				return
			}
			defer f.Close()
			f.Write(buf)
			_, err = io.Copy(f, rdr)
			if err != nil {
				log.Printf("File upload failed: %s", err)
				os.Remove(f.Name())
				return
			}
			// thumbnail generation
			f.Seek(0, 0)
			img, _, err := image.Decode(f)
			if err != nil {
				log.Printf("Image decoding error: %s", err)
				return
			}
			imgThumb := resize.Thumbnail(300, 200, img, resize.Bilinear)
			fthumb, err := os.Create(fmt.Sprintf("%s/thumb%d.%s", FileUploadPath, curTime, ext))
			if err != nil {
				log.Printf("File upload failed: %s", err)
				return
			}
			defer fthumb.Close()
			switch ext {
			case "jpg":
				err = jpeg.Encode(fthumb, imgThumb, &jpeg.Options{Quality: 100})
			case "png":
				err = png.Encode(fthumb, imgThumb)
			case "gif":
				err = gif.Encode(fthumb, imgThumb, &gif.Options{NumColors: 256})
			}
			if err != nil {
				log.Printf("Image encoding error: %s", err)
				return
			}

			cl.broadcastChannel <- &FileUploadSuccessfulMessage{FileUploadSuccessfulMessageType, cl.Id,
				fmt.Sprintf("%d.%s", curTime, ext)}
		} else {
			log.Printf("Illegal upload of %s file", mimetype)
		}
	}
}

func NewClient(conn *websocket.Conn, uuid uuid.UUID, broadcastChannel chan OutMessage, db *sqlx.DB) *Client {
	c := Client{make(chan OutMessage, 5), broadcastChannel, uuid, conn, db}
	c.conn.SetReadLimit(MaxFileSizeKB * 1024)
	go c.writeLoop()
	go c.receiveLoop()
	return &c

}
