package api

type Shelves struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	BuildingName string    `json:"buildingName"`
	RoomName     string    `json:"roomName"`
	Columns      []Columns `json:"columns"`
}

type Columns struct {
	ID       string    `json:"id"`
	Elements []Element `json:"elements"`
}

type Element struct {
	ID   string `json:"id"`
	Type string `json:"type"`
}
