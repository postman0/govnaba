package govnaba

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"github.com/dchest/captcha"
	"github.com/jmoiron/sqlx"
	"log"
)

type GetCaptchaMessage struct {
	MessageBase
	CaptchaId    string
	CaptchaImage string
}

func (msg *GetCaptchaMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	return nil
}

func (msg *GetCaptchaMessage) Process(db *sqlx.DB) []OutMessage {
	captchaId := captcha.New()
	msg.CaptchaId = captchaId
	var buf bytes.Buffer
	enc := base64.NewEncoder(base64.StdEncoding, &buf)
	defer enc.Close()
	err := captcha.WriteImage(enc, captchaId, 200, 50)
	if err != nil {
		log.Println(err)
	}
	msg.CaptchaImage = buf.String()
	return []OutMessage{msg}
}

func (msg *GetCaptchaMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *GetCaptchaMessage) GetDestination() Destination {
	return Destination{DestinationType: ClientDestination, Id: msg.Client.Id}
}
