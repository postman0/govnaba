package govnaba

import (
	"code.google.com/p/go-uuid/uuid"
	"errors"
	"fmt"
	_ "github.com/jmoiron/sqlx"
)

type PostProcessor func(uuid.UUID, *Post) error

func ImageProcessor(clId uuid.UUID, p *Post) error {
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
