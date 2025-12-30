// Package config provides configuration management for AEIMS Agent
package config

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Config represents the AEIMS Agent configuration
type Config struct {
	// Agent identification
	AgentID string `yaml:"agent_id"`
	Name    string `yaml:"name"`

	// Network ports
	GRPCPort    int `yaml:"grpc_port"`
	HTTPPort    int `yaml:"http_port"`
	MetricsPort int `yaml:"metrics_port"`

	// Logging
	LogLevel string `yaml:"log_level"`
	LogFile  string `yaml:"log_file"`

	// Control plane connection
	ControlPlane ControlPlaneConfig `yaml:"control_plane"`

	// Provider configurations
	Providers ProvidersConfig `yaml:"providers"`

	// Build integration
	Builds BuildsConfig `yaml:"builds"`

	// Security
	Security SecurityConfig `yaml:"security"`
}

// ControlPlaneConfig for connecting to AEIMS central
type ControlPlaneConfig struct {
	Enabled   bool   `yaml:"enabled"`
	URL       string `yaml:"url"`
	Token     string `yaml:"token"`
	TLSVerify bool   `yaml:"tls_verify"`
}

// ProvidersConfig for cloud and local providers
type ProvidersConfig struct {
	Docker     DockerConfig     `yaml:"docker"`
	AWS        AWSConfig        `yaml:"aws"`
	OCI        OCIConfig        `yaml:"oci"`
	Kubernetes KubernetesConfig `yaml:"kubernetes"`
}

// DockerConfig for local Docker management
type DockerConfig struct {
	Enabled    bool   `yaml:"enabled"`
	Host       string `yaml:"host"`        // unix:///var/run/docker.sock or tcp://host:2376
	APIVersion string `yaml:"api_version"` // e.g., "1.43"
	TLSVerify  bool   `yaml:"tls_verify"`
	CertPath   string `yaml:"cert_path"`
}

// AWSConfig for AWS integration
type AWSConfig struct {
	Enabled         bool   `yaml:"enabled"`
	Region          string `yaml:"region"`
	AccessKeyID     string `yaml:"access_key_id"`
	SecretAccessKey string `yaml:"secret_access_key"`
	Profile         string `yaml:"profile"` // AWS profile name (alternative to keys)
	AssumeRoleARN   string `yaml:"assume_role_arn"`
}

// OCIConfig for Oracle Cloud integration
type OCIConfig struct {
	Enabled        bool   `yaml:"enabled"`
	ConfigFile     string `yaml:"config_file"` // ~/.oci/config
	Profile        string `yaml:"profile"`
	TenancyID      string `yaml:"tenancy_id"`
	UserID         string `yaml:"user_id"`
	Region         string `yaml:"region"`
	Fingerprint    string `yaml:"fingerprint"`
	PrivateKeyPath string `yaml:"private_key_path"`
}

// KubernetesConfig for K8s integration
type KubernetesConfig struct {
	Enabled    bool   `yaml:"enabled"`
	Kubeconfig string `yaml:"kubeconfig"`
	Context    string `yaml:"context"`
	InCluster  bool   `yaml:"in_cluster"` // Use in-cluster config
}

// BuildsConfig for integration with ads_builddaemon
type BuildsConfig struct {
	Enabled        bool     `yaml:"enabled"`
	DaemonHost     string   `yaml:"daemon_host"`
	DaemonPort     int      `yaml:"daemon_port"`
	WorkDir        string   `yaml:"work_dir"`
	DefaultTimeout int      `yaml:"default_timeout"` // seconds
	Exclude        []string `yaml:"exclude"`         // Default exclusion patterns
}

// SecurityConfig for agent security settings
type SecurityConfig struct {
	// TLS for gRPC/HTTP
	TLSEnabled  bool   `yaml:"tls_enabled"`
	TLSCertFile string `yaml:"tls_cert_file"`
	TLSKeyFile  string `yaml:"tls_key_file"`
	TLSCAFile   string `yaml:"tls_ca_file"`

	// Authentication
	AuthMethod string `yaml:"auth_method"` // none, token, mtls, ads_login
	AuthToken  string `yaml:"auth_token"`

	// Local secrets vault
	VaultEnabled bool   `yaml:"vault_enabled"`
	VaultPath    string `yaml:"vault_path"`
	VaultKeyFile string `yaml:"vault_key_file"`
}

// DefaultConfig returns a config with sensible defaults
func DefaultConfig() *Config {
	return &Config{
		GRPCPort:    9850,
		HTTPPort:    9852,
		MetricsPort: 9851,
		LogLevel:    "info",
		Providers: ProvidersConfig{
			Docker: DockerConfig{
				Enabled:    true,
				Host:       "unix:///var/run/docker.sock",
				APIVersion: "1.43",
			},
		},
		Builds: BuildsConfig{
			DaemonPort:     9847,
			DefaultTimeout: 600,
			Exclude:        []string{".git", "node_modules", "vendor", "target", "__pycache__"},
		},
		Security: SecurityConfig{
			AuthMethod: "none",
			VaultPath:  "/var/lib/aeims/vault",
		},
	}
}

// LoadConfig loads configuration from a YAML file
func LoadConfig(path string) (*Config, error) {
	cfg := DefaultConfig()

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	// Expand environment variables
	data = []byte(os.ExpandEnv(string(data)))

	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	return cfg, nil
}

// LoadConfigFromPaths tries to load config from multiple paths
func LoadConfigFromPaths(paths []string) (*Config, error) {
	for _, path := range paths {
		expandedPath := os.ExpandEnv(path)
		if _, err := os.Stat(expandedPath); err == nil {
			return LoadConfig(expandedPath)
		}
	}

	// Return default config if no file found
	return DefaultConfig(), nil
}

// DefaultConfigPaths returns the default config search paths
func DefaultConfigPaths() []string {
	home, _ := os.UserHomeDir()
	return []string{
		"/etc/aeims/agent.yaml",
		filepath.Join(home, ".config", "aeims", "agent.yaml"),
		"./agent.yaml",
		"./config/agent.yaml",
	}
}

// SaveConfig writes the configuration to a file
func SaveConfig(cfg *Config, path string) error {
	data, err := yaml.Marshal(cfg)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}
