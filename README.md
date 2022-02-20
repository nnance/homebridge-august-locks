<p align="center">
<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

# Homebridge August DoorSense Plugin

This is a homebridge plugin that solely supports August DoorSense door sensors. It could be used in combination with native HomeKit locks or other August Smart Locks plugins.

This plugin is based on [homebridge-august-locks](https://github.com/nnance/homebridge-august-locks).

## Installation

Please install the plugin with the following command:

```
npm install -g homebridge-august-door-sense
```

or use the Homebridge Web Interface to setup the Plugin by searching for 'august'

## Configuration

```json
{
    "platforms": [
        {
            "platform": "AugustDoorSense",
            "email": "<YOUR-EMAIL-ADDRESS>",
            "phone": "<YOUR-PHONE-NUMBER>",
            "password": "<YOUR-PASSWORD>",
            "code": "<2FA-CODE>",
            "installId": "<RANDOM-STATIC-STRING>",
            "filter": "<lockId>[,<lockId>,...]",
            "securityToken": "<AUGUSTS-API-KEY>",
        }
    ]
}
```
### Required Fields:

**email**: The email address of your August account.

**phone**: The phone number associated with your August account (e.g +123456789). Specify phone or email, not both. 

**password**: The password of your August account.

**code**: The 6 digit 2 factor authentication code August emails you when the plugin authenticates with August's API. When first setting this up you should configure all other required fields, restart homebridge, wait for the email from August, enter the 6 digit code into this configuration and then restart homebridge one last time. Subsequent restarts should remember your authenticated, however you may still receive an email when the homebridge restarts or the plugin encounters an error, you can safely ignore the subsequent emails from August.

**installId**: A random string used to identify this homebridge instance as an authorized application to your August Account. It needs to be random and unique and you should never change it or you will have to reauthenticate with the 2FA Code.  This is used to prevent unauthorized access to your August account.  You can generate a random string at https://www.guidgenerator.com.

### Optional Fields:

**filter**: Comma separated string of all the Lock ID's you don't want to show in Homekit. These are shown in the log of homebridge after the home and name of the lock is printed out on the prior long entry. you can use this to hide august locks in your august account you don't want to be part of the homebridge setup for example: (multiple homes).

**securityToken**: Augusts API Key, currently pulled from a decompiled apk of the August Android App, August may change this api key as they so wish to. Use this property to update it if you follow a procedure to obtain the current api key for Augusts API Server.

**refreshInterval**: duration in seconds that the plugin will poll the API for status changes to keep the lock current when there isn't any major state changes
