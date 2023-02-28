# Contributing

Thank you for your interest in contributing to the `gofer-engine` project. This document provides a high-level overview of how to get started as a contributor.

Before you start, please read the [README](./README.md) to get a better understanding of the project.

## Instructions for Logging Issues

### 1. Read the [README](./README.md)

Please read the [README](./README.md) before logging new issues, even if you think you have found a bug.

Issues that ask questions answered in the README will be closed without elaboration.

### 2. Search for Duplicates

[Search the existing issues](https://github.com/amaster507/gofer/issues) before logging a new one.

Some search tops:

- Don't restrict your search to only open issues. An issue with a title similar to yours may have been closed as a duplicate of one with a less-findable title.
- Check for synonyms. For example, if you bug involves an interface, it likely also occurs with channels.
- Search for the title of the issue you're about to log. This sounds obvious but 80% of the time this is sufficient to find a duplicate when one exists.
- Read more than the first page of results. Many bugs may use the same words so relevancy sorting is not particularly useful.
- If you have a crash, search for the first few topmost function names shown in the call stack.

### 3. Do you have a question?

The issue tracker is for **issues**, in other words, bugs and suggestions. If you have a _question_, please use these platforms:

#### - [Github Discussions](https://github.com/amaster507/gofer/discussions)

#### - [Discord Server](https://discord.gg/pDQvMNUwk7)

Not being rude, but we don't want to clutter the issue tracker with questions, so we'll close them without giving answers.

### 4. Did you find a bug?

When logging a bug, please be sure to include the following:

- What version of `gofer-engine` are you using?
- What version of Node.js are you using?
- What operating system are you using?
- If at all possible, an _isolated_ way to reproduce the behavior.
- The behavior you expect to see, and the actual behavior.

### 5. Do you have a suggestion?

We also accest suggestions in the issue tracker. Be sure to [search](#2-search-for-duplicates) first.

In general, things we find useful when reviewing suggestions are:

- A description of the problem you're trying to solve
- An overview of the suggested solution
- Examples of how the suggestion would work in various places
  - Code examples showing e.g. "this would be an error, this wouldn't"
  - Code examples showing the input and output of the new feature
- If relevant, precedent in other interface designs/spec sheets can be useful for establishing context and expected behavior.

## Instructions for Contributing Code

1. Fork the repository
2. Create a new branch for your changes
3. Make your changes locally
4. _FUTURE_: Run the tests locally
5. Commit your changes with a descriptive commit message
6. Push your changes to your fork.
7. Create a pull request against the `main` branch of this repository.
8. Wait for a maintainer to review your changes.
9. Respond to any feedback from the maintainer.

Things to consider when making changes:

- If your changes modify documentation, please update the documentation in the same PR.
- Use English for all communication including variable naming and comments as much as possible.
- Add comments to your code where appropriate to explain "WHY" you did something.
- Refrain from adding comments that explain "WHAT" you did. The code should be self-explanatory.
- Try to keep your changes as small as possible. This makes it easier for the maintainers to review your changes. If multiple features are being added, please consider splitting them into multiple independent PRs.
- _FUTURE_: If you are adding a new feature, please add tests to cover the new feature.
- _FUTURE_: If you are fixing a bug, please add a test that covers the bug.

If you have any questions, please feel free to reach out to the maintainers in [Discussions](#github-discussions) or [Discord](#discord-server)
