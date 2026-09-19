# Chess.com OIDC Proxy

AWS Cognito supports federated sign-in but only speaks OIDC. Chess.com uses plain OAuth 2.0, so this Lambda service sits between them and translates — wrapping Chess.com's OAuth flow in an OIDC-compatible interface that Cognito can consume.

## How it works

1. Cognito redirects the user to this proxy's `/authorize` endpoint.
2. The proxy stores Cognito's state in DynamoDB, then redirects the user to Chess.com's OAuth login.
3. Chess.com redirects back to `/callback` with an authorization code. The proxy exchanges it for a Chess.com access token, fetches the user's profile, and stores a short-lived proxy code in DynamoDB.
4. The proxy redirects back to Cognito with the proxy code.
5. Cognito calls `POST /token`. The proxy issues a signed RS256 JWT (ID token) and an opaque access token.
6. If Cognito calls `GET /userinfo`, the proxy looks up the access token in DynamoDB and returns the user's claims.

The RSA private key used to sign ID tokens is stored in AWS Secrets Manager and loaded once per Lambda container.

## Before deploying — required manual steps

1. Obtain Chess.com credentials via their [Developer Community](https://www.chess.com/developers) and fill in `backend/chesscom.yml` (copy from `chesscom.yml.example`).

2. Confirm Chess.com OAuth endpoints (authorize/token URLs, scopes) — update the constants at the top of `api.ts` if different from `oauth.chess.com`.

3. Generate an RSA key pair and store it in Secrets Manager:
   ```bash
   openssl genrsa -out key.pem 2048
   aws secretsmanager create-secret \
     --name "dev/chesscom-oidc/rsa-key" \
     --secret-string "{\"privateKey\":\"$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' key.pem)\"}"
   ```
   Replace `dev` with `prod` when deploying to production. Delete `key.pem` afterwards.

4. Deploy `chesscomOIDCService` and verify the discovery document is reachable:
   ```bash
   curl https://chesscom-oidc-dev.chessdojo.club/.well-known/openid-configuration
   ```

5. Deploy `root` — the `ChesscomIdentityProvider` Cognito resource will be created and Chess.com will appear as a sign-in option in the user pool.
