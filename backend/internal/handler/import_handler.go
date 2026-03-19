package handler

import (
	"github.com/NattX28/AllU/internal/services"
	"github.com/gofiber/fiber/v3"
)

type ImportHandler struct {
	importSvc *services.ImportService
}

func NewImportHandler(importSvc *services.ImportService) *ImportHandler {
	return &ImportHandler{importSvc: importSvc}
}

// multipart/form-data  field: "file"
func (h *ImportHandler) ImportUsers(c fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "file field is required",
		})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "cannot open uploaded file",
		})
	}
	defer file.Close()

	sheet := c.Query("sheet", "Users")

	result, err := h.importSvc.ImportUsers(file, sheet)
	if err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(resolveStatus(result)).JSON(fiber.Map{
		"message":      "import completed",
		"total_rows":   result.TotalRows,
		"inserted":     result.Inserted,
		"failed_count": len(result.FailedRows),
		"failed_rows":  result.FailedRows,
	})
}

func (h *ImportHandler) ImportCourses(c fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "file field is required",
		})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "cannot open uploaded file",
		})
	}
	defer file.Close()

	sheet := c.Query("sheet", "Courses")

	result, err := h.importSvc.ImportCourses(file, sheet)
	if err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(resolveStatus(result)).JSON(fiber.Map{
		"message":      "import completed",
		"total_rows":   result.TotalRows,
		"inserted":     result.Inserted,
		"failed_count": len(result.FailedRows),
		"failed_rows":  result.FailedRows,
	})
}

// resolveStatus returns appropriate HTTP status based on result
//
//	200 - all rows succeeded
//	207 - partial success
//	422 - all rows failed
func resolveStatus(result *services.ImportResult) int {
	if len(result.FailedRows) == 0 {
		return fiber.StatusOK
	}
	if result.Inserted == 0 {
		return fiber.StatusUnprocessableEntity
	}
	return fiber.StatusMultiStatus
}
