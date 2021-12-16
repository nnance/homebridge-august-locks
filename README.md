
<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>


# Homebridge August Locks Plugin

This is a Homebridge Plugin to control August Locks.  This plugin requires internet enabled locks which includes the WIFI locks or locks that use the WIFI bridge.    This is an updated plugin based on the latest Homebridge template and the latest version of the August lock API that has been tested with August (4th Generation) locks but should work with all other locks.

This plugin is loosely based on [homebridge-august-smart-locks](https://github.com/techyowl/homebridge-august-smart-locks) though completely rewritten with no external dependencies.   

Key features of this plugin includes:

1. Based on the latest Homebridge TypeScript template (v2.0.0)
2. Supports all August locks (4th Generation)
3. Uses the latest August API (v1.0.0)

## Installation

Please install the plugin with the following command:

```
npm install -g homebridge-august-locks
```

or use the Homebridge Web Interface to setup the Plugin by searching for 'august'

## Configuration

```json
{
    "platforms": [
        {
            "platform": "AugustLocks",
            "email": "<YOUR-EMAIL-ADDRESS>",
            "phone": "<YOUR-PHONE-NUMBER>",
            "password": "<YOUR-PASSWORD>",
            "code": "<2FA-CODE>",
            "installId": "<RANDOM-STATIC-STRING>",
            "filter": "<lockId>,<lockId>",
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

## Usage

* When you change the HomeKit switch to locked, the smart lock with lock the door.
* When you change the HomeKit switch from locked to unlocked the smart lock will unlock the app.
* When you use Siri to unlock the door, it will unlock the door and inform you of the status.
* When you use Siri to lock the door, it will lock the door and inform you of the status.

