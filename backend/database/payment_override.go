package database

import (
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/aws"
)

const (
	// PaymentCustomerIdOverride is stored in PaymentInfo.CustomerId for admin-granted complimentary access.
	PaymentCustomerIdOverride = "OVERRIDE"
	// PaymentOverrideRevokedBySystem is stored in OverrideRevokedBy when access ends due to expiresAt.
	PaymentOverrideRevokedBySystem = "system"
)

// IsStripeCustomerID reports whether customerId looks like a Stripe customer id (cus_…).
func IsStripeCustomerID(customerId string) bool {
	return strings.HasPrefix(customerId, "cus_")
}

// IsPaymentOverrideActive returns true when customerId is OVERRIDE and expiresAt is absent or in the future.
func IsPaymentOverrideActive(pi *PaymentInfo, now time.Time) bool {
	if pi == nil || pi.CustomerId != PaymentCustomerIdOverride {
		return false
	}
	if pi.ExpiresAt == "" {
		return true
	}
	exp, err := time.Parse(time.RFC3339, pi.ExpiresAt)
	if err != nil {
		return false
	}
	return now.Before(exp)
}

// IsPaymentOverrideExpired returns true when OVERRIDE is set and expiresAt is in the past.
func IsPaymentOverrideExpired(pi *PaymentInfo, now time.Time) bool {
	if pi == nil || pi.CustomerId != PaymentCustomerIdOverride || pi.ExpiresAt == "" {
		return false
	}
	exp, err := time.Parse(time.RFC3339, pi.ExpiresAt)
	if err != nil {
		return false
	}
	return !now.Before(exp)
}

// ExpirePaymentOverrideIfNeeded clears an expired OVERRIDE subscription and updates Dynamo.
// It is a no-op when the user is not on an expired OVERRIDE.
func ExpirePaymentOverrideIfNeeded(repo UserUpdater, username string, user *User) (*User, error) {
	if user == nil || !IsPaymentOverrideExpired(user.PaymentInfo, time.Now()) {
		return user, nil
	}

	now := time.Now().Format(time.RFC3339)
	pi := PaymentInfo{
		UpdatedAt:         now,
		OverrideRevokedAt: now,
		OverrideRevokedBy: PaymentOverrideRevokedBySystem,
	}

	update := &UserUpdate{
		SubscriptionStatus: aws.String(string(SubscriptionStatus_NotSubscribed)),
		SubscriptionTier:   aws.String(string(SubscriptionTier_Free)),
		PaymentInfo:        &pi,
	}

	newUser, err := repo.UpdateUser(username, update)
	if err != nil {
		return user, err
	}
	return newUser, nil
}
