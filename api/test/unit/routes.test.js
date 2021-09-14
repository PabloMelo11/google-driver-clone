import { describe, test, expect, jest, beforeEach } from '@jest/globals';

import Routes from '../../src/routes.js';
import UploadHandler from '../../src/uploadHandler.js';
import TestUtil from '../utils/testUtil.js';
import { logger } from '../../src/logger.js';

describe('#Routes test suite', () => {
  const request = TestUtil.generateReadableStream(['some file bytes']);
  const response = TestUtil.generateWritableStream(() => {});

  const defaultParams = {
    request: Object.assign(request, {
      headers: { 'Content-Type': 'multipart/form-data' },
      method: '',
      body: {},
      url: '',
    }),
    response: Object.assign(response, {
      setHeader: jest.fn(),
      writeHead: jest.fn(),
      end: jest.fn(),
    }),
    values: () => Object.values(defaultParams),
  };

  beforeEach(() => {
    jest.spyOn(logger, 'info').mockImplementation();
  });

  describe('#setSocketInstance', () => {
    test('setSocket should store io instance', () => {
      const routes = new Routes();

      const ioObject = {
        to: (id) => ioObject,
        emit: (event, message) => {},
      };

      routes.setSocketInstance(ioObject);
      expect(routes.io).toStrictEqual(ioObject);
    });
  });

  describe('#handler', () => {
    test('given an inexistent route it should choose default route', async () => {
      const routes = new Routes();
      const params = { ...defaultParams };

      params.request.method = 'inexistent';
      await routes.handler(...params.values());

      expect(params.response.end).toHaveBeenCalledWith('Hello World');
    });

    test('it should set any request with CORS enabled', async () => {
      const routes = new Routes();
      const params = { ...defaultParams };

      params.request.method = 'inexistent';
      await routes.handler(...params.values());

      expect(params.response.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        '*'
      );
    });

    test('given method OPTIONS it should choose options route', async () => {
      const routes = new Routes();
      const params = { ...defaultParams };

      params.request.method = 'OPTIONS';
      await routes.handler(...params.values());

      expect(params.response.writeHead).toHaveBeenCalledWith(204);
      expect(params.response.end).toHaveBeenCalled();
    });

    test('given method POST it should choose post route', async () => {
      const routes = new Routes();
      const params = { ...defaultParams };

      params.request.method = 'POST';
      jest.spyOn(routes, routes.post.name).mockResolvedValue();

      await routes.handler(...params.values());
      expect(routes.post).toHaveBeenCalled();
    });

    test('given method GET it should choose get route', async () => {
      const routes = new Routes();
      const params = { ...defaultParams };

      params.request.method = 'GET';
      jest.spyOn(routes, routes.get.name).mockResolvedValue();

      await routes.handler(...params.values());
      expect(routes.get).toHaveBeenCalled();
    });
  });

  describe('#get', () => {
    test('give method GET it should list all files downloaded', async () => {
      const route = new Routes();
      const params = {
        ...defaultParams,
      };

      const filesStatusesMock = [
        {
          size: '1.05 MB',
          lastModified: '2021-09-10T14:30:46.178Z',
          owner: 'pablo',
          file: 'file.png',
        },
      ];

      jest
        .spyOn(route.fileHelper, route.fileHelper.getFilesStatus.name)
        .mockResolvedValue(filesStatusesMock);

      params.request.method = 'GET';

      await route.handler(...params.values());

      expect(params.response.writeHead).toHaveBeenCalledWith(200);

      expect(params.response.end).toHaveBeenCalledWith(
        JSON.stringify(filesStatusesMock)
      );
    });
  });

  describe('#pots', () => {
    test('it should validate post route workflow', async () => {
      const route = new Routes('./tmp');

      const options = {
        ...defaultParams,
      };

      options.request.method = 'POST';
      options.request.url = '?socketId=11';

      jest
        .spyOn(
          UploadHandler.prototype,
          UploadHandler.prototype.registerEvents.name
        )
        .mockImplementation((headers, onFinish) => {
          const writable = TestUtil.generateWritableStream(() => {});

          writable.on('finish', onFinish);

          return writable;
        });

      await route.handler(...options.values());

      expect(UploadHandler.prototype.registerEvents).toHaveBeenCalled();
      expect(options.response.writeHead).toHaveBeenCalledWith(200);

      const expectResultEnd = JSON.stringify({
        result: 'Files uploaded with success!',
      });

      expect(options.response.end).toHaveBeenCalledWith(expectResultEnd);
    });
  });
});
