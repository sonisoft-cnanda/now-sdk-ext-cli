import {type ElevationStatus, RoleElevation} from '@sonisoft/now-sdk-ext-core'

import {AuthenticatedCommand} from '../../common/authenticated-command.js'
import {AclDisplayService} from '../../services/acl-display.service.js'

export default class Elevation extends AuthenticatedCommand<typeof Elevation> {
  static description = `Show the elevated privilege roles (e.g. security_admin) this user may elevate to, and which this run's session has.

Elevation lasts only for the server session that asked for it, and every nex run logs in afresh, so a run starts unelevated. Pass --elevate <role> to any command to elevate its sessions for that run; with it, this command proves the elevation took. The nex acl commands that change ACLs elevate to security_admin on their own.`
  static enableJsonFlag = true
  static examples = [
    {command: '<%= config.bin %> <%= command.id %> --auth dev', description: 'What this user may elevate to'},
    {command: '<%= config.bin %> <%= command.id %> --elevate security_admin --auth dev', description: 'Elevate and show that it holds'},
  ]

  public async run(): Promise<ElevationStatus> {
    const status = await new RoleElevation(this.instance).status()
    if (!this.jsonEnabled()) for (const line of new AclDisplayService().elevationLines(status)) this.log(line)
    return status
  }
}
