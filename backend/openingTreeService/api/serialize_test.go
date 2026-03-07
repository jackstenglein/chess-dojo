package api

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"encoding/json"
	"io"
	"testing"
)

func TestSerializeResponse_RoundTrip(t *testing.T) {
	input := map[string]string{"hello": "world"}

	resp, err := SerializeResponse(input)
	if err != nil {
		t.Fatalf("SerializeResponse error: %v", err)
	}

	if resp.StatusCode != 200 {
		t.Errorf("StatusCode = %d, want 200", resp.StatusCode)
	}
	if !resp.IsBase64Encoded {
		t.Error("IsBase64Encoded = false, want true")
	}
	if resp.Headers["Content-Encoding"] != "gzip" {
		t.Errorf("Content-Encoding = %q, want gzip", resp.Headers["Content-Encoding"])
	}
	if resp.Headers["Content-Type"] != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", resp.Headers["Content-Type"])
	}

	// Decode base64 → gunzip → unmarshal and verify round-trip.
	compressed, err := base64.StdEncoding.DecodeString(resp.Body)
	if err != nil {
		t.Fatalf("base64 decode error: %v", err)
	}
	gz, err := gzip.NewReader(bytes.NewReader(compressed))
	if err != nil {
		t.Fatalf("gzip reader error: %v", err)
	}
	jsonBytes, err := io.ReadAll(gz)
	if err != nil {
		t.Fatalf("gzip read error: %v", err)
	}

	var got map[string]string
	if err := json.Unmarshal(jsonBytes, &got); err != nil {
		t.Fatalf("json unmarshal error: %v", err)
	}
	if got["hello"] != "world" {
		t.Errorf("got[hello] = %q, want world", got["hello"])
	}
}
