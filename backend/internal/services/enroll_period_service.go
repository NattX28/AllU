package services

import (
	"errors"

	"github.com/NattX28/AllU/internal/dto"
	"github.com/NattX28/AllU/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EnrollmentPeriodService struct {
	db *gorm.DB
}

func NewEnrollmentPeriodService(db *gorm.DB) *EnrollmentPeriodService {
	return &EnrollmentPeriodService{db: db}
}

// GetActive returns the active period, or nil (no error) if none exists.
// ใช้สำหรับ frontend เช็คว่าควรแสดงหน้าลงทะเบียนมั้ย
func (s *EnrollmentPeriodService) GetActive() (*dto.EnrollmentPeriodResponse, error) {
	var period models.EnrollmentPeriod
	err := s.db.Where("is_active = ?", true).First(&period).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return mapPeriodResponse(period), nil
}

// Create creates a new enrollment period.
// ถ้า IsActive = true จะ deactivate period อื่นก่อนเสมอ (มี active ได้แค่ 1 period)
func (s *EnrollmentPeriodService) Create(req dto.CreateEnrollmentPeriodRequest) (*dto.EnrollmentPeriodResponse, error) {
	if req.EndDate.Before(req.StartDate) {
		return nil, errors.New("end_date must be after start_date")
	}

	var result *dto.EnrollmentPeriodResponse

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if req.IsActive {
			if err := tx.Model(&models.EnrollmentPeriod{}).
				Where("is_active = ?", true).
				Update("is_active", false).Error; err != nil {
				return err
			}
		}

		period := models.EnrollmentPeriod{
			Semester:     req.Semester,
			AcademicYear: req.AcademicYear,
			StartDate:    req.StartDate,
			EndDate:      req.EndDate,
			IsActive:     req.IsActive,
		}
		if err := tx.Create(&period).Error; err != nil {
			return err
		}

		result = mapPeriodResponse(period)
		return nil
	})

	return result, err
}

// Update updates an existing enrollment period.
// ถ้า toggle IsActive = true จะ deactivate period อื่นก่อนเสมอ
func (s *EnrollmentPeriodService) Update(id uuid.UUID, req dto.UpdateEnrollmentPeriodRequest) (*dto.EnrollmentPeriodResponse, error) {
	var result *dto.EnrollmentPeriodResponse

	err := s.db.Transaction(func(tx *gorm.DB) error {
		var period models.EnrollmentPeriod
		if err := tx.First(&period, "id = ?", id).Error; err != nil {
			return errors.New("enrollment period not found")
		}

		if req.StartDate != nil {
			period.StartDate = *req.StartDate
		}
		if req.EndDate != nil {
			period.EndDate = *req.EndDate
		}
		if req.IsActive != nil {
			if *req.IsActive {
				if err := tx.Model(&models.EnrollmentPeriod{}).
					Where("is_active = ? AND id != ?", true, id).
					Update("is_active", false).Error; err != nil {
					return err
				}
			}
			period.IsActive = *req.IsActive
		}

		if period.EndDate.Before(period.StartDate) {
			return errors.New("end_date must be after start_date")
		}

		if err := tx.Save(&period).Error; err != nil {
			return err
		}

		result = mapPeriodResponse(period)
		return nil
	})

	return result, err
}

// ─── Helper ──────────────────────────────────────────────────

func mapPeriodResponse(p models.EnrollmentPeriod) *dto.EnrollmentPeriodResponse {
	return &dto.EnrollmentPeriodResponse{
		ID:           p.ID.String(),
		Semester:     p.Semester,
		AcademicYear: p.AcademicYear,
		StartDate:    p.StartDate,
		EndDate:      p.EndDate,
		IsActive:     p.IsActive,
	}
}

// GetAll retrieves all enrollment periods (for admin)
func (s *EnrollmentPeriodService) GetAll() ([]*dto.EnrollmentPeriodResponse, error) {
	var periods []models.EnrollmentPeriod

	// ดึงข้อมูลทั้งหมด เรียงตามปีการศึกษาและเทอมจากล่าสุดไปเก่าสุด
	err := s.db.Order("academic_year DESC, semester DESC").Find(&periods).Error
	if err != nil {
		return nil, err
	}

	var result []*dto.EnrollmentPeriodResponse
	for _, p := range periods {
		result = append(result, mapPeriodResponse(p))
	}

	// ป้องกันไม่ให้ส่ง null กลับไปถ้าไม่มีข้อมูล ให้ส่ง [] (array ว่าง) แทน
	if result == nil {
		result = []*dto.EnrollmentPeriodResponse{}
	}

	return result, nil
}
