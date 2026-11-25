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

## Update workspace dependencies
Normally handled by Renovate, but if you need to do it manually:
```bash
pnpm update --interactive --latest --recursive

# can also trim some sub-dependencies with:
pnpm update
pnpm dedupe
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

### `@tidal-music/api` releases automatically

The `api` module is generated from the [published TIDAL API spec](https://tidal-music.github.io/tidal-api-reference/), and nobody needs to step in to release it:

1. Every night, `check-tidalapi-spec.yml` checks for spec changes. If there are any, it regenerates the types, bumps the minor version, and writes a changelog entry listing the endpoints and schemas that were added, changed or removed. It then opens a PR, or updates the open one.
2. The PR is approved automatically and set to auto-merge, so it merges once the required checks pass.
3. On merge, the draft release is created as usual. The package is then published to npm, and the release is published with the changelog entry as its notes.

Auto-merge needs the `ACTIONS_PAT` org secret (from `tidal-tools`, which must have write access to this repo), and `Run Unit Tests / Run Unit Tests` must be a required status check on `main`. Without either, the PR is still opened but has to be approved and merged by hand.
