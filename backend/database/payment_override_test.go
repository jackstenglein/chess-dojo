package database

import (
	"testing"
	"time"
)

func TestBuildUserUpdateEndPaymentOverride_restoresStripe(t *testing.T) {
	user := &User{
		SubscriptionStatus: SubscriptionStatus_Subscribed,
		SubscriptionTier:   SubscriptionTier_Lecture,
		PaymentInfo: &PaymentInfo{
			CustomerId:                  PaymentCustomerIdOverride,
			PreservedCustomerId:         "cus_test123",
			PreservedSubscriptionId:     "sub_test456",
			PreservedSubscriptionStatus: string(SubscriptionStatus_Subscribed),
			PreservedSubscriptionTier:   string(SubscriptionTier_Basic),
		},
	}

	update := BuildUserUpdateEndPaymentOverride(user, PaymentOverrideRevokedBySystem)
	if update.PaymentInfo == nil {
		t.Fatal("expected payment info")
	}
	if update.PaymentInfo.CustomerId != "cus_test123" {
		t.Fatalf("customerId = %q, want cus_test123", update.PaymentInfo.CustomerId)
	}
	if update.PaymentInfo.SubscriptionId != "sub_test456" {
		t.Fatalf("subscriptionId = %q, want sub_test456", update.PaymentInfo.SubscriptionId)
	}
	if *update.SubscriptionStatus != string(SubscriptionStatus_Subscribed) {
		t.Fatalf("status = %q", *update.SubscriptionStatus)
	}
	if *update.SubscriptionTier != string(SubscriptionTier_Basic) {
		t.Fatalf("tier = %q", *update.SubscriptionTier)
	}
}

func TestBuildUserUpdateEndPaymentOverride_noPreservedStripe(t *testing.T) {
	user := &User{
		PaymentInfo: &PaymentInfo{
			CustomerId: PaymentCustomerIdOverride,
		},
	}

	update := BuildUserUpdateEndPaymentOverride(user, "admin")
	if update.PaymentInfo.CustomerId != "" {
		t.Fatalf("customerId = %q, want empty", update.PaymentInfo.CustomerId)
	}
	if *update.SubscriptionStatus != string(SubscriptionStatus_NotSubscribed) {
		t.Fatalf("status = %q", *update.SubscriptionStatus)
	}
}

func TestApplyStripePreservationForOverride(t *testing.T) {
	user := &User{
		SubscriptionStatus: SubscriptionStatus_Subscribed,
		SubscriptionTier:   SubscriptionTier_GameReview,
		PaymentInfo: &PaymentInfo{
			CustomerId:     "cus_abc",
			SubscriptionId: "sub_xyz",
		},
	}
	pi := &PaymentInfo{}
	ApplyStripePreservationForOverride(pi, user)
	if pi.PreservedCustomerId != "cus_abc" {
		t.Fatalf("preserved customer = %q", pi.PreservedCustomerId)
	}
	if pi.PreservedSubscriptionTier != string(SubscriptionTier_GameReview) {
		t.Fatalf("preserved tier = %q", pi.PreservedSubscriptionTier)
	}
}

func TestIsPaymentOverrideExpired(t *testing.T) {
	past := time.Now().Add(-time.Hour).Format(time.RFC3339)
	pi := &PaymentInfo{
		CustomerId: PaymentCustomerIdOverride,
		ExpiresAt:  past,
	}
	if !isPaymentOverrideExpired(pi, time.Now()) {
		t.Fatal("expected expired")
	}
}
