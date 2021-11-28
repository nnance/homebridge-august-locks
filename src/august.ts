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

export async function augustLogin(uuid: string, idType: string, identifier: string, password: string, log: Logger): Promise<AugustSession> {
  const data = new TextEncoder().encode(
    JSON.stringify({
      identifier: `${idType}:${identifier}`,
      password: password,
      installId: uuid,
    }),
  );

  const options = {
    hostname: 'api-production.august.com',
    port: 443,
    path: '/session',
    method: 'POST',
    headers: {
      'x-august-api-key': '7cab4bbd-2693-4fc1-b99b-dec0fb20f9d4',
      'x-kease-api-key': '7cab4bbd-2693-4fc1-b99b-dec0fb20f9d4',
      'Content-Type': 'application/json',
      'Accept-Version': '0.0.1',
      'User-Agent': 'August/Luna-3.2.2',
    },
  };

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

export async function augustValidateSession(session: AugustSession, log: Logger) {
  const data = new TextEncoder().encode(
    JSON.stringify({
      value: session.identifier,
    }),
  );

  const options = {
    hostname: 'api-production.august.com',
    port: 443,
    path: `/validation/${session.idType}`,
    method: 'POST',
    headers: {
      'x-august-api-key': '7cab4bbd-2693-4fc1-b99b-dec0fb20f9d4',
      'x-kease-api-key': '7cab4bbd-2693-4fc1-b99b-dec0fb20f9d4',
      'Content-Type': 'application/json',
      'Accept-Version': '0.0.1',
      'User-Agent': 'August/Luna-3.2.2',
      'x-august-access-token': session.token,
    },
  };

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

export async function augustValidateCode(code: AugustSession, session: AugustSession, log: Logger) {
  const payload = {
    code,
  };
  payload[session.idType] = session.identifier;

  const data = new TextEncoder().encode(JSON.stringify(payload));

  const options = {
    hostname: 'api-production.august.com',
    port: 443,
    path: `/validate/${session.idType}`,
    method: 'POST',
    headers: {
      'x-august-api-key': '7cab4bbd-2693-4fc1-b99b-dec0fb20f9d4',
      'x-kease-api-key': '7cab4bbd-2693-4fc1-b99b-dec0fb20f9d4',
      'Content-Type': 'application/json',
      'Accept-Version': '0.0.1',
      'User-Agent': 'August/Luna-3.2.2',
      'x-august-access-token': session.token,
    },
  };

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

export async function augustGetHouses(session: AugustSession, log: Logger): Promise<AugustHome[]> {
  const options = {
    hostname: 'api-production.august.com',
    port: 443,
    path: '/users/houses/mine',
    method: 'GET',
    headers: {
      'x-august-api-key': '7cab4bbd-2693-4fc1-b99b-dec0fb20f9d4',
      'x-kease-api-key': '7cab4bbd-2693-4fc1-b99b-dec0fb20f9d4',
      'Content-Type': 'application/json',
      'Accept-Version': '0.0.1',
      'User-Agent': 'August/Luna-3.2.2',
      'Content-Length': 0,
      'x-august-access-token': session.token,
    },
  };

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
