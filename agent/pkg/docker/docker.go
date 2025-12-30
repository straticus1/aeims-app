// Package docker provides Docker container management for AEIMS Agent
package docker

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
)

// Provider implements Docker container management
type Provider struct {
	client *client.Client
}

// Container represents a Docker container
type Container struct {
	ID        string
	Name      string
	Image     string
	State     string
	Status    string
	Ports     []PortMapping
	Labels    map[string]string
	CreatedAt time.Time
	StartedAt time.Time
}

// PortMapping represents a container port mapping
type PortMapping struct {
	ContainerPort int
	HostPort      int
	Protocol      string
	HostIP        string
}

// NewProvider creates a new Docker provider
func NewProvider(host string, version string) (*Provider, error) {
	opts := []client.Opt{
		client.WithHost(host),
	}

	if version != "" {
		opts = append(opts, client.WithVersion(version))
	}

	cli, err := client.NewClientWithOpts(opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create docker client: %w", err)
	}

	return &Provider{client: cli}, nil
}

// NewProviderFromEnv creates a provider using environment variables
func NewProviderFromEnv() (*Provider, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv)
	if err != nil {
		return nil, fmt.Errorf("failed to create docker client: %w", err)
	}

	return &Provider{client: cli}, nil
}

// Ping tests the connection to Docker
func (p *Provider) Ping(ctx context.Context) error {
	_, err := p.client.Ping(ctx)
	return err
}

// ListContainers returns all containers
func (p *Provider) ListContainers(ctx context.Context, all bool) ([]Container, error) {
	opts := container.ListOptions{
		All: all,
	}

	containers, err := p.client.ContainerList(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	result := make([]Container, len(containers))
	for i, c := range containers {
		result[i] = containerFromAPI(c)
	}

	return result, nil
}

// ListContainersWithFilters returns containers matching filters
func (p *Provider) ListContainersWithFilters(ctx context.Context, all bool, filterMap map[string][]string) ([]Container, error) {
	f := filters.NewArgs()
	for key, values := range filterMap {
		for _, v := range values {
			f.Add(key, v)
		}
	}

	opts := container.ListOptions{
		All:     all,
		Filters: f,
	}

	containers, err := p.client.ContainerList(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	result := make([]Container, len(containers))
	for i, c := range containers {
		result[i] = containerFromAPI(c)
	}

	return result, nil
}

// GetContainer returns a single container by ID
func (p *Provider) GetContainer(ctx context.Context, id string) (*Container, error) {
	json, err := p.client.ContainerInspect(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect container: %w", err)
	}

	c := &Container{
		ID:     json.ID,
		Name:   json.Name,
		Image:  json.Config.Image,
		State:  json.State.Status,
		Status: json.State.Status,
		Labels: json.Config.Labels,
	}

	if json.State.StartedAt != "" {
		c.StartedAt, _ = time.Parse(time.RFC3339Nano, json.State.StartedAt)
	}

	// Parse port mappings
	for port, bindings := range json.NetworkSettings.Ports {
		for _, binding := range bindings {
			pm := PortMapping{
				ContainerPort: port.Int(),
				Protocol:      port.Proto(),
				HostIP:        binding.HostIP,
			}
			if binding.HostPort != "" {
				fmt.Sscanf(binding.HostPort, "%d", &pm.HostPort)
			}
			c.Ports = append(c.Ports, pm)
		}
	}

	return c, nil
}

// StartContainer starts a stopped container
func (p *Provider) StartContainer(ctx context.Context, id string) error {
	return p.client.ContainerStart(ctx, id, container.StartOptions{})
}

// StopContainer stops a running container
func (p *Provider) StopContainer(ctx context.Context, id string, timeout int) error {
	timeoutDuration := time.Duration(timeout) * time.Second
	return p.client.ContainerStop(ctx, id, container.StopOptions{Timeout: &timeout, Signal: ""})
	_ = timeoutDuration // unused, API uses int seconds
}

// RestartContainer restarts a container
func (p *Provider) RestartContainer(ctx context.Context, id string, timeout int) error {
	return p.client.ContainerRestart(ctx, id, container.StopOptions{Timeout: &timeout})
}

// PauseContainer pauses a running container
func (p *Provider) PauseContainer(ctx context.Context, id string) error {
	return p.client.ContainerPause(ctx, id)
}

// UnpauseContainer unpauses a paused container
func (p *Provider) UnpauseContainer(ctx context.Context, id string) error {
	return p.client.ContainerUnpause(ctx, id)
}

// KillContainer sends a signal to a container
func (p *Provider) KillContainer(ctx context.Context, id string, signal string) error {
	if signal == "" {
		signal = "SIGKILL"
	}
	return p.client.ContainerKill(ctx, id, signal)
}

// RemoveContainer removes a container
func (p *Provider) RemoveContainer(ctx context.Context, id string, force bool, removeVolumes bool) error {
	return p.client.ContainerRemove(ctx, id, container.RemoveOptions{
		Force:         force,
		RemoveVolumes: removeVolumes,
	})
}

// GetLogs returns container logs
func (p *Provider) GetLogs(ctx context.Context, id string, tail int, follow bool, timestamps bool) (io.ReadCloser, error) {
	opts := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     follow,
		Timestamps: timestamps,
	}

	if tail > 0 {
		opts.Tail = fmt.Sprintf("%d", tail)
	}

	return p.client.ContainerLogs(ctx, id, opts)
}

// GetStats returns container resource usage statistics
func (p *Provider) GetStats(ctx context.Context, id string) (*types.Stats, error) {
	statsResp, err := p.client.ContainerStats(ctx, id, false)
	if err != nil {
		return nil, err
	}
	defer statsResp.Body.Close()

	// TODO: Parse stats JSON
	return nil, nil
}

// Info returns Docker daemon information
func (p *Provider) Info(ctx context.Context) (types.Info, error) {
	return p.client.Info(ctx)
}

// Version returns Docker version information
func (p *Provider) Version(ctx context.Context) (types.Version, error) {
	return p.client.ServerVersion(ctx)
}

// Close closes the Docker client
func (p *Provider) Close() error {
	return p.client.Close()
}

// Helper to convert API container to our Container type
func containerFromAPI(c types.Container) Container {
	name := ""
	if len(c.Names) > 0 {
		name = c.Names[0]
		if len(name) > 0 && name[0] == '/' {
			name = name[1:]
		}
	}

	ports := make([]PortMapping, len(c.Ports))
	for i, p := range c.Ports {
		ports[i] = PortMapping{
			ContainerPort: int(p.PrivatePort),
			HostPort:      int(p.PublicPort),
			Protocol:      p.Type,
			HostIP:        p.IP,
		}
	}

	return Container{
		ID:        c.ID,
		Name:      name,
		Image:     c.Image,
		State:     c.State,
		Status:    c.Status,
		Ports:     ports,
		Labels:    c.Labels,
		CreatedAt: time.Unix(c.Created, 0),
	}
}
