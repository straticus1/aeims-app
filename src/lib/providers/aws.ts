// AEIMS - AWS Provider Implementation
import {
  EC2Client,
  DescribeInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
  RebootInstancesCommand,
  TerminateInstancesCommand,
  type Instance as EC2Instance,
} from '@aws-sdk/client-ec2';
import {
  ECSClient,
  ListClustersCommand,
  ListServicesCommand,
  DescribeServicesCommand,
  ListTasksCommand,
  DescribeTasksCommand,
  UpdateServiceCommand,
} from '@aws-sdk/client-ecs';
import {
  Route53Client,
  ListHostedZonesCommand,
  ListResourceRecordSetsCommand,
  ChangeResourceRecordSetsCommand,
  type HostedZone,
  type ResourceRecordSet,
  type RRType,
} from '@aws-sdk/client-route-53';

import type {
  CloudProvider,
  ComputeInstance,
  InstanceState,
  Container,
  ContainerService,
  DnsZone,
  DnsRecord,
  DnsRecordType,
  ProviderCredentials,
} from '@/types';
import {
  BaseProvider,
  type IComputeProvider,
  type IContainerProvider,
  type IDnsProvider,
} from './base';

// =============================================================================
// AWS Compute Provider (EC2)
// =============================================================================

export class AWSComputeProvider extends BaseProvider implements IComputeProvider {
  private ec2: EC2Client;

  constructor(credentials: ProviderCredentials, region: string = 'us-east-1') {
    super('aws', credentials, region);
    this.ec2 = new EC2Client({
      region,
      credentials: {
        accessKeyId: credentials.credentials.accessKeyId,
        secretAccessKey: credentials.credentials.secretAccessKey,
      },
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.ec2.send(new DescribeInstancesCommand({ MaxResults: 5 }));
      return true;
    } catch {
      return false;
    }
  }

  async listInstances(): Promise<ComputeInstance[]> {
    const command = new DescribeInstancesCommand({});
    const response = await this.ec2.send(command);

    const instances: ComputeInstance[] = [];
    for (const reservation of response.Reservations || []) {
      for (const instance of reservation.Instances || []) {
        instances.push(this.mapEC2Instance(instance));
      }
    }
    return instances;
  }

  async getInstance(id: string): Promise<ComputeInstance | null> {
    const command = new DescribeInstancesCommand({
      InstanceIds: [id],
    });
    const response = await this.ec2.send(command);

    const reservation = response.Reservations?.[0];
    const instance = reservation?.Instances?.[0];
    return instance ? this.mapEC2Instance(instance) : null;
  }

  async startInstance(id: string): Promise<boolean> {
    const command = new StartInstancesCommand({ InstanceIds: [id] });
    await this.ec2.send(command);
    return true;
  }

  async stopInstance(id: string): Promise<boolean> {
    const command = new StopInstancesCommand({ InstanceIds: [id] });
    await this.ec2.send(command);
    return true;
  }

  async rebootInstance(id: string): Promise<boolean> {
    const command = new RebootInstancesCommand({ InstanceIds: [id] });
    await this.ec2.send(command);
    return true;
  }

  async terminateInstance(id: string): Promise<boolean> {
    const command = new TerminateInstancesCommand({ InstanceIds: [id] });
    await this.ec2.send(command);
    return true;
  }

  private mapEC2Instance(instance: EC2Instance): ComputeInstance {
    const nameTag = instance.Tags?.find((t) => t.Key === 'Name');
    const tags: Record<string, string> = {};
    for (const tag of instance.Tags || []) {
      if (tag.Key && tag.Value) {
        tags[tag.Key] = tag.Value;
      }
    }

    return {
      id: `aws:${instance.InstanceId}`,
      provider: 'aws',
      providerId: instance.InstanceId || '',
      name: nameTag?.Value || instance.InstanceId || '',
      state: this.mapEC2State(instance.State?.Name),
      instanceType: instance.InstanceType || '',
      region: this.region || '',
      zone: instance.Placement?.AvailabilityZone,
      publicIp: instance.PublicIpAddress,
      privateIp: instance.PrivateIpAddress,
      cpu: instance.CpuOptions?.CoreCount || 0,
      memoryGb: 0, // Need instance type mapping
      tags,
      createdAt: instance.LaunchTime || new Date(),
      launchedAt: instance.LaunchTime,
    };
  }

  private mapEC2State(state?: string): InstanceState {
    switch (state) {
      case 'running':
        return 'running';
      case 'stopped':
        return 'stopped';
      case 'pending':
      case 'stopping':
      case 'shutting-down':
        return 'pending';
      case 'terminated':
        return 'terminated';
      default:
        return 'unknown';
    }
  }
}

// =============================================================================
// AWS Container Provider (ECS)
// =============================================================================

export class AWSContainerProvider extends BaseProvider implements IContainerProvider {
  private ecs: ECSClient;

