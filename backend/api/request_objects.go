package api

type BuildingRequest struct {
	Name   string `json:"name" binding:"required"`
	Campus string `json:"campus"`
}

type RoomRequest struct {
	Name     string `json:"name"`
	Floor    string `json:"floor"`
	Number   string `json:"number"`
	Building string `json:"building"`
}
