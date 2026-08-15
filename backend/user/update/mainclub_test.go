package main

import (
	"testing"

	"github.com/aws/aws-sdk-go/aws"
	apierrors "github.com/jackstenglein/chess-dojo-scheduler/backend/api/errors"
	"github.com/jackstenglein/chess-dojo-scheduler/backend/database"
)

func TestValidateMainClubId(t *testing.T) {
	tests := []struct {
		name          string
		user          *database.User
		update        *database.UserUpdate
		wantMainClub  *string
		wantErrorCode int
	}{
		{
			name:         "unset",
			user:         &database.User{Clubs: []string{"club-a", "club-b"}},
			update:       &database.UserUpdate{},
			wantMainClub: nil,
		},
		{
			name:         "empty",
			user:         &database.User{Clubs: []string{"club-a", "club-b"}},
			update:       &database.UserUpdate{MainClubId: aws.String("")},
			wantMainClub: aws.String(""),
		},
		{
			name:         "whitespace",
			user:         &database.User{Clubs: []string{"club-a", "club-b"}},
			update:       &database.UserUpdate{MainClubId: aws.String("  ")},
			wantMainClub: aws.String(""),
		},
		{
			name:         "member",
			user:         &database.User{Clubs: []string{"club-a", "club-b"}},
			update:       &database.UserUpdate{MainClubId: aws.String("club-a")},
			wantMainClub: aws.String("club-a"),
		},
		{
			name:          "nonMember",
			user:          &database.User{Clubs: []string{"club-a", "club-b"}},
			update:        &database.UserUpdate{MainClubId: aws.String("club-c")},
			wantErrorCode: 400,
		},
		{
			name:          "noClubs",
			user:          &database.User{},
			update:        &database.UserUpdate{MainClubId: aws.String("club-a")},
			wantErrorCode: 400,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateMainClubId(tt.user, tt.update)
			if tt.wantErrorCode == 0 && err != nil {
				t.Fatalf("validateMainClubId() error = %v, want nil", err)
			}
			if tt.wantErrorCode != 0 {
				apiErr, ok := err.(*apierrors.Error)
				if !ok {
					t.Fatalf("validateMainClubId() error = %T, want *errors.Error", err)
				}
				if apiErr.Code != tt.wantErrorCode {
					t.Errorf("validateMainClubId() error code = %d, want %d", apiErr.Code, tt.wantErrorCode)
				}
				return
			}
			if tt.wantMainClub == nil {
				if tt.update.MainClubId != nil {
					t.Errorf("validateMainClubId() mainClubId = %q, want nil", *tt.update.MainClubId)
				}
				return
			}
			if tt.update.MainClubId == nil || *tt.update.MainClubId != *tt.wantMainClub {
				var got string
				if tt.update.MainClubId != nil {
					got = *tt.update.MainClubId
				}
				t.Errorf("validateMainClubId() mainClubId = %q, want %q", got, *tt.wantMainClub)
			}
		})
	}
}