  constructor(credentials: ProviderCredentials, region: string = 'us-east-1') {
    super('aws', credentials, region);
    this.ecs = new ECSClient({
      region,
      credentials: {
        accessKeyId: credentials.credentials.accessKeyId,
        secretAccessKey: credentials.credentials.secretAccessKey,
      },
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.ecs.send(new ListClustersCommand({}));
      return true;
    } catch {
      return false;
    }
  }

  async listContainers(): Promise<Container[]> {
    // ECS tasks are the equivalent of containers
    const clusters = await this.ecs.send(new ListClustersCommand({}));
    const containers: Container[] = [];

    for (const clusterArn of clusters.clusterArns || []) {
      const tasks = await this.ecs.send(
        new ListTasksCommand({ cluster: clusterArn })
      );
      if (tasks.taskArns?.length) {
        const described = await this.ecs.send(
          new DescribeTasksCommand({
            cluster: clusterArn,
            tasks: tasks.taskArns,
          })
        );
        for (const task of described.tasks || []) {
          for (const container of task.containers || []) {
            containers.push({
              id: `aws:${container.containerArn}`,
              provider: 'aws',
              providerId: container.containerArn || '',
              name: container.name || '',
              image: container.image || '',
              state: container.lastStatus === 'RUNNING' ? 'running' : 'stopped',
              status: container.lastStatus || '',
              ports: [], // ECS ports are defined in task definition
              labels: {},
              createdAt: task.createdAt || new Date(),
              startedAt: task.startedAt,
            });
          }
        }
      }
    }
    return containers;
  }

  async getContainer(id: string): Promise<Container | null> {
    // Would need to parse the ARN and query the specific task
    return null;
  }

  async startContainer(id: string): Promise<boolean> {
    // ECS doesn't have container-level start, it's at service level
    return false;
  }

  async stopContainer(id: string): Promise<boolean> {
    return false;
  }

  async restartContainer(id: string): Promise<boolean> {
    return false;
  }

  async getLogs(id: string, tail?: number): Promise<string> {
    // Would use CloudWatch Logs
    return '';
  }

  async listServices(): Promise<ContainerService[]> {
    const clusters = await this.ecs.send(new ListClustersCommand({}));
    const services: ContainerService[] = [];

    for (const clusterArn of clusters.clusterArns || []) {
      const serviceArns = await this.ecs.send(
        new ListServicesCommand({ cluster: clusterArn })
      );
      if (serviceArns.serviceArns?.length) {
        const described = await this.ecs.send(
          new DescribeServicesCommand({
            cluster: clusterArn,
            services: serviceArns.serviceArns,
          })
        );
        for (const svc of described.services || []) {
          services.push({
            id: `aws:${svc.serviceArn}`,
            provider: 'aws',
            providerId: svc.serviceArn || '',
            name: svc.serviceName || '',
            cluster: clusterArn,
            desiredCount: svc.desiredCount || 0,
            runningCount: svc.runningCount || 0,
            pendingCount: svc.pendingCount || 0,
            taskDefinition: svc.taskDefinition,
            containers: [],
            createdAt: svc.createdAt || new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }
    return services;
  }

  async getService(id: string): Promise<ContainerService | null> {
    return null;
  }

  async updateServiceCount(id: string, count: number): Promise<boolean> {
    // Parse service ARN to get cluster and service name
    const parts = id.replace('aws:', '').split('/');
    const cluster = parts[0];
    const serviceName = parts[parts.length - 1];

    await this.ecs.send(
      new UpdateServiceCommand({
        cluster,
        service: serviceName,
        desiredCount: count,
      })
    );
    return true;
  }
}

// =============================================================================
// AWS DNS Provider (Route 53)
// =============================================================================

export class AWSDnsProvider extends BaseProvider implements IDnsProvider {
  private route53: Route53Client;

  constructor(credentials: ProviderCredentials, region: string = 'us-east-1') {
    super('aws', credentials, region);
    this.route53 = new Route53Client({
      region,
      credentials: {
        accessKeyId: credentials.credentials.accessKeyId,
        secretAccessKey: credentials.credentials.secretAccessKey,
      },
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.route53.send(new ListHostedZonesCommand({}));
      return true;
    } catch {
      return false;
    }
  }

  async listZones(): Promise<DnsZone[]> {
    const response = await this.route53.send(new ListHostedZonesCommand({}));
    return (response.HostedZones || []).map((zone) => this.mapHostedZone(zone));
  }

  async getZone(id: string): Promise<DnsZone | null> {
    const zones = await this.listZones();
    return zones.find((z) => z.id === id) || null;
  }

  async listRecords(zoneId: string): Promise<DnsRecord[]> {
    const hostedZoneId = zoneId.replace('aws:', '');
    const response = await this.route53.send(
      new ListResourceRecordSetsCommand({ HostedZoneId: hostedZoneId })
    );
    return (response.ResourceRecordSets || []).map((record) =>
      this.mapRecordSet(zoneId, record)
    );
  }

  async createRecord(
    zoneId: string,
    record: Omit<DnsRecord, 'id' | 'zoneId' | 'provider' | 'providerId'>
  ): Promise<DnsRecord> {
    const hostedZoneId = zoneId.replace('aws:', '');
    await this.route53.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: hostedZoneId,
        ChangeBatch: {
          Changes: [
            {
              Action: 'CREATE',
              ResourceRecordSet: {
                Name: record.name,
                Type: record.type,
                TTL: record.ttl,
                ResourceRecords: record.values.map((v) => ({ Value: v })),
              },
            },
          ],
        },
      })
    );

    return {
      ...record,
      id: `aws:${record.name}:${record.type}`,
      zoneId,
      provider: 'aws',
      providerId: `${record.name}:${record.type}`,
    };
  }

  async updateRecord(
    zoneId: string,
    recordId: string,
    record: Partial<DnsRecord>
  ): Promise<DnsRecord> {
    // Route53 uses UPSERT for updates
    const hostedZoneId = zoneId.replace('aws:', '');
    const [name, type] = recordId.replace('aws:', '').split(':');

    await this.route53.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: hostedZoneId,
        ChangeBatch: {
          Changes: [
            {
              Action: 'UPSERT',
              ResourceRecordSet: {
                Name: name,
                Type: type as RRType,
                TTL: record.ttl,
                ResourceRecords: record.values?.map((v) => ({ Value: v })),
              },
            },
          ],
        },
      })
    );

    return {
      id: recordId,
      zoneId,
      provider: 'aws',
      providerId: `${name}:${type}`,
      name,
      type: type as DnsRecordType,
      ttl: record.ttl || 300,
      values: record.values || [],
    };
  }

