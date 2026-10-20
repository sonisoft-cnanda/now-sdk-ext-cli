import {Flags} from '@oclif/core'
import {FormLayoutWriter, type FormLayoutWriteResult} from '@sonisoft/now-sdk-ext-core'
import {readFile} from 'node:fs/promises'

import {identifier, MetadataBaseCommand, type MetadataFlags, scopeFlags, scopeOptions} from '../../../common/metadata-command.js'
import {ID, MetadataDisplayService, MetadataInputError} from '../../../services/metadata-display.service.js'

/** The whole layout, in order: comma-separated, or a JSON array of strings in a file. */
export async function layoutElements(flags: MetadataFlags): Promise<string[]> {
  let elements: unknown
  if (flags['elements-file'] === undefined) {
    elements = typeof flags.elements === 'string' ? flags.elements.split(',').map(item => item.trim()) : undefined
  } else {
    try {
      elements = JSON.parse(await readFile(flags['elements-file'] as string, 'utf8'))
    } catch {
      throw new MetadataInputError('The elements file must be a readable JSON array of strings.')
    }
  }

  if (!Array.isArray(elements) || elements.length === 0 || !elements.every(item => typeof item === 'string' && /^\.?[a-z\d_]+(\.[a-z\d_]+)*$/i.test(item))) {
    throw new MetadataInputError('Supply the whole layout as field names, .begin_split, .split, .end_split or .formatter.<sys_id>.')
  }

  return elements as string[]
}

export default class MetadataLayoutSet extends MetadataBaseCommand<typeof MetadataLayoutSet> {
  static description = `Replace one form section layout through the Form Layout page and verify the order and its capture.

The platform captures a section as one Form Layout file, sys_ui_section_<section sys_id>. For a section of an installed
Store application, pass --acknowledge-upgrade-skip: upgrades of that application then skip the file.`
  static examples = [
    '<%= config.bin %> <%= command.id %> --section 0123456789abcdef0123456789abcdef --elements "name,.begin_split,type,.split,url,.end_split" --scope x_example_app --update-set 0123456789abcdef0123456789abcdef --auth dev',
    '<%= config.bin %> <%= command.id %> --section 0123456789abcdef0123456789abcdef --elements-file ./layout.json --scope-id 0123456789abcdef0123456789abcdef --update-set 0123456789abcdef0123456789abcdef --acknowledge-upgrade-skip --auth dev',
  ]
  static flags = {
    ...scopeFlags,
    elements: Flags.string({description: 'The whole new layout in order, comma-separated: field names, .begin_split, .split, .end_split, .formatter.<sys_id>.', exclusive: ['elements-file']}),
    'elements-file': Flags.string({description: 'Read the layout from a JSON array of strings.', exclusive: ['elements']}),
    section: Flags.string({description: 'sys_ui_section sys_id.', required: true}),
    'update-set': Flags.string({description: 'In progress update set of the section\'s application. It must be the working set (nex update-set use).', required: true}),
  }
protected metadataAction = 'layout set'
  protected metadataTable = 'sys_ui_section'

  public async run(): Promise<FormLayoutWriteResult> {
    const flags = this.flags as MetadataFlags
    const section = identifier(flags, 'section', ID, true)!
    const elements = await layoutElements(flags)
    const options = scopeOptions(flags)
    const result = await new FormLayoutWriter(this.instance).setFormLayout(section, {...options, elements, updateSet: options.updateSet!})
    const display = new MetadataDisplayService()
    const safe = display.layoutResult(result)
    if (!this.jsonEnabled()) for (const line of display.layoutSuccess(safe)) this.log(line)
    return safe
  }
}
