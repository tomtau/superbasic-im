# Contributing

Thank you for your interest in contributing to Super Basic IM!
The contribution policy we follow is the [Collective Code Construction Contract (C4)](https://rfc.zeromq.org/spec/42/).

## Code of Conduct

All contributors are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Feature requests and bug reports

Feature requests and bug reports should be posted as [Github issues](issues/new).
In an issue, please describe what you did, what you expected, and what happened instead.
In line with the C4's Patch Requirements, please use 
a single short (less than 50 characters) line stating the problem (“Problem: …") being solved
as the title of your issue.
If you would like to propose a solution to that problem, please describe it in the description.

## Working on issues

The code should follow [Google TypeScript Style](https://github.com/google/gts).
Please make sure to use `npm run lint` before every commit (e.g. by configuring your editor to do it for you upon saving a file).

Once you identified a problem to work on, this is the summary of your basic steps:

* Fork Super Basic IM's repository under your Github account.

* Clone your fork locally on your machine.

* Post a comment in the issue to say that you are working on it, so that other people do not work on the same issue.

* Create a local branch on your machine by `git checkout -b branch_name`.

* Make sure the code compiles (`npm run compile`) and passes the style check (`npm run lint`).

* Commit your changes to your own fork -- see [C4 Patch Requirements](https://rfc.zeromq.org/spec:42/C4/#23-patch-requirements) for guidelines.

* Check you are working on the latest version on main in Super Basic IM's official repository. If not, please pull Super Basic IM's official repository's main (upstream) into your fork's main branch, and rebase your committed changes or replay your stashed changes in your branch over the latest changes in the upstream version.

* Push your changes to your fork's branch and open the pull request to Super Basic IM's repository main branch.
