import fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import FormData from 'form-data';
import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
  beforeAll,
  afterAll,
} from '@jest/globals';

import Route from '../../src/routes.js';
import TestUtil from '../utils/testUtil';
import { logger } from '../../src/logger';

describe('#Routes Integration suite test', () => {
  let defaultDownloadsFolder = '';

  const ioObject = {
    to: () => ioObject,
    emit: (event, message) => {},
  };

  beforeEach(() => {
    jest.spyOn(logger, 'info').mockImplementation();
  });

  beforeAll(async () => {
    defaultDownloadsFolder = await fs.promises.mkdtemp(
      join(tmpdir(), 'downloads-')
    );
  });

  afterAll(async () => {
    await fs.promises.rm(defaultDownloadsFolder, { recursive: true });
  });

  test('should upload file to the folder', async () => {
    const filename = '1 - NLW %2525252305 - 1920x1080.png';

    const fileStream = fs.createReadStream(
      `./test/integration/mocks/${filename}`
    );

    const response = TestUtil.generateWritableStream(() => {});

    const form = new FormData();
    form.append('photo', fileStream);

    const defaultParams = {
      request: Object.assign(form, {
        headers: form.getHeaders(),
        method: 'POST',
        url: '?socketId=11',
      }),
      response: Object.assign(response, {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
      }),
      values: () => Object.values(defaultParams),
    };

    const route = new Route(defaultDownloadsFolder);

    route.setSocketInstance(ioObject);

    const dirBeforeRun = await fs.promises.readdir(defaultDownloadsFolder);
    expect(dirBeforeRun).toEqual([]);

    await route.handler(...defaultParams.values());
    const dirAfterRun = await fs.promises.readdir(defaultDownloadsFolder);
    expect(dirAfterRun).toEqual([filename]);

    expect(defaultParams.response.writeHead).toHaveBeenCalledWith(200);

    const expectResultEnd = JSON.stringify({
      result: 'Files uploaded with success!',
    });

    expect(defaultParams.response.end).toHaveBeenCalledWith(expectResultEnd);
  });
});
