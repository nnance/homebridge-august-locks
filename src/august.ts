import { Logger } from 'homebridge';
import { request, RequestOptions } from 'https';
import { TextEncoder } from 'util';

export type AugustHome = {
  id: string;
  name: string;
};

export type AugustLock = {
  id: string;
  name: string;
  macAddress: string;
  houseId: string;
  houseName: string;
};

export enum AugustLockStatus {
  LOCKED, UNLOCKED, UNKNOWN,
}

export type AugustSession = {
  idType: string;
  identifier: string;
  token: string;
};

export type AugustSessionOptions = {
  uuid: string;
  idType: string;
  identifier: string;
  password: string;
  code: string;  // 2FA code
};

type AugustResponse = {
  token: string;
  status?: number;
  payload: object;
};

export async function augustStartSession(options: AugustSessionOptions, log: Logger): Promise<AugustSession> {
  const { uuid, code, idType, password, identifier } = options;
  const session = await augustLogin(uuid, idType, identifier, password, log);
  log.debug(JSON.stringify(session));

  const {status} = await augustGetMe(session, log);

  // Session isn't valid yet, so we need to validate it by sending a code
  if (status !== 200) {
    if (code === undefined || code.length === 0) {
      await augustSendCode(session, log);
      log.info('Session is not valid yet, but no code was provided. Please provide a code.');
    } else {
      const resp = await augustValidateCode(code, session, log);
      if (resp.status !== 200) {
        await augustSendCode(session, log);
        log.error(`Invalid code: ${resp.status}, new code sent, please provide the new code.`);
      } else {
        session.token = resp.token;
      }
    }
  }

  return session;
}

function getRequestOptions(path: string, method: string): RequestOptions {
  return {
    hostname: 'api-production.august.com',
    port: 443,
    path: path,
    method: method,
    headers: {
      'x-august-api-key': '7cab4bbd-2693-4fc1-b99b-dec0fb20f9d4',
      'x-kease-api-key': '7cab4bbd-2693-4fc1-b99b-dec0fb20f9d4',
      'Content-Type': 'application/json',
      'Accept-Version': '0.0.1',
      'User-Agent': 'August/Luna-3.2.2',
    },
  };
}

function addToken(options: RequestOptions, token:string): RequestOptions {
  const newOptions = {
    ...options,
  };

  if (newOptions['headers']) {
    newOptions['headers']['x-august-access-token'] = token;
  }

  return newOptions;
}

async function makeRequest(options: RequestOptions, data: Uint8Array, log: Logger): Promise<AugustResponse> {
  return new Promise((resolve, reject) => {
    const req = request(options, res => {
      let returnValue = '';
      res.on('data', d => {
        log.debug(`statusCode: ${res.statusCode}`);

        returnValue += d;
        log.debug(d.toString('utf-8'));
      });
       
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({
            status: res.statusCode,
            token: res.headers['x-august-access-token'] as string,
            payload: JSON.parse(returnValue.toString()),
          });
        } else {
          reject(returnValue);
        }
    });

    req.on('error', error => {
      log.error(`request error: ${error}`);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function augustLogin(uuid: string, idType: string, identifier: string, password: string, log: Logger): Promise<AugustSession> {
  const data = new TextEncoder().encode(
    JSON.stringify({
      identifier: `${idType}:${identifier}`,
      password: password,
      installId: uuid,
    }),
  );

  const options = getRequestOptions('/session', 'POST');

  const res = await makeRequest(options, data, log);
  if (res.status !== 200 || res.payload['userId'] === undefined || res.payload['userId'].length === 0) {
    throw new Error(`Invalid user credentials: ${res.status}`);
  } else {
    return {
      idType: idType,
      identifier: identifier,
      token: res.token,
    };
  }
}

async function augustGetMe(session: AugustSession, log: Logger): Promise<AugustResponse> {
  const options = addToken(getRequestOptions('/users/me', 'GET'), session.token);

  return makeRequest(options, new TextEncoder().encode(''), log);
}

async function augustSendCode(session: AugustSession, log: Logger): Promise<AugustResponse> {
  const data = new TextEncoder().encode(
    JSON.stringify({
      value: session.identifier,
    }),
  );

  const options = addToken(getRequestOptions(`/validation/${session.idType}`, 'POST'), session.token);

  return makeRequest(options, data, log);
}

async function augustValidateCode(code: string, session: AugustSession, log: Logger): Promise<AugustResponse> {
  const payload = {
    code,
  };
  payload[session.idType] = session.identifier;

  const data = new TextEncoder().encode(JSON.stringify(payload));

  const options = addToken(getRequestOptions(`/validate/${session.idType}`, 'POST'), session.token);

  return makeRequest(options, data, log);
}

export async function augustGetHouses(session: AugustSession, log: Logger): Promise<AugustHome[]> {
  const options = addToken(getRequestOptions('/users/houses/mine', 'GET'), session.token);

  const results = await makeRequest(options, new Uint8Array(), log);

  if (results.status === 200 && Array.isArray(results.payload)) {
    const homes: AugustHome[] = (results.payload).map(home => ({
      id: home['HouseID'],
      name: home['HouseName'],
    }));
    return homes;
  } else {
    return [];
  }
}

export async function augustGetLocks(session: AugustSession, log: Logger): Promise<AugustLock[]> {
  const options = addToken(getRequestOptions('/users/locks/mine', 'GET'), session.token);

  const results = await makeRequest(options, new Uint8Array(), log);

  if (results.status === 200 && results.payload) {
    const locks: AugustLock[] = Object.keys(results.payload).map(id => {
      const lock: object = results.payload![id];
      return {
        id: id,
        name: lock['LockName'],
        macAddress: lock['macAddress'],
        houseId: lock['HouseID'],
        houseName: lock['HouseName'],
      };
    });
    return locks;
  } else {
    return [];
  }
}

export async function augustGetLockStatus(session: AugustSession, lockId: string, log: Logger): Promise<AugustLockStatus> {
  const options = addToken(getRequestOptions(`/remoteoperate/${lockId}/status`, 'PUT'), session.token);

  const results = await makeRequest(options, new Uint8Array(), log);

  const status = results.payload['status'];

  if (status === 'kAugLockState_Locked') {
    return AugustLockStatus.LOCKED;
  } else if (status === 'kAugLockState_Unlocked') {
    return AugustLockStatus.UNLOCKED;
  } else {
    log.info(JSON.stringify(results.payload));
    throw new Error(`Unknown lock status for lock ${lockId}`);
  }
}

export async function augustSetStatus(
  session: AugustSession,
  lockId: string,
  status: AugustLockStatus,
  log: Logger,
): Promise<AugustLockStatus> {
  const url = status === AugustLockStatus.LOCKED ? `/remoteoperate/${lockId}/lock` : `/remoteoperate/${lockId}/unlock`;
  const options = addToken(getRequestOptions(url, 'PUT'), session.token);

  const results = await makeRequest(options, new Uint8Array(), log);
  const update = results.payload['status'] === 'kAugLockState_Locked' ? AugustLockStatus.LOCKED : AugustLockStatus.UNLOCKED;
  return update;
}
