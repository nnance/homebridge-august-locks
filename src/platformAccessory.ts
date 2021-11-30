import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { augustGetLockStatus, AugustLockStatus } from './august';

import { AugustSmartLockPlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class AugustSmartLockAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private exampleStates = {
    On: false,
    Brightness: 100,
  };

  constructor(
    private readonly platform: AugustSmartLockPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    // get the LockMechanism service if it exists, otherwise create a new LockMechanism service
    // you can create multiple services for each accessory
    const serviceType = this.platform.Service.LockMechanism;
    this.service = this.accessory.getService(serviceType) || this.accessory.addService(serviceType);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/LockMechanism

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.LockCurrentState)
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    setInterval(() => {
      if (this.platform.Session) {
        const id = this.accessory.context.device['id'];
        augustGetLockStatus(this.platform.Session, id, this.platform.log).then(status => {
          this.platform.log.debug('Get Lock Status ->', status);

          // if you need to return an error to show the device as "Not Responding" in the Home app:
          // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

          const currentState = status === AugustLockStatus.LOCKED
            ? this.platform.Characteristic.LockCurrentState.SECURED
            : this.platform.Characteristic.LockCurrentState.UNSECURED;

          this.service.updateCharacteristic(this.platform.Characteristic.LockCurrentState, currentState);
        });
      }
    }, 10000);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.exampleStates.On = value as boolean;

    this.platform.log.debug('Set Characteristic On ->', value);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(): Promise<CharacteristicValue> {
    if (this.platform.Session) {
      const id = this.accessory.context.device['id'];
      const status = await augustGetLockStatus(this.platform.Session, id, this.platform.log);

      this.platform.log.debug('Get Lock Status ->', status);

      // if you need to return an error to show the device as "Not Responding" in the Home app:
      // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

      return status === AugustLockStatus.LOCKED
        ? this.platform.Characteristic.LockCurrentState.SECURED
        : this.platform.Characteristic.LockCurrentState.UNSECURED;
    } else {
      return false;
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  async setBrightness(value: CharacteristicValue) {
    // implement your own code to set the brightness
    this.exampleStates.Brightness = value as number;

    this.platform.log.debug('Set Characteristic Brightness -> ', value);
  }

}
