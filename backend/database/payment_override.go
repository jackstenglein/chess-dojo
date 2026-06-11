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

// isPaymentOverrideExpired returns true when OVERRIDE is set and expiresAt is in the past.
func isPaymentOverrideExpired(pi *PaymentInfo, now time.Time) bool {
	if pi == nil || pi.CustomerId != PaymentCustomerIdOverride || pi.ExpiresAt == "" {
		return false
	}
	exp, err := time.Parse(time.RFC3339, pi.ExpiresAt)
	if err != nil {
		return false
	}
	return !now.Before(exp)
}

// ApplyStripePreservationForOverride copies the user's current Stripe billing into pi before entering OVERRIDE.
func ApplyStripePreservationForOverride(pi *PaymentInfo, user *User) {
	if pi == nil || user == nil {
		return
	}
	cid := user.PaymentInfo.GetCustomerId()
	if IsStripeCustomerID(cid) {
		pi.PreservedCustomerId = cid
		pi.PreservedSubscriptionId = user.PaymentInfo.GetSubscriptionId()
		pi.PreservedSubscriptionStatus = string(user.SubscriptionStatus)
		pi.PreservedSubscriptionTier = string(user.GetSubscriptionTier())
		return
	}
	pi.PreservedCustomerId = ""
	pi.PreservedSubscriptionId = ""
	pi.PreservedSubscriptionStatus = ""
	pi.PreservedSubscriptionTier = ""
}

// BuildUserUpdateEndPaymentOverride returns an update that ends OVERRIDE and restores preserved Stripe billing when present.
func BuildUserUpdateEndPaymentOverride(user *User, revokedBy string) *UserUpdate {
	now := time.Now().Format(time.RFC3339)
	pi := PaymentInfo{
		UpdatedAt:         now,
		OverrideRevokedAt: now,
		OverrideRevokedBy: revokedBy,
	}

	status := SubscriptionStatus_NotSubscribed
	tier := SubscriptionTier_Free

	if user != nil && user.PaymentInfo != nil && user.PaymentInfo.PreservedCustomerId != "" {
		pi.CustomerId = user.PaymentInfo.PreservedCustomerId
		pi.SubscriptionId = user.PaymentInfo.PreservedSubscriptionId
		if user.PaymentInfo.PreservedSubscriptionStatus != "" {
			status = SubscriptionStatus(user.PaymentInfo.PreservedSubscriptionStatus)
		} else {
			status = SubscriptionStatus_Subscribed
		}
		if user.PaymentInfo.PreservedSubscriptionTier != "" {
			tier = SubscriptionTier(user.PaymentInfo.PreservedSubscriptionTier)
		} else {
			tier = SubscriptionTier_Basic
		}
	}

	return &UserUpdate{
		SubscriptionStatus: aws.String(string(status)),
		SubscriptionTier:   aws.String(string(tier)),
		PaymentInfo:        &pi,
	}
}

// ExpirePaymentOverrideIfNeeded clears an expired OVERRIDE subscription and updates Dynamo.
// It is a no-op when the user is not on an expired OVERRIDE.
func ExpirePaymentOverrideIfNeeded(repo UserUpdater, username string, user *User) (*User, error) {
	if user == nil || !isPaymentOverrideExpired(user.PaymentInfo, time.Now()) {
		return user, nil
	}

	update := BuildUserUpdateEndPaymentOverride(user, PaymentOverrideRevokedBySystem)
	newUser, err := repo.UpdateUser(username, update)
	if err != nil {
		return user, err
	}
	return newUser, nil
}
