# Lichess OIDC Proxy

AWS Cognito supports federated sign-in but only speaks OIDC. Lichess uses plain OAuth 2.0, so this Lambda service sits between them and translates — wrapping Lichess's OAuth flow in an OIDC-compatible interface that Cognito can consume.

## How it works

1. Cognito redirects the user to this proxy's `/authorize` endpoint.
2. The proxy stores Cognito's state in DynamoDB, then redirects the user to Lichess's OAuth login at `lichess.org/oauth`.
3. Lichess redirects back to `/callback` with an authorization code. The proxy exchanges it for a Lichess access token, fetches the user's profile and email, and stores a short-lived proxy code in DynamoDB.
4. The proxy redirects back to Cognito with the proxy code.
5. Cognito calls `POST /token`. The proxy issues a signed RS256 JWT (ID token) and an opaque access token.
6. If Cognito calls `GET /userinfo`, the proxy looks up the access token in DynamoDB and returns the user's claims.

The RSA private key used to sign ID tokens is stored in AWS Secrets Manager and loaded once per Lambda container.

**Note on email:** Lichess returns a real email address only when the `email:read` scope is granted. If unavailable, the proxy uses `{lichess-username}@lichess.org` as a placeholder and sets `email_verified: false`.

## Before deploying — required manual steps

1. Register an OAuth application in your [Lichess account settings](https://lichess.org/account/oauth/app) and fill in `backend/lichess.yml` (copy from `lichess.yml.example`). Set the callback URL to `https://lichess-oidc-dev.chessdojo.club/callback` (or the prod domain). Lichess does not always issue a client secret for public clients — leave `client_secret` blank if none is provided.

2. Generate an RSA key pair and store it in Secrets Manager:
   ```bash
   openssl genrsa -out key.pem 2048
   aws secretsmanager create-secret \
     --name "dev/lichess-oidc/rsa-key" \
     --secret-string "{\"privateKey\":\"$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' key.pem)\"}"
   ```
   Replace `dev` with `prod` when deploying to production. Delete `key.pem` afterwards.

3. Deploy `lichessOIDCService` and verify the discovery document is reachable:
   ```bash
   curl https://lichess-oidc-dev.chessdojo.club/.well-known/openid-configuration
   ```

4. Deploy `root` — the `LichessIdentityProvider` Cognito resource will be created and Lichess will appear as a sign-in option in the user pool.
