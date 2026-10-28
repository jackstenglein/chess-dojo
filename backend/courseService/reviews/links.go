package main

import (
	"net/url"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

const reviewLinkMessage = "Links are allowed only to chessdojo.club, chess.com, and lichess.org."

// Detect schemes, protocol-relative URLs, and bare domains, including Unicode
// lookalikes. Match complete hosts so an allowed suffix cannot disguise a site.
var reviewIPv4 = regexp.MustCompile(`(?:[0-9]{1,3}\.){3}[0-9]{1,3}`)

var reviewLinks = regexp.MustCompile("(?i)(?:(?:[a-z][a-z0-9+.-]*://|(?:https?|mailto|javascript|data|tel):|//|www\\.)[^\\s<>\"`]+|(?:[\\p{L}\\p{N}](?:[\\p{L}\\p{N}-]*[\\p{L}\\p{N}])?\\.)+[\\p{L}]{2,}(?::[0-9]+)?(?:[/?#][^\\s<>\"`]*)?)")

func hasDisallowedReviewLinks(text string) bool {
	if reviewIPv4.MatchString(text) {
		return true
	}
	for _, location := range reviewLinks.FindAllStringIndex(text, -1) {
		// Do not interpret a prefix of chess notation (e.g. 2.Nf3) as a domain.
		if location[1] < len(text) {
			next, _ := utf8.DecodeRuneInString(text[location[1]:])
			if unicode.IsLetter(next) || unicode.IsNumber(next) || next == '-' {
				continue
			}
		}
		candidate := text[location[0]:location[1]]
		candidate = strings.TrimRight(candidate, ".,!?;:)]}")
		if strings.Contains(candidate, "\\") {
			return true
		}
		if strings.HasPrefix(candidate, "//") {
			candidate = "https:" + candidate
		} else if !strings.Contains(candidate, "://") {
			// Never turn a non-web scheme into an allowed HTTPS URL.
			lower := strings.ToLower(candidate)
			for _, scheme := range []string{"http:", "https:", "mailto:", "javascript:", "data:", "tel:"} {
				if strings.HasPrefix(lower, scheme) {
					return true
				}
			}
			candidate = "https://" + candidate
		}
		parsed, err := url.Parse(candidate)
		if err != nil || parsed.User != nil || (strings.ToLower(parsed.Scheme) != "http" && strings.ToLower(parsed.Scheme) != "https") {
			return true
		}
		host := strings.TrimSuffix(strings.ToLower(parsed.Hostname()), ".")
		allowed := false
		for _, domain := range []string{"chessdojo.club", "chess.com", "lichess.org"} {
			if host == domain || strings.HasSuffix(host, "."+domain) {
				allowed = true
				break
			}
		}
		if !allowed {
			return true
		}
	}
	return false
}
