// AEIMS Agent - Advanced Engineering Infrastructure Management Services
// Client-side daemon for managing local and cloud infrastructure
package main

import (
	"context"
	"fmt"
	"net"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	"github.com/prometheus/client_golang/prometheus/promhttp"
	"net/http"
)

const (
	DefaultGRPCPort    = 9850
	DefaultMetricsPort = 9851
	DefaultHTTPPort    = 9852
	Version            = "0.1.0"
)

var (
	cfgFile string
	logger  *zap.Logger
)

func main() {
	rootCmd := &cobra.Command{
		Use:     "aeims-agent",
		Short:   "AEIMS Agent - Infrastructure Management Daemon",
		Long:    `Advanced Engineering Infrastructure Management Services Agent. Runs on client infrastructure to manage local Docker, cloud resources, and integrate with AEIMS control plane.`,
		Version: Version,
		Run:     runAgent,
	}

	// Flags
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default: /etc/aeims/agent.yaml)")
	rootCmd.Flags().IntP("grpc-port", "g", DefaultGRPCPort, "gRPC API port")
	rootCmd.Flags().IntP("http-port", "p", DefaultHTTPPort, "HTTP API port")
	rootCmd.Flags().IntP("metrics-port", "m", DefaultMetricsPort, "Prometheus metrics port")
	rootCmd.Flags().Bool("enable-docker", true, "Enable Docker provider")
	rootCmd.Flags().Bool("enable-aws", false, "Enable AWS provider")
	rootCmd.Flags().Bool("enable-oci", false, "Enable OCI provider")
	rootCmd.Flags().Bool("enable-builds", false, "Enable build integration (requires ads_builddaemon)")
	rootCmd.Flags().String("control-plane", "", "AEIMS control plane URL for registration")
	rootCmd.Flags().String("agent-id", "", "Unique agent identifier (auto-generated if empty)")
	rootCmd.Flags().StringP("log-level", "l", "info", "Log level (debug, info, warn, error)")

	// Bind flags to viper
	viper.BindPFlag("grpc_port", rootCmd.Flags().Lookup("grpc-port"))
	viper.BindPFlag("http_port", rootCmd.Flags().Lookup("http-port"))
	viper.BindPFlag("metrics_port", rootCmd.Flags().Lookup("metrics-port"))
	viper.BindPFlag("providers.docker.enabled", rootCmd.Flags().Lookup("enable-docker"))
	viper.BindPFlag("providers.aws.enabled", rootCmd.Flags().Lookup("enable-aws"))
	viper.BindPFlag("providers.oci.enabled", rootCmd.Flags().Lookup("enable-oci"))
	viper.BindPFlag("builds.enabled", rootCmd.Flags().Lookup("enable-builds"))
	viper.BindPFlag("control_plane", rootCmd.Flags().Lookup("control-plane"))
	viper.BindPFlag("agent_id", rootCmd.Flags().Lookup("agent-id"))
	viper.BindPFlag("log_level", rootCmd.Flags().Lookup("log-level"))

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func runAgent(cmd *cobra.Command, args []string) {
	// Initialize config
	initConfig()

	// Initialize logger
	initLogger()
	defer logger.Sync()

	logger.Info("Starting AEIMS Agent",
		zap.String("version", Version),
		zap.String("arch", runtime.GOARCH),
		zap.String("os", runtime.GOOS),
	)

	// Create context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start gRPC server
	grpcPort := viper.GetInt("grpc_port")
	grpcLis, err := net.Listen("tcp", fmt.Sprintf(":%d", grpcPort))
	if err != nil {
		logger.Fatal("Failed to listen on gRPC port", zap.Int("port", grpcPort), zap.Error(err))
	}

	grpcServer := grpc.NewServer(
		grpc.UnaryInterceptor(loggingUnaryInterceptor),
		grpc.StreamInterceptor(loggingStreamInterceptor),
	)

	// Register health service
	healthServer := health.NewServer()
	grpc_health_v1.RegisterHealthServer(grpcServer, healthServer)

	// Enable reflection for debugging
	reflection.Register(grpcServer)

	// TODO: Register AEIMS service implementation
	// api.RegisterAeimsAgentServer(grpcServer, NewAeimsAgentServer())

	go func() {
		logger.Info("gRPC server starting", zap.Int("port", grpcPort))
		if err := grpcServer.Serve(grpcLis); err != nil {
			logger.Error("gRPC server error", zap.Error(err))
		}
	}()

	// Start metrics server
	metricsPort := viper.GetInt("metrics_port")
	metricsMux := http.NewServeMux()
	metricsMux.Handle("/metrics", promhttp.Handler())
	metricsServer := &http.Server{
		Addr:    fmt.Sprintf(":%d", metricsPort),
		Handler: metricsMux,
	}
	go func() {
		logger.Info("Metrics server starting", zap.Int("port", metricsPort))
		if err := metricsServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("Metrics server error", zap.Error(err))
		}
	}()

	// Start HTTP API server (REST gateway)
	httpPort := viper.GetInt("http_port")
	httpMux := http.NewServeMux()
	httpMux.HandleFunc("/health", healthHandler)
	httpMux.HandleFunc("/status", statusHandler)
	httpServer := &http.Server{
		Addr:    fmt.Sprintf(":%d", httpPort),
		Handler: httpMux,
	}
	go func() {
		logger.Info("HTTP server starting", zap.Int("port", httpPort))
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("HTTP server error", zap.Error(err))
		}
	}()

	// Register with control plane if configured
	controlPlane := viper.GetString("control_plane")
	if controlPlane != "" {
		go registerWithControlPlane(ctx, controlPlane)
	}

	// Wait for shutdown signal
	<-sigChan
	logger.Info("Shutdown signal received")

	// Graceful shutdown
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	grpcServer.GracefulStop()
	httpServer.Shutdown(shutdownCtx)
	metricsServer.Shutdown(shutdownCtx)

	logger.Info("AEIMS Agent stopped")
}

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		viper.SetConfigName("agent")
		viper.SetConfigType("yaml")
		viper.AddConfigPath("/etc/aeims")
		viper.AddConfigPath("$HOME/.config/aeims")
		viper.AddConfigPath(".")
	}

	viper.SetEnvPrefix("AEIMS")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			fmt.Fprintf(os.Stderr, "Error reading config: %v\n", err)
		}
	}
}

