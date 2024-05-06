# TIDAL Auth

## Description
Auth module handles Authentication and Authorization when interacting with the TIDAL API or other TIDAL SDKs.
It provides a simple setup and easy to use SDK to interact with the oAuth2 server endpoints.

# Features
* User Login and Sign up handling (through login.tidal.com)
* Automatic session refresh (refreshing oAuthTokens)
* Secure and encrypted storage of your tokens

# Usage

`npm install @tidal-music/auth` (or similar for other package managers)

## Client Credentials

This authentication method uses `clientId` and `clientSecret`, e.g. when utilizing the [TIDAL API](https://developer.tidal.com/documentation/api/api-overview). Follow these steps or refer to our example for ["client credentials"](./examples/client-credentials.html).

1. Initiate the process by calling `init` and ensure to provide the `clientId` and `clientSecret`.
2. Obtain credentials by calling `credentialsProvider.getCredentials`, which should return credentials containing a `token`.
3. Make API calls to your desired endpoint and include `Authentication: Bearer YOUR_TOKEN` as a header.
4. That's it!

## Authorization Code Flow (user login)
(Only available for TIDAL internally developed applications for now)

To implement the login redirect flow, follow these steps or refer to our example for ["authorization code"](./examples/authorization-code.html).

1. Initiate the process by calling the `init` function.
2. For the first login:
    * Begin with the `initializeLogin` function, which provides the login URL. Open this URL in a browser, where the user can log in using their username/password.
    * After redirection to your app, follow up with a call to `finalizeLogin`.
    * Subsequently, use `credentialsProvider.getCredentials` to obtain a token for activities like API calls.
3. For subsequent logins, when the user returns to your app, simply call `credentialsProvider.getCredentials`. This is sufficient unless the user actively logs out or a token is revoked (e.g., due to a password change).

> ⚠️ Ensure to invoke `credentialsProvider.getCredentials` each time you need a token and avoid storing it. This approach enables the SDK to manage timeouts, upgrades, or automatic retries seamlessly.

## Device Login
(Only available for TIDAL internally developed applications for now)

For devices with limited input capabilities, such as TVs, an alternative login method is provided. Follow these steps or refer to our example for ["device login"](./examples/limited-input-device.html).

1. Initiate the process by calling the `init` function.
2. Use `initializeDeviceLogin` and await the response.
3. The response will contain a `userCode` and a `verificationUri`; display these to the user.
4. Instruct the user to visit `link.tidal.com`, log in, and enter the displayed code.
5. Subsequently, call `finalizeDeviceLogin`, which will continually poll the backend until the user successfully enters the code. Upon a successful promise return, you are ready to proceed.
6. Retrieve a token by calling `.credentialsProvider.getCredentials`.

> 💡 Many modern apps feature a QR-Code for scanning, which you can also generate. Ensure it includes `verificationUriComplete`, as provided in the response.

## Setting Credentials

If your application was previously authenticated, you can migrate these credentials into the auth module by following these steps or checking out our example for ["setting credentials"](./examples/setting-credentials.html).

1. Invoke `init` with the same `clientId`, etc., used for your previously authenticated user.
2. Utilize `setCredentials` by providing the accessToken and refreshToken.
3. Call `credentialsProvider.getCredentials` to obtain credentials containing a `token`.
4. You can now seamlessly utilize the auth SDK as if you had used any other method to "login."

# Examples

You can find examples in `/examples`, each one is dedicated to one type of receiving credentials.
Some examples needs a proxy to run, but there is one configured if you use `pnpm dev`.

> Heads up! Redirect login flow requires a secure context and valid https url to work properly.

For the examples to work you might need to build the library once with `pnpm build`.

# Documentation
[All public methods are documented and described](https://tidal-music.github.io/tidal-sdk-web/modules/_tidal_music_auth.html). Please also have a look at the examples since they should document most use cases.


# Development

* All development of the library is done in Typescript and is strongly typed. The examples are just in JS to make it simpler and have no build step.
* The auth SDK does currently only depend on other TIDAL libraries and we should try to keep it like that.
* When diving deep into the belly of the Auth SDK you'll find the storage and it's encryption. We chose to encrypt the credentials (access- and refresh token) to protect users from attacks. But please keep in mind this is not a super high level of security, we choose to still have a refresh token on the client which enables you to be logged in for a very long time without needing to enter your password every 24h like you would need for e.g. a banking app.

## Repo Setup

Run `pnpm i` in the auth root folder.

## Running Tests

### Unit Tests

`pnpm run test:dev` runs vitest in watch mode.
