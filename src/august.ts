import { Logger } from 'homebridge';
import { request } from 'https';
import { TextEncoder } from 'util';

export type AugustHome = {
  id: string;
  name: string;
};

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

export async function augustStartSession(options: AugustSessionOptions, log: Logger): Promise<AugustSession> {
  const { uuid, code } = options;
  const session = await augustLogin(uuid, 'phone', '+14058319107', 'S00n3rs!', log);
  log.info(JSON.stringify(session));

  if (code === undefined || code.length === 0) {
    augustValidateSession(session, log);
  } else {
    await augustValidateCode(code, session, log);
  }

  return session;
}

function getRequestOptions(path: string, method: string): object {
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

function addToken(options: object, token:string): object {
  const newOptions = {
    ...options,
  };
  newOptions['headers']['x-august-access-token'] = token;
  return newOptions;
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

  return new Promise((resolve, reject) => {
    const req = request(options, res => {
      log.info(`statusCode: ${res.statusCode}`);

      res.on('data', d => {
        process.stdout.write(d);
        const token = res.headers['x-august-access-token'] as string;
        log.debug(token);
        resolve({
          idType: idType,
          identifier: identifier,
          token: token,
        });
      });
    });

    req.on('error', error => {
      log.error(`login error: ${error}`);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function augustValidateSession(session: AugustSession, log: Logger) {
  const data = new TextEncoder().encode(
    JSON.stringify({
      value: session.identifier,
    }),
  );

  const options = addToken(getRequestOptions(`/validation/${session.idType}`, 'POST'), session.token);

  return new Promise((resolve, reject) => {
    const req = request(options, res => {
      log.info(`statusCode: ${res.statusCode}`);

      res.on('data', d => {
        process.stdout.write(d);
        resolve(null);
      });
    });

    req.on('error', error => {
      log.error(`login error: ${error}`);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function augustValidateCode(code: string, session: AugustSession, log: Logger) {
  const payload = {
    code,
  };
  payload[session.idType] = session.identifier;

  const data = new TextEncoder().encode(JSON.stringify(payload));

  const options = addToken(getRequestOptions(`/validate/${session.idType}`, 'POST'), session.token);

  new Promise((resolve, reject) => {
    const req = request(options, res => {
      log.info(`statusCode: ${res.statusCode}`);

      res.on('data', d => {
        process.stdout.write(d);
        resolve(null);
      });
    });

    req.on('error', error => {
      log.error(`login error: ${error}`);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

export async function augustGetHouses(session: AugustSession, log: Logger): Promise<AugustHome[]> {
  const options = addToken(getRequestOptions('/users/houses/mine', 'GET'), session.token);

  return new Promise((resolve, reject) => {
    const req = request(options, res => {
      log.info(`statusCode: ${res.statusCode}`);

      res.on('data', d => {
        process.stdout.write(d);

        const results = JSON.parse(d.toString());
        if (Array.isArray(results)) {
          const homes: AugustHome[] = (results as [object]).map(home => ({
            id: home['HouseID'],
            name: home['HouseName'],
          }));
          resolve(homes);
        } else {
          resolve([]);
        }
      });
    });

    req.on('error', error => {
      log.error(`login error: ${error}`);
      reject(error);
    });

    req.end();
  });
}