func initLogger() {
	level := zapcore.InfoLevel
	switch viper.GetString("log_level") {
	case "debug":
		level = zapcore.DebugLevel
	case "warn":
		level = zapcore.WarnLevel
	case "error":
		level = zapcore.ErrorLevel
	}

	config := zap.Config{
		Level:       zap.NewAtomicLevelAt(level),
		Development: false,
		Encoding:    "json",
		EncoderConfig: zapcore.EncoderConfig{
			TimeKey:        "ts",
			LevelKey:       "level",
			NameKey:        "logger",
			CallerKey:      "caller",
			MessageKey:     "msg",
			StacktraceKey:  "stacktrace",
			LineEnding:     zapcore.DefaultLineEnding,
			EncodeLevel:    zapcore.LowercaseLevelEncoder,
			EncodeTime:     zapcore.ISO8601TimeEncoder,
			EncodeDuration: zapcore.SecondsDurationEncoder,
			EncodeCaller:   zapcore.ShortCallerEncoder,
		},
		OutputPaths:      []string{"stdout"},
		ErrorOutputPaths: []string{"stderr"},
	}

	var err error
	logger, err = config.Build()
	if err != nil {
		panic(err)
	}
}

func loggingUnaryInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	start := time.Now()
	resp, err := handler(ctx, req)
	logger.Debug("gRPC unary call",
		zap.String("method", info.FullMethod),
		zap.Duration("duration", time.Since(start)),
		zap.Error(err),
	)
	return resp, err
}

func loggingStreamInterceptor(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
	start := time.Now()
	err := handler(srv, ss)
	logger.Debug("gRPC stream call",
		zap.String("method", info.FullMethod),
		zap.Duration("duration", time.Since(start)),
		zap.Error(err),
	)
	return err
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"healthy"}`))
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
	hostname, _ := os.Hostname()
	status := fmt.Sprintf(`{
  "agent_id": "%s",
  "version": "%s",
  "hostname": "%s",
  "arch": "%s",
  "os": "%s",
  "grpc_port": %d,
  "http_port": %d,
  "metrics_port": %d
}`,
		viper.GetString("agent_id"),
		Version,
		hostname,
		runtime.GOARCH,
		runtime.GOOS,
		viper.GetInt("grpc_port"),
		viper.GetInt("http_port"),
		viper.GetInt("metrics_port"),
	)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(status))
}

func registerWithControlPlane(ctx context.Context, controlPlane string) {
	logger.Info("Registering with AEIMS control plane", zap.String("url", controlPlane))
	// TODO: Implement control plane registration
	// - Send agent capabilities
	// - Establish bidirectional streaming for commands
	// - Heartbeat loop
}
