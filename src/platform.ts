import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { AugustSmartLockAccessory } from './platformAccessory';
import { AugustSessionOptions, augustStartSession, augustGetLocks, AugustSession, AugustLock } from './august';

export class AugustSmartLockPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public Session: AugustSession | undefined;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  async discoverDevices() {

    const options: AugustSessionOptions = {
      uuid: this.config['installId'],
      idType: this.config['phone'] ? 'phone' : 'email',
      identifier: this.config['phone'] ? this.config['phone'] : this.config['email'],
      password: this.config['password'],
      code: this.config['code'],
    };

    augustStartSession(options, this.log).then(session => {
      this.Session = session;

      augustGetLocks(session, this.log).then(locks => {
        this.log.info(JSON.stringify(locks));

        // filter out locks that are not in the config
        const filteredLocks = this.config['filter']
          ? locks.filter(lock => !lock.id.toLowerCase().includes(this.config['filter'].toLowerCase()))
          : locks;

        this.registerLocks(filteredLocks);
      }).catch(() => {
        this.log.error('Failed to get locks');
      });
    }).catch(() => {
      this.log.error('Failed to start session, check your config and confirm your password');
    });
  }

  registerLocks(locks: AugustLock[]) {
    const usedAccessories = new Set<string>();
    for (const lock of locks) {
      const uuid = this.api.hap.uuid.generate(`${lock.id}-doorSense`);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        new AugustSmartLockAccessory(this, existingAccessory);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', lock.name);
        const accessory = new this.api.platformAccessory(lock.name, uuid);
        accessory.context.device = lock;
        new AugustSmartLockAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }

      usedAccessories.add(uuid);
    }

    const unusedAccessories = this.accessories.filter(accessory => !usedAccessories.has(accessory.UUID));
    unusedAccessories.forEach(accessory => this.log.info(`Pruning unused accessory ${accessory.UUID} from cache`));
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, unusedAccessories);
  }

}
