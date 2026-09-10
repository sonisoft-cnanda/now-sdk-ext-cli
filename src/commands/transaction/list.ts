import {Flags} from '@oclif/core'
import {
  type ClusterTransaction,
  ClusterTransactionManager,
  type GetTransactionsOptions,
  isPolicyRefusal,
} from '@sonisoft/now-sdk-ext-core'

import {AuthenticatedCommand} from '../../common/authenticated-command.js'
import {TransactionDisplayService} from '../../services/transaction-display.service.js'

type TransactionListResult = {count: number; transactions: ClusterTransaction[]}

export default class TransactionList extends AuthenticatedCommand<typeof TransactionList> {
  static description = 'List active transactions from all responding ServiceNow cluster nodes.'
  static examples = [
    '<%= config.bin %> <%= command.id %> --auth dev',
    '<%= config.bin %> <%= command.id %> --json --auth dev',
    '<%= config.bin %> <%= command.id %> --query "user=admin" --limit 50 --auth dev',
    '<%= config.bin %> <%= command.id %> --timeout-ms 120000 --poll-interval-ms 2000 --auth dev',
  ]
  static flags = {
    limit: Flags.integer({char: 'l', description: 'Maximum transactions to return. Core default: 1000.'}),
    'poll-interval-ms': Flags.integer({description: 'Interval between collection status polls. Core default: 1000.'}),
    query: Flags.string({char: 'q', description: 'Encoded query used to filter transactions. Core default: none.'}),
    'timeout-ms': Flags.integer({description: 'Collection timeout in milliseconds. Core default: 60000.'}),
  }

  public async run(): Promise<TransactionListResult> {
    const {flags} = await this.parse(TransactionList)
    this.validateFlags(flags)

    const controller = new AbortController()
    const onSigint = () => controller.abort()
    process.once('SIGINT', onSigint)

    try {
      const options: GetTransactionsOptions = {
        signal: controller.signal,
        ...(flags['poll-interval-ms'] === undefined ? {} : {pollIntervalMs: flags['poll-interval-ms']}),
        ...(flags['timeout-ms'] === undefined ? {} : {timeoutMs: flags['timeout-ms']}),
        ...(flags.limit === undefined ? {} : {limit: flags.limit}),
        ...(flags.query === undefined ? {} : {query: flags.query}),
      }
      const transactions = await new ClusterTransactionManager(this.instance).getTransactions(options)
      this._logger.info('Active transaction collection completed.', {count: transactions.length})

      if (!this.jsonEnabled()) {
        const display = new TransactionDisplayService()
        for (const line of display.formatTransactions(transactions)) this.log(line)
      }

      return {count: transactions.length, transactions}
    } catch (error) {
      this._logger.error('Active transaction collection failed.', error as Error)
      if (isPolicyRefusal(error)) throw error
      this.error(error as Error, {suggestions: ['Check authentication and collection timeout settings, then try again.']})
    } finally {
      process.off('SIGINT', onSigint)
    }
  }

  private validateFlags(flags: {limit?: number; 'poll-interval-ms'?: number; 'timeout-ms'?: number}): void {
    if (flags['poll-interval-ms'] !== undefined && (!Number.isFinite(flags['poll-interval-ms']) || flags['poll-interval-ms'] < 0)) {
      this.error('--poll-interval-ms must be a non-negative integer.')
    }

    if (flags['timeout-ms'] !== undefined && (!Number.isFinite(flags['timeout-ms']) || flags['timeout-ms'] < 0)) {
      this.error('--timeout-ms must be a non-negative integer.')
    }

    if (flags.limit !== undefined && (!Number.isInteger(flags.limit) || flags.limit <= 0)) {
      this.error('--limit must be a positive integer.')
    }
  }
}
