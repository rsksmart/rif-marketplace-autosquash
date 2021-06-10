import * as core from '@actions/core'
import * as github from '@actions/github'
import {autoSquash, getPullRequestBySha} from './utils'

const ALLOWED_ACTIONS = ['push', 'opened', 'edited', 'updated']

async function run(): Promise<void> {
  try {
    const token = core.getInput('github_token')
    core.debug(token)
    const octokit = github.getOctokit(token)

    const branchesInput = core.getInput('branches').split(',')
    core.debug(String(branchesInput))

    const {
      eventName,
      sha: contextSha,
      payload: {repository, action: payloadAction, pull_request}
    } = github.context

    if (!repository)
      throw Error('Something is wrong. Repository does not seem to exist.')

    const {
      owner: {login},
      name: repoName
    } = repository

    const action = payloadAction ?? eventName // action not present on in push payload
    core.info(`action: ${action}`)
    if (!action) {
      throw Error(
        'Something is wrong. There does not seem to be any action or event name.'
      )
    } else if (!ALLOWED_ACTIONS.includes(action)) {
      throw Error(`Action "${action}" is not allowed.`)
    }

    const resolvedPR =
      pull_request ??
      (await getPullRequestBySha(octokit, login, repoName, contextSha))

    if (!resolvedPR) {
      core.info(`There's no PR for this hotfix yet.`)
      return
    }
    const {
      commits: commitCount,
      title: prTitle,
      head: {ref: branchName}
    } = resolvedPR

    await autoSquash({commitCount, repoName, prTitle, branchName, token, login})
  } catch (error) {
    core.error(error)
    core.setFailed(error.message)
  }
}

run()

export default run
