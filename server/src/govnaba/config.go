package govnaba

import (
	"encoding/json"
	_ "errors"
	"log"
)

type BoardConfig struct {
	EnabledFeatures []string
}

type SiteConfigMessage struct {
	MessageBase
	SiteName        string
	MainPageContent string
	RulesContent    string
	BoardConfigs    map[string]BoardConfig
}

func (msg *SiteConfigMessage) ToClient() []byte {
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
	}
	return bytes
}

func (msg *SiteConfigMessage) GetDestination() Destination {
	return Destination{DestinationType: ResponseDestination}
}
