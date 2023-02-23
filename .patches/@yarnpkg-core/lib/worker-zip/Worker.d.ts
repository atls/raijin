/// <reference types="node" />
import { PortablePath } from '@yarnpkg/fslib';
import { ExtractBufferOptions } from '../tgzUtils';
export type ConvertToZipPayload = {
    tmpFile: PortablePath;
    tgz: Buffer | Uint8Array;
    opts: ExtractBufferOptions;
};
