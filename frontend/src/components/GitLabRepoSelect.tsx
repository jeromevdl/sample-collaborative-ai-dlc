import { useState, useEffect, useMemo } from 'react';
import { gitlabService, type GitLabRepo } from '../services/gitlab';

interface SingleProps {
  multiple?: false;
  value: string;
  onChange: (repo: GitLabRepo | null) => void;
  exclude?: string[];
}

interface MultiProps {
  multiple: true;
  value: string[];
  onChange: (repos: GitLabRepo[]) => void;
  exclude?: string[];
}

type Props = SingleProps | MultiProps;

export function GitLabRepoSelect(props: Props) {
  const [repos, setRepos] = useState<GitLabRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    gitlabService
      .listRepos()
      .then(setRepos)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const excludeSet = useMemo(() => new Set(props.exclude ?? []), [props.exclude]);

  const filtered = useMemo(() => {
    const available = repos.filter((r) => !excludeSet.has(r.fullName));
    if (!search) return available;
    const q = search.toLowerCase();
    return available.filter((r) => r.fullName.toLowerCase().includes(q));
  }, [repos, excludeSet, search]);

  if (loading) return <div className="text-sm text-gray-500">Loading projects...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  if (props.multiple) {
    const selected = new Set(props.value);

    const toggle = (repo: GitLabRepo) => {
      const next = selected.has(repo.fullName)
        ? props.value.filter((v) => v !== repo.fullName)
        : [...props.value, repo.fullName];
      props.onChange(
        next
          .map((fn) => repos.find((r) => r.fullName === fn))
          .filter((r): r is GitLabRepo => r !== undefined),
      );
    };

    return (
      <div className="space-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full border dark:border-gray-600 rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
        />
        <div className="max-h-60 overflow-y-auto border dark:border-gray-600 rounded divide-y dark:divide-gray-600">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              {repos.length === 0 ? 'No projects available' : 'No matching projects'}
            </div>
          ) : (
            filtered.map((repo) => (
              <label
                key={repo.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(repo.fullName)}
                  onChange={() => toggle(repo)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm truncate flex-1">{repo.fullName}</span>
                {repo.private && <span className="text-xs text-gray-400">🔒</span>}
              </label>
            ))
          )}
        </div>
        {selected.size > 0 && <p className="text-xs text-gray-500">{selected.size} selected</p>}
      </div>
    );
  }

  return (
    <select
      value={props.value}
      onChange={(e) => {
        const repo = repos.find((r) => r.fullName === e.target.value) || null;
        props.onChange(repo);
      }}
      className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
    >
      <option value="">Select a project</option>
      {filtered.map((repo) => (
        <option key={repo.id} value={repo.fullName}>
          {repo.fullName} {repo.private && '🔒'}
        </option>
      ))}
    </select>
  );
}
