import { formatError, extractAxiosError } from '../customErrHandler';
import { contentReturnElement } from '../middleware'; // Import the type
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Helper to create a mock AxiosError
const createMockAxiosError = (
    status?: number,
    statusText?: string,
    data?: any,
    isResponseError: boolean = true // true for response error, false for request error
): AxiosError => {
    const config: InternalAxiosRequestConfig = { headers: {} as any }; // Simplified config
    const request = isResponseError ? undefined : { path: '/test/path', method: 'GET' }; // Simplified request for non-response errors
    const response: AxiosResponse | undefined = isResponseError ? {
        data: data,
        status: status || 500,
        statusText: statusText || 'Internal Server Error',
        headers: {},
        config: config,
    } : undefined;

    const error = new AxiosError(
        `Request failed with status code ${status || 500}`,
        status ? String(status) : 'ERR_BAD_RESPONSE',
        config,
        request,
        response
    );
    return error;
};

describe('Custom Error Handler Utilities', () => {

    describe('extractAxiosError', () => {
        it('should format a standard Axios response error', () => {
            const mockError = createMockAxiosError(404, 'Not Found', { error: 'Resource missing' });
            const result = extractAxiosError(mockError);

            expect(result.type).toEqual('text');
            // Add explicit type check for narrowing and declare parsedText outside
            let parsedText: any;
            if (result.type === 'text') {
                parsedText = JSON.parse(result.text);
                expect(parsedText.type).toEqual('response with error');
                expect(parsedText.statusCode).toEqual(404);
            } else {
                // Fail test if type is not 'text'
                throw new Error('Expected result type to be "text" but got "' + result.type + '"');
            }
            // Assertions now use parsedText declared outside the if
            expect(parsedText.statusText).toEqual('Not Found');
            expect(parsedText.responseBody).toEqual({ error: 'Resource missing' });
        });

         it('should format a standard Axios response error with string body', () => {
            const mockError = createMockAxiosError(400, 'Bad Request', 'Invalid input data');
            const result = extractAxiosError(mockError);

            expect(result.type).toEqual('text');
            let parsedText: any;
            if (result.type === 'text') {
                parsedText = JSON.parse(result.text);
                expect(parsedText.type).toEqual('response with error');
                expect(parsedText.statusCode).toEqual(400);
            } else {
                 throw new Error('Expected result type to be "text" but got "' + result.type + '"');
            }
            expect(parsedText.statusText).toEqual('Bad Request');
            expect(parsedText.responseBody).toEqual('Invalid input data');
        });

         it('should format a standard Axios response error with binary/buffer body', () => {
            // Simulate a buffer-like object structure
            const bufferLike = { type: 'Buffer', data: [1, 2, 3] };
            const mockError = createMockAxiosError(500, 'Server Error', bufferLike);
            const result = extractAxiosError(mockError);

            expect(result.type).toEqual('text');
            let parsedText: any;
             if (result.type === 'text') {
                parsedText = JSON.parse(result.text);
                expect(parsedText.type).toEqual('response with error');
                expect(parsedText.statusCode).toEqual(500);
            } else {
                 throw new Error('Expected result type to be "text" but got "' + result.type + '"');
            }
            expect(parsedText.responseBody).toEqual('undefined or binary');
        });

        it('should format an Axios request error (no response)', () => {
            const mockError = createMockAxiosError(undefined, undefined, undefined, false); // isResponseError = false
            const result = extractAxiosError(mockError);

            expect(result.type).toEqual('text');
            let parsedText: any;
             if (result.type === 'text') {
                parsedText = JSON.parse(result.text);
                expect(parsedText.type).toEqual('error creating request');
                expect(parsedText.text).toEqual({ URI: '/test/path', method: 'GET' });
            } else {
                 throw new Error('Expected result type to be "text" but got "' + result.type + '"');
            }
        });

        it('should format a nested Axios error (in error.cause)', () => {
            const nestedError = createMockAxiosError(403, 'Forbidden', 'Access denied');
            const mockError = { cause: nestedError };
            const result = extractAxiosError(mockError);

            expect(result.type).toEqual('text');
            let parsedText: any;
             if (result.type === 'text') {
                parsedText = JSON.parse(result.text);
                expect(parsedText.type).toEqual('response with error');
                expect(parsedText.statusCode).toEqual(403);
            } else {
                 throw new Error('Expected result type to be "text" but got "' + result.type + '"');
            }
            expect(parsedText.responseBody).toEqual('Access denied');
        });

        it('should format a doubly nested Axios error (in error.cause.cause)', () => {
            const doublyNestedError = createMockAxiosError(503, 'Service Unavailable', 'Try again later');
            const nestedError = { cause: doublyNestedError };
            const mockError = { cause: nestedError };
            const result = extractAxiosError(mockError);

            expect(result.type).toEqual('text');
            let parsedText: any;
             if (result.type === 'text') {
                parsedText = JSON.parse(result.text);
                expect(parsedText.type).toEqual('response with error');
                expect(parsedText.statusCode).toEqual(503);
            } else {
                 throw new Error('Expected result type to be "text" but got "' + result.type + '"');
            }
            expect(parsedText.responseBody).toEqual('Try again later');
        });

        it('should format a standard Error object', () => {
            const mockError = new Error('Generic error message');
            const result = extractAxiosError(mockError);

            expect(result.type).toEqual('text');
            let parsedText: any;
             if (result.type === 'text') {
                parsedText = JSON.parse(result.text);
                expect(parsedText.error).toEqual('Error: Generic error message');
            } else {
                 throw new Error('Expected result type to be "text" but got "' + result.type + '"');
            }
        });

        it('should format a string error', () => {
            const mockError = 'Just a string error';
            const result = extractAxiosError(mockError);

            expect(result.type).toEqual('text');
            let parsedText: any;
             if (result.type === 'text') {
                parsedText = JSON.parse(result.text);
                expect(parsedText.error).toEqual('Just a string error');
            } else {
                 throw new Error('Expected result type to be "text" but got "' + result.type + '"');
            }
        });

         it('should format a null error', () => {
            const result = extractAxiosError(null);
            expect(result.type).toEqual('text');
            if (result.type === 'text') {
                expect(result.text).toContain('Received a null error');
            }
        });

        it('should format an unknown object error', () => {
            const mockError = { custom: 'error', code: 123 };
            const result = extractAxiosError(mockError);

            expect(result.type).toEqual('text');
            let parsedText: any;
             if (result.type === 'text') {
                parsedText = JSON.parse(result.text);
                // toString() on a plain object gives '[object Object]'
                expect(parsedText.error).toEqual('[object Object]');
            } else {
                 throw new Error('Expected result type to be "text" but got "' + result.type + '"');
            }
        });
    });

    // formatError just calls extractAxiosError and logs, so we only need a basic test
    describe('formatError', () => {
        it('should call extractAxiosError and return its result', () => {
             // Mocking logError to avoid actual logging during test
             const originalLogError = console.error; // Assuming logError uses console.error or similar
             console.error = jest.fn(); // Replace with jest mock

            const mockError = new Error('Test error for formatError');
            const expectedResult = extractAxiosError(mockError); // Get expected format
            const result = formatError(mockError);

            expect(result).toEqual(expectedResult);
            // Optionally check if logError was called (requires mocking logError from '..')
            // expect(logError).toHaveBeenCalled();

             console.error = originalLogError; // Restore original logger
        });
    });
});
