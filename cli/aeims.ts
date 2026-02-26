#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';

const program = new Command();

program
  .name('aeims')
  .description('AEIMS CLI - Manage your cloud infrastructure from the command line')
  .version('1.0.0');

// Credentials command
const credentials = program
  .command('credentials')
  .alias('creds')
  .description('Manage cloud provider credentials');

credentials
  .command('list')
  .description('List all configured credentials')
  .action(async () => {
    try {
      const apiUrl = process.env.AEIMS_API_URL || 'http://localhost:3000';
      const token = process.env.AEIMS_API_TOKEN;

      if (!token) {
        console.error(chalk.red('Error: AEIMS_API_TOKEN environment variable not set'));
        console.log(chalk.yellow('Please set your API token first:'));
        console.log(chalk.cyan('export AEIMS_API_TOKEN=your-token-here'));
        process.exit(1);
      }

      const response = await fetch(`${apiUrl}/api/credentials`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': `session_token=${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.credentials.length === 0) {
        console.log(chalk.yellow('No credentials configured'));
        return;
      }

      console.log(chalk.bold('\nConfigured Credentials:\n'));

      data.credentials.forEach((cred: any) => {
        const statusIcon = cred.isValid ? chalk.green('✓') : chalk.red('✗');
        console.log(`${statusIcon} ${chalk.bold(cred.name)} (${chalk.cyan(cred.provider)})`);
        if (cred.description) {
          console.log(`  ${chalk.gray(cred.description)}`);
        }
        if (cred.region) {
          console.log(`  Region: ${cred.region}`);
        }
        if (cred.lastValidated) {
          console.log(`  Last validated: ${new Date(cred.lastValidated).toLocaleString()}`);
        }
        console.log('');
      });
    } catch (error) {
      console.error(chalk.red('Error fetching credentials:'), error);
      process.exit(1);
    }
  });

credentials
  .command('add')
  .description('Add a new cloud credential')
  .action(async () => {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Select cloud provider:',
          choices: ['AWS', 'OCI', 'GCP', 'AZURE', 'CLOUDFLARE', 'KUBERNETES'],
        },
        {
          type: 'input',
          name: 'name',
          message: 'Credential name:',
          validate: (input) => input.length > 0 || 'Name is required',
        },
        {
          type: 'input',
          name: 'description',
          message: 'Description (optional):',
        },
        {
          type: 'input',
          name: 'region',
          message: 'Default region (optional):',
        },
      ]);

      // Provider-specific credential prompts
      let credentials: any = {};

      switch (answers.provider) {
        case 'AWS':
          const awsCreds = await inquirer.prompt([
            {
              type: 'input',
              name: 'accessKeyId',
              message: 'AWS Access Key ID:',
              validate: (input) => input.length > 0 || 'Access Key ID is required',
            },
            {
              type: 'password',
              name: 'secretAccessKey',
              message: 'AWS Secret Access Key:',
              validate: (input) => input.length > 0 || 'Secret Access Key is required',
            },
          ]);
          credentials = awsCreds;
          break;

        case 'OCI':
          const ociCreds = await inquirer.prompt([
            {
              type: 'input',
              name: 'tenancy',
              message: 'OCI Tenancy OCID:',
              validate: (input) => input.length > 0 || 'Tenancy is required',
            },
            {
              type: 'input',
              name: 'user',
              message: 'OCI User OCID:',
              validate: (input) => input.length > 0 || 'User is required',
            },
            {
              type: 'input',
              name: 'fingerprint',
              message: 'API Key Fingerprint:',
              validate: (input) => input.length > 0 || 'Fingerprint is required',
            },
            {
              type: 'editor',
              name: 'privateKey',
              message: 'Private Key (PEM format):',
            },
          ]);
          credentials = ociCreds;
          break;

        case 'CLOUDFLARE':
          const cfCreds = await inquirer.prompt([
            {
              type: 'password',
              name: 'apiToken',
              message: 'Cloudflare API Token:',
              validate: (input) => input.length > 0 || 'API Token is required',
            },
          ]);
          credentials = cfCreds;
          break;

        default:
          console.log(chalk.yellow('Provider-specific credential input not implemented yet'));
          return;
      }

      // Submit to API
      const apiUrl = process.env.AEIMS_API_URL || 'http://localhost:3000';
      const token = process.env.AEIMS_API_TOKEN;

      if (!token) {
        console.error(chalk.red('Error: AEIMS_API_TOKEN environment variable not set'));
        process.exit(1);
      }

      const response = await fetch(`${apiUrl}/api/credentials`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': `session_token=${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: answers.provider,
          name: answers.name,
          description: answers.description || undefined,
          region: answers.region || undefined,
          credentials,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log(chalk.green('\n✓ Credential added successfully!'));
      console.log(chalk.gray(`ID: ${data.credential.id}`));
    } catch (error) {
      console.error(chalk.red('Error adding credential:'), error);
      process.exit(1);
    }
  });

