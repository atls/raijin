/// <reference types="node" />
/// <reference types="node" />
import { PortablePath } from '@yarnpkg/fslib';
import type { RequestError } from 'got';
import { URL } from 'url';
import { Configuration } from './Configuration';
export type { RequestError } from 'got';
/**
 * Searches through networkSettings and returns the most specific match
 */
export declare function getNetworkSettings(target: string | URL, opts: {
    configuration: Configuration;
}): {
    httpsCaFilePath: PortablePath | null;
    enableNetwork: boolean | null;
    httpProxy: string | null;
    httpsProxy: string | null;
    httpsKeyFilePath: PortablePath | null;
    httpsCertFilePath: PortablePath | null;
};
export type Body = ({
    [key: string]: any;
} | string | Buffer | null);
export declare enum Method {
    GET = "GET",
    PUT = "PUT",
    POST = "POST",
    DELETE = "DELETE"
}
export type Options = {
    configuration: Configuration;
    customErrorMessage?: (err: RequestError, configuration: Configuration) => string | null;
    headers?: {
        [headerName: string]: string;
    };
    jsonRequest?: boolean;
    jsonResponse?: boolean;
    method?: Method;
};
export declare function request(target: string | URL, body: Body, { configuration, headers, jsonRequest, jsonResponse, method }: Omit<Options, 'customErrorMessage'>): Promise<any>;
export declare function get(target: string, { configuration, jsonResponse, customErrorMessage, ...rest }: Options): Promise<any>;
export declare function put(target: string, body: Body, { customErrorMessage, ...options }: Options): Promise<Buffer>;
export declare function post(target: string, body: Body, { customErrorMessage, ...options }: Options): Promise<Buffer>;
export declare function del(target: string, { customErrorMessage, ...options }: Options): Promise<Buffer>;
