// File: backend/internal/metrics/metrics.go

package metrics

import (
	"sync"
	"time"
)

type MetricType string

const (
	MetricCommandExecution MetricType = "command_execution"
	MetricWebSocket        MetricType = "websocket"
	MetricRateLimit        MetricType = "rate_limit"
)

type MetricValue struct {
	Count       int64
	TotalTime   time.Duration
	Errors      int64
	LastUpdated time.Time
}

type Metrics struct {
	mu      sync.RWMutex
	metrics map[MetricType]*MetricValue
}

var (
	defaultMetrics *Metrics
	once           sync.Once
)

func init() {
	once.Do(func() {
		defaultMetrics = NewMetrics()
	})
}

func NewMetrics() *Metrics {
	return &Metrics{
		metrics: make(map[MetricType]*MetricValue),
	}
}

func (m *Metrics) Record(metricType MetricType, duration time.Duration, err error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.metrics[metricType]; !exists {
		m.metrics[metricType] = &MetricValue{}
	}

	metric := m.metrics[metricType]
	metric.Count++
	metric.TotalTime += duration
	if err != nil {
		metric.Errors++
	}
	metric.LastUpdated = time.Now()
}

func (m *Metrics) Get(metricType MetricType) *MetricValue {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if metric, exists := m.metrics[metricType]; exists {
		return &MetricValue{
			Count:       metric.Count,
			TotalTime:   metric.TotalTime,
			Errors:      metric.Errors,
			LastUpdated: metric.LastUpdated,
		}
	}
	return nil
}

// Global helper functions
func RecordMetric(metricType MetricType, duration time.Duration, err error) {
	defaultMetrics.Record(metricType, duration, err)
}

func GetMetric(metricType MetricType) *MetricValue {
	return defaultMetrics.Get(metricType)
}