credentials
  .command('scan <id>')
  .description('Scan a credential for resources')
  .action(async (id: string) => {
    try {
      const apiUrl = process.env.AEIMS_API_URL || 'http://localhost:3000';
      const token = process.env.AEIMS_API_TOKEN;

      if (!token) {
        console.error(chalk.red('Error: AEIMS_API_TOKEN environment variable not set'));
        process.exit(1);
      }

      console.log(chalk.cyan('Scanning credential...'));

      const response = await fetch(`${apiUrl}/api/credentials/${id}/scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': `session_token=${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log(chalk.green('\n✓ Scan completed successfully!'));
      console.log(chalk.bold(`Resources discovered: ${data.resourcesStored}`));

      if (data.results.compute.length > 0) {
        console.log(chalk.cyan(`\n  Compute instances: ${data.results.compute.length}`));
      }
      if (data.results.containers.length > 0) {
        console.log(chalk.cyan(`  Containers: ${data.results.containers.length}`));
      }
      if (data.results.dns.length > 0) {
        console.log(chalk.cyan(`  DNS zones: ${data.results.dns.length}`));
      }

      if (data.results.errors.length > 0) {
        console.log(chalk.yellow(`\n  Errors encountered: ${data.results.errors.length}`));
        data.results.errors.forEach((err: any) => {
          console.log(chalk.red(`    ${err.service}: ${err.error}`));
        });
      }
    } catch (error) {
      console.error(chalk.red('Error scanning credential:'), error);
      process.exit(1);
    }
  });

// Resources command
const resources = program
  .command('resources')
  .alias('res')
  .description('Manage cloud resources');

resources
  .command('list')
  .description('List all resources')
  .option('-p, --provider <provider>', 'Filter by provider')
  .option('-t, --type <type>', 'Filter by resource type')
  .action(async (options) => {
    try {
      const apiUrl = process.env.AEIMS_API_URL || 'http://localhost:3000';
      const token = process.env.AEIMS_API_TOKEN;

      if (!token) {
        console.error(chalk.red('Error: AEIMS_API_TOKEN environment variable not set'));
        process.exit(1);
      }

      const params = new URLSearchParams();
      if (options.provider) params.append('provider', options.provider);
      if (options.type) params.append('type', options.type);

      const response = await fetch(`${apiUrl}/api/resources?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': `session_token=${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.resources.length === 0) {
        console.log(chalk.yellow('No resources found'));
        return;
      }

      console.log(chalk.bold(`\nResources (${data.count}):\n`));

      data.resources.forEach((resource: any) => {
        console.log(
          `${chalk.cyan(resource.provider)} ${chalk.bold(resource.name)} (${resource.type})`
        );
        if (resource.status) {
          console.log(`  Status: ${resource.status}`);
        }
        if (resource.region) {
          console.log(`  Region: ${resource.region}`);
        }
        console.log(chalk.gray(`  ID: ${resource.providerId}`));
        console.log('');
      });
    } catch (error) {
      console.error(chalk.red('Error fetching resources:'), error);
      process.exit(1);
    }
  });

// Agents command
program
  .command('agents')
  .description('List AEIMS agents')
  .action(async () => {
    try {
      const apiUrl = process.env.AEIMS_API_URL || 'http://localhost:3000';
      const token = process.env.AEIMS_API_TOKEN;

      if (!token) {
        console.error(chalk.red('Error: AEIMS_API_TOKEN environment variable not set'));
        process.exit(1);
      }

      const response = await fetch(`${apiUrl}/api/agents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': `session_token=${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.agents.length === 0) {
        console.log(chalk.yellow('No agents registered'));
        return;
      }

      console.log(chalk.bold('\nAEIMS Agents:\n'));

      data.agents.forEach((agent: any) => {
        const statusIcon =
          agent.status === 'ONLINE'
            ? chalk.green('●')
            : agent.status === 'OFFLINE'
            ? chalk.gray('●')
            : chalk.yellow('●');

        console.log(`${statusIcon} ${chalk.bold(agent.name)} (${agent.status})`);
        if (agent.hostname) {
          console.log(`  Hostname: ${agent.hostname}`);
        }
        if (agent.arch && agent.os) {
          console.log(`  Platform: ${agent.arch} / ${agent.os}`);
        }
        if (agent.lastSeenAt) {
          console.log(`  Last seen: ${new Date(agent.lastSeenAt).toLocaleString()}`);
        }
        console.log('');
      });
    } catch (error) {
      console.error(chalk.red('Error fetching agents:'), error);
      process.exit(1);
    }
  });

program.parse();
