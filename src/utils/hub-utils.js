/**
 * Helper method to handle fatal errors that occur while trying to load a file from the Hugging Face Hub.
 * @param {number} status The HTTP status code of the error.
 * @param {string} remoteURL The URL of the file that could not be loaded.
 * @param {boolean} fatal Whether to raise an error if the file could not be loaded.
 * @returns {null} Returns `null` if `fatal = true`.
 * @throws {Error} If `fatal = false`.
 */
export function handleError(status, remoteURL, fatal) {
    if (!fatal) {
        // File was not loaded correctly, but it is optional.
        // TODO in future, cache the response?
        return null;
    }

    switch (status) {
        // 4xx errors (https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses)
        case 400:
            throw Error(`Bad request error occurred while trying to load file: "${remoteURL}".`)
        case 401:
            throw Error(`Unauthorized access to file: "${remoteURL}".`)
        case 403:
            throw Error(`Forbidden access to file: "${remoteURL}".`)
        case 404:
            throw Error(`Could not locate file: "${remoteURL}".`)
        case 408:
            throw Error(`Request timeout error occurred while trying to load file: "${remoteURL}".`)

        // 5xx errors (https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#server_error_responses)
        case 500:
            throw Error(`Internal server error error occurred while trying to load file: "${remoteURL}".`)
        case 502:
            throw Error(`Bad gateway error occurred while trying to load file: "${remoteURL}".`)
        case 503:
            throw Error(`Service unavailable error occurred while trying to load file: "${remoteURL}".`)
        case 504:
            throw Error(`Gateway timeout error occurred while trying to load file: "${remoteURL}".`)

        // Other:
        default:
            throw Error(`Error (${status}) occurred while trying to load file: "${remoteURL}".`)
    }
}