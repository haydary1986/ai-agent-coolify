package tools

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

// SearchWeb performs a basic search on DuckDuckGo Lite and returns a summarized text of the top results.
func SearchWeb(query string) (string, error) {
	searchURL := fmt.Sprintf("https://lite.duckduckgo.com/lite/")
	
	data := url.Values{}
	data.Set("q", query)

	req, err := http.NewRequest("POST", searchURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	body := string(bodyBytes)

	// Extract snippets from DDG Lite HTML using Regex
	// DuckDuckGo Lite puts results in <tr class="result-snippet"><td>...</td></tr>
	re := regexp.MustCompile(`(?i)<tr class=['"]?result-snippet['"]?>\s*<td[^>]*>(.*?)</td>\s*</tr>`)
	matches := re.FindAllStringSubmatch(body, 5) // Get top 5 results

	if len(matches) == 0 {
		return "لا توجد نتائج واضحة من الإنترنت.", nil
	}

	var results []string
	stripTags := regexp.MustCompile(`<[^>]*>`)
	for i, match := range matches {
		if len(match) > 1 {
			cleanText := stripTags.ReplaceAllString(match[1], "")
			cleanText = strings.TrimSpace(strings.ReplaceAll(cleanText, "\n", " "))
			if cleanText != "" {
				results = append(results, fmt.Sprintf("%d. %s", i+1, cleanText))
			}
		}
	}

	return strings.Join(results, "\n"), nil
}
