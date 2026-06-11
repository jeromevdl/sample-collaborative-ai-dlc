// Per-repo PR-creation loop for multi-repo projects, extracted from
// trigger_pr_creation so the orchestration (409 → server-side merge → retry,
// per-repo error containment) is unit-testable without Neptune/Lambda mocks.
//
// Each repo is processed independently: any failure — including a malformed
// repo URL that makes parseOwnerRepo throw — is recorded in `failedRepos` and
// never aborts PR creation for the remaining repos.
//
// failedRepos entry shapes (the construction orchestrator prompt documents the
// remediation for each — keep them in sync):
//   { repository, error, conflicts, mergeErrors } — server-side auto-merge could not complete
//   { repository, error, unmergedBranches }       — create-pr still reports unmerged branches after
//                                                   the merge+retry (a new task branch appeared)
//   { repository, error }                         — any other create-pr / infrastructure failure

const { mergeUnmergedTaskBranches } = require('./merge-task-branches');

async function createPrsForRepos({
  repos, // [{ url }] — env.gitRepos
  sprintBranch,
  gitToken,
  invokeCreatePr, // async (repoUrl) => parsed create-pr Lambda response
  parseOwnerRepo, // (s) => { owner, repo } — throws on malformed input
  mergeFn = mergeUnmergedTaskBranches,
}) {
  const prResults = [];
  const failedRepos = [];

  for (const repo of repos) {
    try {
      let resp = await invokeCreatePr(repo.url);

      if (
        resp.statusCode === 409 &&
        Array.isArray(resp.unmergedBranches) &&
        resp.unmergedBranches.length
      ) {
        const { owner, repo: repoName } = parseOwnerRepo(repo.url);
        const mergeResult = await mergeFn({
          owner,
          repo: repoName,
          sprintBranch,
          unmergedBranches: resp.unmergedBranches,
          gitToken,
        });

        if (mergeResult.conflicts.length || mergeResult.errors.length) {
          failedRepos.push({
            repository: repo.url,
            error: 'Unmerged construction task branches could not be auto-merged',
            conflicts: mergeResult.conflicts,
            mergeErrors: mergeResult.errors,
          });
          continue;
        }

        resp = await invokeCreatePr(repo.url);
      }

      if (resp.prUrl && resp.prNumber) {
        prResults.push({ ...resp, repository: repo.url });
      } else {
        failedRepos.push({
          repository: repo.url,
          error: resp.error || resp.body || `create-pr returned status ${resp.statusCode}`,
          ...(Array.isArray(resp.unmergedBranches) && resp.unmergedBranches.length
            ? { unmergedBranches: resp.unmergedBranches }
            : {}),
        });
        console.error(`[trigger_pr_creation] No PR created for ${repo.url}:`, resp);
      }
    } catch (e) {
      // Contain per-repo failures (malformed URL, Lambda invoke errors,
      // unparseable payloads). One bad repos[] entry must not brick PR
      // creation for the whole project.
      failedRepos.push({ repository: repo.url, error: e.message });
      console.error(`[trigger_pr_creation] PR creation threw for ${repo.url}:`, e);
    }
  }

  return { prResults, failedRepos };
}

// Pure completeness check for the existing-PRGroup early-return: which
// configured repos have no live PR in the group? Without this, a re-run after
// a partial failure finds the (incomplete) PRGroup, sees its PRs are open, and
// early-returns success — permanently dropping the failed repos.
function missingRepos(gitRepos, existingPrs) {
  const covered = new Set((existingPrs || []).map((p) => p.repository));
  return (gitRepos || []).filter((r) => !covered.has(r.url));
}

module.exports = { createPrsForRepos, missingRepos };
