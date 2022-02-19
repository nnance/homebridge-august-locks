import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { augustGetDoorStatus, AugustLock, AugustDoorStatus} from './august';

import { AugustSmartLockPlatform } from './platform';

export class AugustSmartLockAccessory {
  private service: Service;

  constructor(
    private readonly platform: AugustSmartLockPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    const lock: AugustLock = accessory.context.device;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'August')
      .setCharacteristic(this.platform.Characteristic.Model, 'Door Sense')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, lock.id);

    this.service = this.addContactSensorService();
    this.service.setCharacteristic(this.platform.Characteristic.Name, lock.name);

    setInterval(this.updateStatus.bind(this), (this.platform.config['refreshInterval'] || 10) * 1000);
  }

  addContactSensorService(): Service {
    const service = this.accessory.getService(this.platform.Service.ContactSensor)
      || this.accessory.addService(this.platform.Service.ContactSensor);

    service.getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getOn.bind(this));

    return service;
  }

  async getOn(): Promise<CharacteristicValue> {
    // run status update in the background to avoid blocking the main thread
    setImmediate(this.updateStatus.bind(this));
    return this.service.getCharacteristic(this.platform.Characteristic.ContactSensorState).value
      || this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;
  }

  async updateStatus() {
    const id = this.accessory.context.device['id'];

    augustGetDoorStatus(this.platform.Session!, id, this.platform.log).then((status) => {

      this.platform.log.debug('Get Lock Status ->', status);

      if (status === AugustDoorStatus.UNKNOWN) {
        throw new Error('Door status unknown');
      }

      const currentState = status === AugustDoorStatus.OPEN
        ? this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
        : this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;

      this.service.updateCharacteristic(this.platform.Characteristic.ContactSensorState, currentState);
    }).catch((error) => {
      this.platform.log.error('Get Lock Status ->', error);
    });
  }
}
