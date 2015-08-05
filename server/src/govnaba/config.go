package govnaba

import (
	"encoding/json"
	_ "errors"
	"log"
)

type BoardConfig struct {
	EnabledFeatures []string
}

type Config struct {
	BindAddress     string
	CookieSecretKey string
	Database        struct {
		Host     string
		Port     string
		Name     string
		User     string
		Password string
	}
	SiteName        string
	MainPageContent string
	RulesContent    string
	BoardConfigs    map[string]BoardConfig
}

var config Config

func SetupGovnaba(cfg Config) error {
	config = cfg
	return setupPostProcessors(cfg.BoardConfigs)
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
