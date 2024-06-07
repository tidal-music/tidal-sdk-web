# TIDAL SDK for Web
The TIDAL SDK for Web enables fast prototyping and development of new web apps built on [TIDAL Developer Platform](https://developer.tidal.com) by providing core functionality in a set of easy-to-use software modules.

The TIDAL SDK for Web serves as a complement to, and extension of, the [TIDAL API](https://developer.tidal.com/documentation/api/api-overview), meaning that some functionality provided by the TIDAL Developer Platform will only be made available through the TIDAL SDK, whereas some functionality will be available via both the TIDAL API and the TIDAL SDK.

# Documentation
[All public modules are documented and described](https://tidal-music.github.io/tidal-sdk-web). Please also have a look at the examples in the modules since they show more of the use cases.

# Development (of the SDK)
```bash
git clone git@github.com:tidal-music/tidal-sdk-web.git

cd ./tidal-sdk-web

# install deps
pnpm i

# run tests in all packages
pnpm test

# go to the package dir you want to work on
cd ./packages/event-producer

pnpm dev
```
## Create a new module
Run:
```bash
./bin/generate-module.sh
```
And follow the prompts.
## Create a module release
1. Bump your module's version to the desired value in your module's `package.json` file. You'll find an entry looking like this:
    ```
    "version": "0.0.1",
    ```
    Change `version` to the new value. Follow [Semantic Versioning](https://semver.org/). Also, you cannot downgrade - the CI/CD pipeline will refuse to work with downgrades.

2. Update the module's changelog file with the changes that will be introduced in the new version.

3. Open a Pull Request with your version bump and changelog update, get it approved and merge it. A release draft will be created for the module you changed.

4. Find your draft in the [releases list](https://github.com/tidal-music/tidal-sdk-web/releases) and add some meaningful sentences about the release, changelog style (Note: We should automate and regulate changelog creation, but for now, you are free to just type).

5. Check in with your teammates, lead, the module's owner etc. to make sure the release is ready to go.

6. Click `Publish` at the bottom of your draft release. This will trigger a workflow to tag the release commit and attach artifacts to the release. It will also trigger publishing the package to `Npm`, where it should appear under [@tidal-music Npm org](https://www.npmjs.com/org/tidal-music) shortly!
