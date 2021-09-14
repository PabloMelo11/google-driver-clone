import fs from 'fs';
import { describe, test, expect, jest } from '@jest/globals';

import FileHelper from '../../src/fileHelper';

describe('#FileHelper', () => {
  describe('#getFilesStatus', () => {
    test('it should return files statuses in correct format', async () => {
      const statMock = {
        dev: 2053,
        mode: 33204,
        nlink: 1,
        uid: 1000,
        gid: 1000,
        rdev: 0,
        blksize: 4096,
        ino: 4475629,
        size: 1054072,
        blocks: 2064,
        atimeMs: 1631284248965.5762,
        mtimeMs: 1631284246185.5457,
        ctimeMs: 1631284246189.5457,
        birthtimeMs: 1631284246177.5457,
        atime: '2021-09-10T14:30:48.966Z',
        mtime: '2021-09-10T14:30:46.186Z',
        ctime: '2021-09-10T14:30:46.190Z',
        birthtime: '2021-09-10T14:30:46.178Z',
      };

      const mockUser = 'pablo';
      process.env.USER = mockUser;

      const fileName = 'file.png';

      jest
        .spyOn(fs.promises, fs.promises.readdir.name)
        .mockResolvedValue([fileName]);

      jest
        .spyOn(fs.promises, fs.promises.stat.name)
        .mockResolvedValue(statMock);

      const result = await FileHelper.getFilesStatus('/tmp');

      const expectedResult = [
        {
          size: '1.05 MB',
          lastModified: statMock.birthtime,
          owner: mockUser,
          file: fileName,
        },
      ];

      expect(fs.promises.stat).toHaveBeenCalledWith(`/tmp/${fileName}`);
      expect(result).toMatchObject(expectedResult);
    });
  });
});
