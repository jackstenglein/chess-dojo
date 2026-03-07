package api

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"encoding/json"
	"fmt"

	rootapi "github.com/jackstenglein/chess-dojo-scheduler/backend/api"
)

// SerializeResponse JSON-marshals v, gzip-compresses the result, and returns
// a base64-encoded API Gateway response with appropriate headers.
func SerializeResponse(v any) (rootapi.Response, error) {
	jsonBytes, err := json.Marshal(v)
	if err != nil {
		return rootapi.Response{}, fmt.Errorf("marshal: %w", err)
	}

	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	if _, err := gz.Write(jsonBytes); err != nil {
		return rootapi.Response{}, fmt.Errorf("gzip write: %w", err)
	}
	if err := gz.Close(); err != nil {
		return rootapi.Response{}, fmt.Errorf("gzip close: %w", err)
	}

	return rootapi.Response{
		StatusCode:      200,
		IsBase64Encoded: true,
		Body:            base64.StdEncoding.EncodeToString(buf.Bytes()),
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Content-Encoding":            "gzip",
			"Access-Control-Allow-Origin": "*",
		},
	}, nil
}
