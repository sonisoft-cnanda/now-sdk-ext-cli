/* eslint-disable perfectionist/sort-objects */

import { Flags } from '@oclif/core'
import { ActionDefinitionResult, FlowArtifactDefinitionResult, FlowDefinitionOptions, FlowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { FlowDisplayService } from '../../services/flow-display.service.js'

/** The artifact types this command can retrieve, one core method each. */
type DefinitionArtifact = 'action' | 'flow' | 'subflow'

/**
 * What was asked for, paired with what came back. Keeping the two together lets
 * the caller pick a formatter without casting, and keeps the "what ServiceNow
 * reported" question where it belongs — inside the result.
 */
type DefinitionOutcome =
  | { artifact: 'action'; result: ActionDefinitionResult }
  | { artifact: 'flow' | 'subflow'; result: FlowArtifactDefinitionResult }

/**
 * Remediation per machine-readable failure reason. Core classifies the failure;
 * the CLI is the only layer that knows which flag would have avoided it.
 */
const REMEDIATION: Record<string, string[]> = {
  api_error: [
    'ServiceNow answered with an error. Re-run with --log-level debug to see the request detail.',
    'If the artifact lives in a scoped application, pass --scope with its scope sys_id or name.',
  ],
  invalid_identifier: [
    'Pass the 32-character sys_id of the artifact, not its name.',
    'The sys_id is in the sys_id= parameter of the Workflow Studio URL, or in the record list.',
  ],
  malformed_response: [
    'The instance returned a body this version does not recognise.',
    'Check that Flow Designer is active on the instance and that the family version is supported.',
  ],
  not_found: [
    'Confirm the sys_id exists on this instance — and that --auth points at the instance you meant.',
    'A deleted or not-yet-deployed artifact reports the same way as a wrong sys_id.',
  ],
  permission_denied: [
    'The authenticated user needs read access to Flow Designer design-time records.',
    'Retry with an account holding the flow_designer (or admin) role.',
  ],
  request_failed: [
    'The request did not complete. Check connectivity and the instance URL for this alias.',
    'Run "nex auth doctor" to confirm the credential resolves.',
  ],
  type_mismatch: [
    'The sys_id exists but is a different artifact type than the one requested.',
    'Retry with the matching --type: flow, subflow, or action.',
  ],
}

export class FlowDefinition extends AuthenticatedCommand<typeof FlowDefinition> {

  static args = {}
  static description = 'Retrieve the read-only design-time definition of a flow, subflow, or action.\n\n' +
    'Returns what the artifact IS, not what a run of it did: triggers, actions, ' +
    'nested subflows, flow logic, inputs and outputs as Workflow Studio stores ' +
    'them. Nothing is executed, published or modified, and no flow context is ' +
    'created or required.\n\n' +
    'This is the design-time counterpart to `flow details`, which describes one ' +
    'past execution and needs a context sys_id.\n\n' +
    'The type is never inferred from the sys_id: --type selects the artifact ' +
    'that is asked for, and a sys_id of a different type fails with a ' +
    'type_mismatch rather than being relabelled.\n\n' +
    'With --json, stdout carries exactly one JSON document — the complete typed ' +
    'result including the untouched ServiceNow payload — so it can be piped or ' +
    'redirected. Without it, a short summary is printed; definition bodies, ' +
    'step scripts and input values are never printed or logged.'
  static examples = [
    {
      description: 'Summarise a flow definition',
      command: '<%= config.bin %> <%= command.id %> --sys-id 887dda5583237210fdb8f7b6feaad32c --auth dev',
    },
    {
      description: 'Retrieve a subflow definition',
      command: '<%= config.bin %> <%= command.id %> -i 887dda5583237210fdb8f7b6feaad32c --type subflow --auth dev',
    },
    {
      description: 'Retrieve a custom action definition with its ordered steps',
      command: '<%= config.bin %> <%= command.id %> -i 887dda5583237210fdb8f7b6feaad32c --type action --auth dev',
    },
    {
      description: 'Redirect the full JSON definition to a file',
      command: '<%= config.bin %> <%= command.id %> -i 887dda5583237210fdb8f7b6feaad32c --json --auth dev > flow.json',
    },
    {
      description: 'Pipe the JSON definition into another tool',
      command: '<%= config.bin %> <%= command.id %> -i 887dda5583237210fdb8f7b6feaad32c --type action --json --auth dev | jq .summary.steps',
    },
  ]
  static flags = {
    'sys-id': Flags.string({
      char: 'i',
      description: 'sys_id of the flow, subflow, or action to retrieve',
      required: true,
    }),
    'type': Flags.option({
      char: 't',
      description: 'Artifact type to retrieve. Must match what the sys_id actually is.',
      required: false,
      default: 'flow' as const,
      options: ['flow', 'subflow', 'action'] as const,
    })(),
    'scope': Flags.string({
      description: 'Scope sys_id or name for the transaction scope parameter. ' +
        "Optional — ServiceNow resolves the artifact's own scope when omitted.",
      required: false,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output the complete typed result as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(FlowDefinition);
    const displayService = new FlowDisplayService();

    const artifact = flags.type as DefinitionArtifact;
    const sysId = flags['sys-id'];

    // Progress goes through this.log, which oclif suppresses under --json — that
    // is what keeps stdout to a single JSON document for piping.
    this.log(`Retrieving ${artifact} definition: ${sysId}`);

    const outcome = await this._retrieve(artifact, sysId, flags.scope);

    if (!outcome.result.success) {
      this._failDefinition(artifact, sysId, outcome.result);
    }

    const lines = outcome.artifact === 'action'
      ? displayService.formatActionDefinitionResult(outcome.result, flags.json)
      : displayService.formatArtifactDefinitionResult(outcome.result, flags.json);

    for (const line of lines) {
      flags.json ? console.log(line) : this.log(line);
    }
  }

  /**
   * Fail with the reason core classified, plus the remediation that goes with it.
   *
   * Only the failure classification and the message core produced are logged —
   * never the response body.
   */
  private _failDefinition(
    artifact: DefinitionArtifact,
    sysId: string,
    result: ActionDefinitionResult | FlowArtifactDefinitionResult,
  ): never {
    const reason = result.failureReason ?? 'request_failed';
    const detail = result.errorMessage ?? `ServiceNow did not return a ${artifact} definition.`;

    this._logger.error('Design-time definition retrieval failed.', { artifact, failureReason: reason, sysId });

    this.error(`Could not retrieve the ${artifact} definition for ${sysId} [${reason}]: ${detail}`, {
      suggestions: REMEDIATION[reason] ?? REMEDIATION.request_failed,
    });
  }

  /**
   * Call the one core method that matches the requested type.
   *
   * Each type maps to exactly one design-time read. Nothing here executes,
   * tests, publishes or creates a context.
   */
  private async _retrieve(
    artifact: DefinitionArtifact,
    sysId: string,
    scope?: string,
  ): Promise<DefinitionOutcome> {
    // No scope in the constructor: the design-time routes take the transaction
    // scope as a request option, not through a background script.
    const flowManager = new FlowManager(this.instance);
    const options: FlowDefinitionOptions | undefined = scope ? { scope } : undefined;

    try {
      switch (artifact) {
        case 'action': {
          return { artifact, result: await flowManager.getActionDefinition(sysId, options) };
        }

        case 'subflow': {
          return { artifact, result: await flowManager.getSubflowDefinition(sysId, options) };
        }

        default: {
          return { artifact, result: await flowManager.getFlowDesignDefinition(sysId, options) };
        }
      }
    } catch (error) {
      this._logger.error('Error retrieving flow design-time definition.', error as Error);
      return this.error(error as Error);
    }
  }
}
