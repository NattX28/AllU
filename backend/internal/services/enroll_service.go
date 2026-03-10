package services

import (
	"context"
	"fmt"

	"github.com/NattX28/AllU/internal/dto"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type EnrollService struct {
	db  *gorm.DB
	rdb *redis.Client
}

func NewEnrollService(db *gorm.DB, rdb *redis.Client) *EnrollService {
	return &EnrollService{db: db, rdb: rdb}
}

func (s *EnrollService) CheckDraftSeats(sectionIDs []string) ([]dto.CheckSeatsResponse, error) {
	ctx := context.Background()
	var results []dto.CheckSeatsResponse

	for _, sid := range sectionIDs {
		key := fmt.Sprintf("section:%s:seats", sid)

		val, err := s.rdb.Get(ctx, key).Int()
		if err != nil {
			val = 0
		}

		results = append(results, dto.CheckSeatsResponse{
			SectionID: sid,
			Available: val,
			IsFull:    val <= 0,
		})
	}

	return results, nil
}
