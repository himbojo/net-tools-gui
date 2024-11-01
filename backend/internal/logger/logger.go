// File: backend/internal/logger/logger.go

package logger

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"time"
)

type Logger struct {
	debugLogger *log.Logger
	infoLogger  *log.Logger
	warnLogger  *log.Logger
	errorLogger *log.Logger
}

var (
	defaultLogger *Logger
	logFile       *os.File
)

func init() {
	// Create logs directory if it doesn't exist
	if err := os.MkdirAll("logs", 0755); err != nil {
		log.Fatal("Failed to create logs directory:", err)
	}

	// Create or open log file with timestamp
	filename := filepath.Join("logs", fmt.Sprintf("nettools_%s.log", time.Now().Format("2006-01-02")))
	var err error
	logFile, err = os.OpenFile(filename, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatal("Failed to open log file:", err)
	}

	defaultLogger = &Logger{
		debugLogger: log.New(logFile, "DEBUG: ", log.Ldate|log.Ltime),
		infoLogger:  log.New(logFile, "INFO:  ", log.Ldate|log.Ltime),
		warnLogger:  log.New(logFile, "WARN:  ", log.Ldate|log.Ltime),
		errorLogger: log.New(logFile, "ERROR: ", log.Ldate|log.Ltime),
	}
}

// getFileAndLine returns the file name and line number of the caller
func getFileAndLine() string {
	_, file, line, ok := runtime.Caller(2)
	if !ok {
		return "unknown:0"
	}
	return fmt.Sprintf("%s:%d", filepath.Base(file), line)
}

func Debug(format string, v ...interface{}) {
	loc := getFileAndLine()
	defaultLogger.debugLogger.Printf("%s: %s", loc, fmt.Sprintf(format, v...))
}

func Info(format string, v ...interface{}) {
	loc := getFileAndLine()
	defaultLogger.infoLogger.Printf("%s: %s", loc, fmt.Sprintf(format, v...))
}

func Warn(format string, v ...interface{}) {
	loc := getFileAndLine()
	defaultLogger.warnLogger.Printf("%s: %s", loc, fmt.Sprintf(format, v...))
}

func Error(format string, v ...interface{}) {
	loc := getFileAndLine()
	defaultLogger.errorLogger.Printf("%s: %s", loc, fmt.Sprintf(format, v...))
}

// Close should be called before the program exits
func Close() {
	if logFile != nil {
		logFile.Close()
	}
}
