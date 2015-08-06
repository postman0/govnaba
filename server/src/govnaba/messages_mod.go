package govnaba

import (
	"database/sql"
	"encoding/json"
	_ "errors"
	"github.com/jmoiron/sqlx"
	"log"
)

func stringIsInSlice(needle string, haystack []string) bool {
	for _, val := range haystack {
		if val == needle {
			return true
		}
	}
	return false
}

type PinThreadMessage struct {
	MessageBase
	Board   string
	LocalId int
	State   bool
}

func (msg *PinThreadMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	return nil
}

func (msg *PinThreadMessage) Process(db *sqlx.DB) []OutMessage {
	var clientKey sql.NullString
	db.Get(&clientKey, `SELECT key FROM users WHERE id = $1;`, msg.Client.Id)
	if clientKey.Valid {
		var hasRights bool
		if stringIsInSlice(clientKey.String, config.AdministratorsKeys) ||
			stringIsInSlice(clientKey.String, config.BoardConfigs[msg.Board].ModeratorsKeys) {
			hasRights = true
		}
		if hasRights {
			const query = `UPDATE threads SET is_pinned = $1 WHERE id = (
				SELECT threads.id FROM threads INNER JOIN posts ON thread_id = threads.id
				WHERE board_local_id = $2 AND board_id = (SELECT id FROM boards WHERE name = $3));`
			_, err := db.Exec(query, msg.State, msg.LocalId, msg.Board)
			if err != nil {
				log.Printf("lockthread err: %#v", err)
			} else {
				return []OutMessage{msg}
			}
		}
	}
	return []OutMessage{&InvalidRequestErrorMessage{
		MessageBase{InvalidRequestErrorMessageType, msg.Client},
		InsufficientRights,
		"Insufficient rights.",
	}}
}

func (msg *PinThreadMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *PinThreadMessage) GetDestination() Destination {
	return Destination{DestinationType: BoardDestination, Board: msg.Board}
}

type LockThreadMessage struct {
	MessageBase
	Board   string
	LocalId int
	State   bool
}

func (msg *LockThreadMessage) FromClient(cl *Client, msgBytes []byte) error {
	err := json.Unmarshal(msgBytes, msg)
	if err != nil {
		return err
	}
	return nil
}

func (msg *LockThreadMessage) Process(db *sqlx.DB) []OutMessage {
	var clientKey sql.NullString
	db.Get(&clientKey, `SELECT key FROM users WHERE id = $1;`, msg.Client.Id)
	if clientKey.Valid {
		var hasRights bool
		if stringIsInSlice(clientKey.String, config.AdministratorsKeys) ||
			stringIsInSlice(clientKey.String, config.BoardConfigs[msg.Board].ModeratorsKeys) {
			hasRights = true
		}
		if hasRights {
			const query = `UPDATE threads SET is_locked = $1 WHERE id = (
				SELECT threads.id FROM threads INNER JOIN posts ON thread_id = threads.id
				WHERE board_local_id = $2 AND board_id = (SELECT id FROM boards WHERE name = $3));`
			_, err := db.Exec(query, msg.State, msg.LocalId, msg.Board)
			if err != nil {
				log.Printf("lockthread err: %#v", err)
			} else {
				return []OutMessage{msg}
			}
		}
	}
	return []OutMessage{&InvalidRequestErrorMessage{
		MessageBase{InvalidRequestErrorMessageType, msg.Client},
		InsufficientRights,
		"Insufficient rights.",
	}}
}

func (msg *LockThreadMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *LockThreadMessage) GetDestination() Destination {
	return Destination{DestinationType: BoardDestination, Board: msg.Board}
}
