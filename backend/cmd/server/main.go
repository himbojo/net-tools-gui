// File: backend/cmd/server/main.go
package main

import (
	"log"
	"net/http"
)

func main() {
	// TODO: Initialize server configuration
	log.Fatal(http.ListenAndServe(":8080", nil))
}
