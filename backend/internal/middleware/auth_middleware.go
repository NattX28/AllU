package middleware

import (
	"strings"

	"github.com/NattX28/AllU/internal/dto"
	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func AuthMiddleware(secret string) fiber.Handler {
	return func(c fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"message": "authorization header missing",
			})
		}

		// Check format Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"message": "invalid authorization header",
			})
		}

		// Extract real token
		tokenStr := strings.TrimSpace(parts[1])
		if tokenStr == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"message": "token missing",
			})
		}

		// Verify token
		token, err := jwt.ParseWithClaims(tokenStr, &dto.Claims{}, func(t *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"message": "invalid token",
			})
		}

		// Store claims in context
		claims := token.Claims.(*dto.Claims)

		// Convert claims.UserID to uuid.UUID
		uid, err := uuid.Parse(claims.UserID)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"message": "invalid user ID format in token",
			})
		}

		c.Locals("userID", uid)
		c.Locals("role", claims.Role)

		return c.Next()
	}
}

func RequireRole(roles ...string) fiber.Handler {
	return func(c fiber.Ctx) error {
		role, ok := c.Locals("role").(string)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"message": "role missing",
			})
		}

		for _, r := range roles {
			if role == r {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
	}
}