  async deleteRecord(zoneId: string, recordId: string): Promise<boolean> {
    const hostedZoneId = zoneId.replace('aws:', '');
    const [name, type] = recordId.replace('aws:', '').split(':');

    // First get the current record to know its values
    const records = await this.listRecords(zoneId);
    const record = records.find((r) => r.id === recordId);
    if (!record) return false;

    await this.route53.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: hostedZoneId,
        ChangeBatch: {
          Changes: [
            {
              Action: 'DELETE',
              ResourceRecordSet: {
                Name: name,
                Type: type as RRType,
                TTL: record.ttl,
                ResourceRecords: record.values.map((v) => ({ Value: v })),
              },
            },
          ],
        },
      })
    );
    return true;
  }

  private mapHostedZone(zone: HostedZone): DnsZone {
    return {
      id: `aws:${zone.Id}`,
      provider: 'aws',
      providerId: zone.Id || '',
      name: zone.Name?.replace(/\.$/, '') || '',
      recordCount: zone.ResourceRecordSetCount || 0,
      isPrivate: zone.Config?.PrivateZone || false,
      nameServers: [], // Would need separate call
      createdAt: new Date(),
    };
  }

  private mapRecordSet(zoneId: string, record: ResourceRecordSet): DnsRecord {
    return {
      id: `aws:${record.Name}:${record.Type}`,
      zoneId,
      provider: 'aws',
      providerId: `${record.Name}:${record.Type}`,
      name: record.Name || '',
      type: record.Type as DnsRecordType,
      ttl: record.TTL || 300,
      values: (record.ResourceRecords || []).map((r) => r.Value || ''),
    };
  }
}
