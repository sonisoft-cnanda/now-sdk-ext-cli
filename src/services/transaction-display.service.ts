import type {ClusterTransaction} from '@sonisoft/now-sdk-ext-core'

const columns = [
  {header: 'SYS_ID', key: 'sys_id', width: 32},
  {header: 'NODE', key: 'node_id', width: 20},
  {header: 'USER', key: 'user', width: 16},
  {header: 'AGE', key: 'age', width: 10},
  {header: 'STATE', key: 'state', width: 12},
  {header: 'TYPE', key: 'type', width: 14},
  {header: 'THREAD', key: 'thread', width: 24},
] as const

function clean(value: unknown): string {
  return String(value ?? '').replaceAll(/\s+/g, ' ').trim()
}

function fit(value: unknown, width: number, truncate = true): string {
  const text = clean(value)
  const fitted = truncate && text.length > width ? `${text.slice(0, width - 1)}…` : text
  return fitted.padEnd(width)
}

export class TransactionDisplayService {
  formatTransactions(transactions: ClusterTransaction[]): string[] {
    if (transactions.length === 0) return ['No active transactions found.']

    const lines = [
      `${transactions.length} active transaction${transactions.length === 1 ? '' : 's'} found.`,
      `${columns.map(({header, width}) => fit(header, width, false)).join('  ')}  URL`,
    ]

    for (const transaction of transactions) {
      const cells = columns.map(({key, width}) => fit(transaction[key], width, key !== 'sys_id'))
      lines.push(`${cells.join('  ')}  ${clean(transaction.url)}`)
    }

    return lines
  }
}
