package api

type BuildingRequest struct {
	Name   string `json:"name" binding:"required"`
	Campus string `json:"campus"`
}

type RoomRequest struct {
	Name     string `json:"name"`
	Floor    string `json:"floor" binding:"required"`
	Number   string `json:"number" binding:"required"`
	Building string `json:"building"  binding:"required"`
}
