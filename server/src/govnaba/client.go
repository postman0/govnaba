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

// Client structs are used for communicating with remote clients via websocket.
type Client struct {
	// WriteChannel is used for sending messages to the client
	WriteChannel chan OutMessage
	// A reference to the global broadcast thread
	broadcastChannel chan OutMessage
	// Client's unique identificator
	Id uuid.UUID
	// Websocket connection
	conn *websocket.Conn
	// A handle to the database. It's used for processing incoming messages.
	db *sqlx.DB
}

// Maximum file size allowed for uploading.
var MaxFileSizeKB int64 = 8 * 1024

// The path where uploaded files are saved.
var FileUploadPath string = "./client/static/uploads"

// File types allowed for uploading and corresponding extensions.
// Those are used for saving the files.
var validFileTypes map[string]string = map[string]string{
	"image/jpeg": "jpg",
	"image/png":  "png",
	"image/gif":  "gif",
}

// receiveLoop listens on the websocket for incoming messages, processes them
// and handles the results to the global broadcast thread.
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

// writeLoop listens on the write channel for outgoing messages and sends them to the client.
func (cl *Client) writeLoop() {
	for message := range cl.WriteChannel {
		cl.conn.WriteMessage(websocket.TextMessage, message.ToClient())
	}
}

// This function is used for file uploading.
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
			cl.WriteChannel <- &InternalServerErrorMessage{InternalServerErrorMessageType, cl.Id}
			return
		}
		ext, allowed := validFileTypes[mimetype]
		if allowed {
			curTime := time.Now().UnixNano()
			f, err := os.Create(fmt.Sprintf("%s/%d.%s", FileUploadPath, curTime, ext))
			if err != nil {
				log.Printf("File upload failed: %s", err)
				cl.WriteChannel <- &InternalServerErrorMessage{InternalServerErrorMessageType, cl.Id}
				return
			}
			defer f.Close()
			f.Write(buf)
			_, err = io.Copy(f, rdr)
			if err != nil {
				log.Printf("File upload failed: %s", err)
				os.Remove(f.Name())
				cl.WriteChannel <- &InternalServerErrorMessage{InternalServerErrorMessageType, cl.Id}
				return
			}
			// thumbnail generation
			f.Seek(0, 0)
			img, _, err := image.Decode(f)
			if err != nil {
				log.Printf("Image decoding error: %s", err)
				cl.WriteChannel <- &InternalServerErrorMessage{InternalServerErrorMessageType, cl.Id}
				return
			}
			imgThumb := resize.Thumbnail(300, 200, img, resize.Bilinear)
			fthumb, err := os.Create(fmt.Sprintf("%s/thumb%d.%s", FileUploadPath, curTime, ext))
			if err != nil {
				log.Printf("File upload failed: %s", err)
				cl.WriteChannel <- &InternalServerErrorMessage{InternalServerErrorMessageType, cl.Id}
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
				cl.WriteChannel <- &InternalServerErrorMessage{InternalServerErrorMessageType, cl.Id}
				return
			}

			cl.broadcastChannel <- &FileUploadSuccessfulMessage{FileUploadSuccessfulMessageType, cl.Id,
				fmt.Sprintf("%d.%s", curTime, ext)}
		} else {
			log.Printf("Illegal upload of %s file", mimetype)
			cl.WriteChannel <- &FileUploadErrorMessage{
				FileUploadErrorMessageType,
				cl.Id,
			}
		}
	}
}

// A constructor for the Client structure.
func NewClient(conn *websocket.Conn, uuid uuid.UUID, broadcastChannel chan OutMessage, db *sqlx.DB) *Client {
	c := Client{make(chan OutMessage, 5), broadcastChannel, uuid, conn, db}
	c.conn.SetReadLimit(MaxFileSizeKB * 1024)
	go c.writeLoop()
	go c.receiveLoop()
	return &c

}
