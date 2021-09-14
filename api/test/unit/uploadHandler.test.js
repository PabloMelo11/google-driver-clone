import fs from 'fs';
import { resolve } from 'path';
import { pipeline } from 'stream/promises';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

import { logger } from '../../src/logger';
import UploadHandler from '../../src/uploadHandler';
import TestUtil from '../utils/testUtil';

describe('#UploadHandler test suite', () => {
  const ioObject = {
    to: () => ioObject,
    emit: (event, message) => {},
  };

  beforeEach(() => {
    jest.spyOn(logger, 'info').mockImplementation();
  });

  describe('#registerEvents', () => {
    test('should call onFile and onFinish functions on Busboy instance', () => {
      const uploadHandler = new UploadHandler({
        io: ioObject,
        socketId: '1',
      });

      jest.spyOn(uploadHandler, uploadHandler.onFile.name).mockResolvedValue();

      const headers = {
        'content-type': 'multipart/form-data; boundary=',
      };

      const onFinish = jest.fn();

      const busboyInstance = uploadHandler.registerEvents(headers, onFinish);

      const fileStream = TestUtil.generateReadableStream([
        'chunk',
        'of',
        'data',
      ]);

      busboyInstance.emit('file', 'fieldName', fileStream, 'filename.txt');

      busboyInstance.listeners('finish')[0].call();

      expect(uploadHandler.onFile).toHaveBeenCalled();
      expect(onFinish).toHaveBeenCalled();
    });
  });

  describe('#onFile', () => {
    test('given a stream file it should save it on disk', async () => {
      const chunks = ['hey', 'dude'];
      const downloadsFolder = '/tmp';

      const handler = new UploadHandler({
        io: ioObject,
        socketId: '2',
        downloadsFolder,
      });

      const onData = jest.fn();

      jest
        .spyOn(fs, fs.createWriteStream.name)
        .mockImplementation(() => TestUtil.generateWritableStream(onData));

      const onTransform = jest.fn();

      jest
        .spyOn(handler, handler.handleFileBytes.name)
        .mockImplementation(() =>
          TestUtil.generateTransformStream(onTransform)
        );

      const params = {
        fieldName: 'video',
        file: TestUtil.generateReadableStream(chunks),
        filename: 'mockFile.mov',
      };

      await handler.onFile(...Object.values(params));

      const expectFileName = resolve(handler.downloadsFolder, params.filename);

      expect(onData.mock.calls.join()).toEqual(chunks.join());
      expect(onTransform.mock.calls.join()).toEqual(chunks.join());
      expect(fs.createWriteStream).toHaveBeenCalledWith(expectFileName);
    });
  });

  describe('#handleFileBytes', () => {
    test('should call emit functions and it is readable transform stream', async () => {
      jest.spyOn(ioObject, ioObject.to.name);
      jest.spyOn(ioObject, ioObject.emit.name);

      const handler = new UploadHandler({
        io: ioObject,
        socketId: '3',
      });

      jest.spyOn(handler, handler.canExecute.name).mockReturnValueOnce(true);

      const messages = ['hello'];

      const source = TestUtil.generateReadableStream(messages);

      const onWrite = jest.fn();
      const target = TestUtil.generateWritableStream(onWrite);

      await pipeline(source, handler.handleFileBytes('filename.txt'), target);

      expect(ioObject.to).toHaveBeenCalledTimes(messages.length);
      expect(ioObject.emit).toHaveBeenCalledTimes(messages.length);

      expect(onWrite).toBeCalledTimes(messages.length);
      expect(onWrite.mock.calls.join()).toEqual(messages.join());
    });

    test('given message timerDelay as 2secs it should emit only two message during 2 seconds period', async () => {
      jest.spyOn(ioObject, ioObject.emit.name);

      const day = '2021-08-11 01:01';
      const messageTimeDelay = 2000;

      const onFirstLastMessageSent = TestUtil.getTimeFromDate(`${day}:00`);

      const onFirstCanExecute = TestUtil.getTimeFromDate(`${day}:02`);
      const onSecondUpdateLastMessageSent = onFirstCanExecute;

      const onSecondCanExecute = TestUtil.getTimeFromDate(`${day}:03`);

      const onThirdCanExecute = TestUtil.getTimeFromDate(`${day}:04`);

      TestUtil.mockDateNow([
        onFirstLastMessageSent,
        onFirstCanExecute,
        onSecondUpdateLastMessageSent,
        onSecondCanExecute,
        onThirdCanExecute,
      ]);

      const filename = 'filename.avi';
      const messages = ['hello', 'hello', 'world'];
      const expectedMessageSent = 2;

      const source = TestUtil.generateReadableStream(messages);

      const handler = new UploadHandler({
        io: ioObject,
        socketId: '01',
        messageTimeDelay,
      });

      await pipeline(source, handler.handleFileBytes(filename));

      expect(ioObject.emit).toHaveBeenCalledTimes(expectedMessageSent);

      const [firstCallResult, secondCallResult] = ioObject.emit.mock.calls;

      expect(firstCallResult).toEqual([
        handler.ON_UPLOAD_EVENT,
        { processedAlready: 'hello'.length, filename },
      ]);

      expect(secondCallResult).toEqual([
        handler.ON_UPLOAD_EVENT,
        { processedAlready: messages.join('').length, filename },
      ]);
    });
  });

  describe('#canExecute', () => {
    test('should return true when time is later than specified delay', () => {
      const timerDelay = 1000;

      const uploadHandler = new UploadHandler({
        io: {},
        socketId: '4',
        messageTimeDelay: timerDelay,
      });

      const tickNow = TestUtil.getTimeFromDate('2021-08-11 00:00:03');

      TestUtil.mockDateNow([tickNow]);

      const lastExecution = TestUtil.getTimeFromDate('2021-08-11 00:00:00');

      const result = uploadHandler.canExecute(lastExecution);

      expect(result).toBeTruthy();
    });

    test('should return false when time is not later than specified delay', () => {
      const timerDelay = 3000;

      const uploadHandler = new UploadHandler({
        io: {},
        socketId: '4',
        messageTimeDelay: timerDelay,
      });

      const tickNow = TestUtil.getTimeFromDate('2021-08-11 19:00:13');

      TestUtil.mockDateNow([tickNow]);

      const lastExecution = TestUtil.getTimeFromDate('2021-08-11 19:00:12');

      const result = uploadHandler.canExecute(lastExecution);

      expect(result).toBeFalsy();
    });
  });
});
