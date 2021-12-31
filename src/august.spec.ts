import { describe, it } from 'mocha';
import { expect } from 'chai';
import nock = require('nock');
import { augustGetLockStatus, AugustLockStatus, AugustSessionOptions, augustStartSession } from '../src/august';

class NullLogger {
  info() {
    null;
  }

  warn() {
    null;
  }

  error() {
    null;
  }

  debug() {
    null;
  }

  log() {
    null;
  }
}

const logger = new NullLogger();

describe('august mocked tests', () => {

  it('can login with existing session', async () => {
    mockLoginRequest();
    mockGetUser();

    const res = await startSession();

    expect(res.idType).to.equal('email');
    expect(res.token).to.not.be.empty;
  });

  it('code is validated when session is invalid and code exists', async () => {
    mockLoginRequest(false);
    mockGetUser(false);
    const mock = mockCheckCode();

    const res = await startSession('1111');

    expect(res.token).to.equal('yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy');
    expect(mock.isDone()).to.be.true;
  });

  it('code is sent when session is invalid and code is invalid', async () => {
    mockLoginRequest(false);
    mockGetUser(false);
    mockCheckCode(false);
    const mock = mockSendCode();

    await startSession('1111');
    expect(mock.isDone()).to.be.true;
  });

  it('code is sent when session is invalid', async () => {
    mockLoginRequest(false);
    mockGetUser(false);
    const mock = mockSendCode();

    await startSession();
    expect(mock.isDone()).to.be.true;
  });

  it('can get lock status', async () => {
    mockLoginRequest();
    mockGetUser();
    mockGetLockStatus('yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy');

    const session = await startSession();
    const res = await augustGetLockStatus(session, 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy', logger);

    expect(res).to.equal(AugustLockStatus.LOCKED);
  });

  it('if invalid lock status returns unknown', async () => {
    mockLoginRequest();
    mockGetUser();
    mockGetLockStatus('yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy', false);

    const session = await startSession();
    const res = await augustGetLockStatus(session, 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy', logger);

    expect(res).to.equal(AugustLockStatus.UNKNOWN);
  });
});

function startSession(code = '') {
  const options: AugustSessionOptions = {
    uuid: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    idType: 'email',
    identifier: 'testuser@gmail.com',
    password: 'password',
    code: code,
  };
  return augustStartSession(options, logger);
}

function mockLoginRequest(validSession = true): nock.Scope {
  return nock('https://api-production.august.com')
    .post('/session')
    .reply(200,
      {
        'installId': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        'applicationId': '',
        'userId': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        'vInstallId': true,
        'vPassword': true,
        'expiresAt': '2022-04-17T13:20:50.634Z',
        'LastName': 'User',
        'FirstName': 'Test',
      }, {
        'content-type': 'application/json',
        'x-august-access-token': validSession ? 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' : 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy',
      },
    );
}

function mockGetUser(success = true): nock.Scope {
  return nock('https://api-production.august.com')
    .get('/users/me')
    .reply(success ? 200 : 401,
      {
        'Email':'testuser@gmail.com',
        'tokens':[],
      },
    );
}

function mockCheckCode(success = true): nock.Scope {
  return nock('https://api-production.august.com')
    .post('/validate/email')
    .reply(success ? 200 : 401,
      {
        'idType': 'email',
        'identifier': 'testuser@gmail.com',
        'token': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      }, {
        'content-type': 'application/json',
        'x-august-access-token': success ? 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy' : 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
    );
}

function mockSendCode(): nock.Scope {
  return nock('https://api-production.august.com')
    .post('/validation/email')
    .reply(200,
      {
        'code': 'CodeSent',
        'message': 'testuser@gmail.com',
      },
    );
}

function mockGetLockStatus(lockId: string, success = true): nock.Scope {
  return nock('https://api-production.august.com')
    .put(`/remoteoperate/${lockId}/status`)
    .reply(200,
      {
        'status': success ? 'kAugLockState_Locked' : 'kAugLockState_Unknown',
      },
    );
}

