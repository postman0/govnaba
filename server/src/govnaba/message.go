package govnaba

import (

)

type GovnabaMessage interface {
	ToClient() string
	FromClient(string)
}