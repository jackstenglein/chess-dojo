package secrets

import (
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/secretsmanager"
)

var stage = os.Getenv("stage")
var svc = secretsmanager.New(session.Must(session.NewSession()))

// getSecret fetches the secret with the given name from AWS SecretManager.
func getSecret(name string) (string, error) {
	input := &secretsmanager.GetSecretValueInput{
		SecretId: new(name),
	}
	result, err := svc.GetSecretValue(input)
	if err != nil {
		return "", err
	}
	return *result.SecretString, nil
}

// GetApiKey fetches the Stripe API key for the current environment from AWS
// SecretManager.
func GetApiKey() (string, error) {
	return getSecret(fmt.Sprintf("chess-dojo-%s-stripeKey", stage))
}

// GetEndpointSecret fetches the Stripe webhook endpoint secret for the
// current environment from AWS SecretManager.
func GetEndpointSecret() (string, error) {
	return getSecret(fmt.Sprintf("chess-dojo-%s-stripeEndpoint", stage))
}

// GetConnectEndpointSecret fetches the Stripe Connect webhook endpoint
// secret for the current environment from AWS SecretManager.
func GetConnectEndpointSecret() (string, error) {
	return getSecret(fmt.Sprintf("chess-dojo-%s-stripeEndpointConnect", stage))
}
