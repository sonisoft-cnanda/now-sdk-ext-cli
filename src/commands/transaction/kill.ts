import {Flags} from '@oclif/core'
import {ClusterTransactionManager, isPolicyRefusal, type KillTransactionResult} from '@sonisoft/now-sdk-ext-core'

import {AuthenticatedCommand} from '../../common/authenticated-command.js'

export default class TransactionKill extends AuthenticatedCommand<typeof TransactionKill> {
  static description =
    'Submit a request to terminate one active transaction. Platform acceptance does not mean immediate removal.\n\n' +
    'Only pass an identifier you deliberately selected from `nex transaction list`. ' +
    "Killing another user's transaction aborts their work."
  static examples = [
    '<%= config.bin %> <%= command.id %> --transaction-id 8f9a1234567890abcdef1234567890c1 --confirm --auth dev',
    '<%= config.bin %> <%= command.id %> --transaction-id 8f9a1234567890abcdef1234567890c1 --confirm --json --auth dev',
  ]
  static flags = {
    confirm: Flags.boolean({description: 'Confirm submission of the kill request.'}),
    'transaction-id': Flags.string({
      char: 't',
      description: 'Exact 32-character hexadecimal sys_id from `nex transaction list`.',
      required: true,
    }),
  }

  public async run(): Promise<KillTransactionResult> {
    const {flags} = await this.parse(TransactionKill)
    const transactionId = flags['transaction-id'].trim()

    if (!/^[0-9a-f]{32}$/i.test(transactionId)) {
      this.error('--transaction-id must be exactly 32 hexadecimal characters.')
    }

    if (!flags.confirm) {
      this.error('Refusing to submit a transaction kill request without --confirm.', {
        suggestions: ['Deliberately select an identifier, then rerun this command with --confirm.'],
      })
    }

    try {
      const result = await new ClusterTransactionManager(this.instance).killTransaction(transactionId)
      this._logger.info('Transaction kill request accepted.', {sysId: result.sysId})

      if (!this.jsonEnabled()) {
        this.log(`Kill request accepted by the platform for transaction ${result.sysId}.`)
        this.log('The transaction may take a moment to clear. Run `nex transaction list` again to confirm.')
      }

      return result
    } catch (error) {
      this._logger.error('Transaction kill request failed.', error as Error)
      if (isPolicyRefusal(error)) throw error
      this.error(error as Error, {suggestions: ['Verify the selected transaction identifier and instance permissions.']})
    }
  }
}
