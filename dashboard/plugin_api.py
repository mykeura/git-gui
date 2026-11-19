# SPDX-FileCopyrightText: 2026 Miguel Euraque
# SPDX-License-Identifier: MIT

"""Git Gui — read-only git backend, mounted at /api/plugins/git-gui/.

Every endpoint runs ``git`` as a subprocess in the directory the caller names
(``cwd`` is resolved to the repo root first). Nothing here writes to the repo:
no fetch, no checkout, no index or ref updates — ``GIT_OPTIONAL_LOCKS=0`` keeps
even incidental lock acquisition off.

Handlers are plain ``def`` so FastAPI runs the blocking subprocess calls in
its threadpool instead of stalling the event loop.

Error contract: ``HTTPException`` with ``detail={"code": ..., "message": ...}``.
Codes: ``bad_request`` (400), ``not_a_repo`` (404), ``not_found`` (404), ``git_missing`` (500),
``git_failed`` (500), ``timeout`` (504). ``/repo`` is the exception: a
non-repo directory is a normal answer there (``isRepo: false``, HTTP 200).
"""

from __future__ import annotations

import hashlib
import os
import re
import subprocess
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

_SHA_RE = re.compile(r"^[0-9a-fA-F]{4,40}$")
_DIFF_CAP_BYTES = 256 * 1024
_GIT_TIMEOUT = 15

_GIT_ENV_ALLOWLIST = ("PATH", "HOME", "LANG", "TMPDIR", "SYSTEMROOT")


def _git_env() -> dict[str, str]:
    env = {k: os.environ[k] for k in _GIT_ENV_ALLOWLIST if k in os.environ}
    env["GIT_OPTIONAL_LOCKS"] = "0"
    env["LC_ALL"] = "C"
    env["GIT_TERMINAL_PROMPT"] = "0"
    return env


_GIT_BASE = ["git", "-c", "core.quotepath=off", "-c", "color.ui=false", "--no-pager"]


def _err(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message})


def _run_git(cwd: str, args: list[str]) -> subprocess.CompletedProcess:
    """Run ``git <args>`` in ``cwd``. Raises the contract errors; never returns a
    failed process — callers check for the "expected miss" cases via
    :func:`_try_git` instead."""
    try:
        proc = subprocess.run(
            _GIT_BASE + args,
            cwd=cwd,
            capture_output=True,
            timeout=_GIT_TIMEOUT,
            env=_git_env(),
        )
    except FileNotFoundError:
        raise _err(500, "git_missing", "git is not installed or not on PATH")
    except subprocess.TimeoutExpired:
        raise _err(504, "timeout", f"git timed out after {_GIT_TIMEOUT}s")
    if proc.returncode != 0:
        stderr = proc.stderr.decode("utf-8", "replace").strip()
        raise _err(500, "git_failed", stderr or f"git exited with code {proc.returncode}")
    return proc


def _try_git(cwd: str, args: list[str]) -> Optional[subprocess.CompletedProcess]:
    """Like :func:`_run_git` but returns ``None`` on a non-zero exit, for the
    probes where "no" is a normal answer (rev-parse, symbolic-ref, verify)."""
    try:
        proc = subprocess.run(
            _GIT_BASE + args,
            cwd=cwd,
            capture_output=True,
            timeout=_GIT_TIMEOUT,
            env=_git_env(),
        )
    except FileNotFoundError:
        raise _err(500, "git_missing", "git is not installed or not on PATH")
    except subprocess.TimeoutExpired:
        raise _err(504, "timeout", f"git timed out after {_GIT_TIMEOUT}s")
    return proc if proc.returncode == 0 else None


def _repo_root(cwd: str) -> str:
    """Validate ``cwd`` and resolve its repository root. ``bad_request`` when
    the directory does not exist, ``not_a_repo`` when git says no."""
    if not cwd:
        raise _err(400, "bad_request", "cwd is required")
    path = Path(cwd)
    if not path.is_dir():
        raise _err(400, "bad_request", f"not a directory: {cwd}")
    proc = _try_git(str(path), ["rev-parse", "--show-toplevel"])
    if proc is None:
        raise _err(404, "not_a_repo", f"not a git repository: {cwd}")
    return proc.stdout.decode("utf-8", "replace").strip()


def _valid_sha(sha: str) -> str:
    if not _SHA_RE.fullmatch(sha or ""):
        raise _err(400, "bad_request", f"invalid sha: {sha!r}")
    return sha


def _valid_path(path: str) -> str:
    if not path:
        raise _err(400, "bad_request", "path is required")
    if path.startswith("-"):
        raise _err(400, "bad_request", f"invalid path: {path!r}")
    return path


def _text(proc: subprocess.CompletedProcess) -> str:
    return proc.stdout.decode("utf-8", "replace")


def _head_info(root: str) -> tuple[Optional[str], Optional[str]]:
    """``(head_sha, branch)`` — branch is the short symbolic-ref name, ``None``
    when detached. On an unborn branch returns ``(None, symbolic_name)``."""
    head = _try_git(root, ["rev-parse", "--verify", "HEAD"])
    sha = _text(head).strip() if head is not None else None
    sym = _try_git(root, ["symbolic-ref", "-q", "--short", "HEAD"])
    branch = _text(sym).strip() if sym is not None else None
    return sha, branch or None


def _refs_hash(root: str, head: Optional[str], branch: Optional[str]) -> str:
    """Fingerprint of every ref + HEAD: changes when any ref moves, a commit
    lands, or HEAD switches branches — the client's cheap "did anything
    change" poll value."""
    proc = _try_git(root, ["for-each-ref", "--format=%(refname) %(objectname)"])
    payload = (_text(proc) if proc is not None else "") + f"\nHEAD={head or ''}\nBRANCH={branch or ''}"
    return hashlib.sha1(payload.encode()).hexdigest()


def _parse_decorations(decoration: str) -> list[dict[str, Any]]:
    """Parse ``%D`` under ``--decorate=full`` into typed ref entries.

    ``HEAD -> refs/heads/main`` yields a ``head`` marker plus branch ``main``
    flagged ``current``; a bare ``HEAD`` (detached) yields the marker only.
    """
    refs: list[dict[str, Any]] = []
    if not decoration:
        return refs
    for token in decoration.split(", "):
        token = token.strip()
        if not token:
            continue
        target: Optional[str] = None
        if token == "HEAD":
            refs.append({"name": "HEAD", "type": "head", "current": True})
            continue
        if token.startswith("HEAD -> "):
            refs.append({"name": "HEAD", "type": "head", "current": True})
            target = token[len("HEAD -> "):]
        else:
            target = token
        if target.startswith("tag: "):  # %D keeps "tag: " even under --decorate=full
            target = target[len("tag: "):]
        if target.startswith("refs/heads/"):
            refs.append({
                "name": target[len("refs/heads/"):],
                "type": "branch",
                "current": token.startswith("HEAD -> "),
            })
        elif target.startswith("refs/remotes/"):
            name = target[len("refs/remotes/"):]
            if name.endswith("/HEAD"):
                continue
            refs.append({"name": name, "type": "remote", "current": False})
        elif target.startswith("refs/tags/"):
            refs.append({"name": target[len("refs/tags/"):], "type": "tag", "current": False})
        elif target:  # a name git could not resolve to a full ref: keep it readable
            refs.append({"name": target, "type": "branch", "current": False})
    return refs


def _diff_tree(root: str, sha: str, parents: list[str], extra: list[str]) -> str:
    args = ["diff-tree", "-r", "-M", "--no-commit-id", "-z"]
    if parents:
        args += [parents[0], sha]
    else:
        args += ["--root", sha]
    return _text(_run_git(root, args + extra))


def _parse_name_status(out: str) -> list[dict[str, Any]]:
    tokens = [t for t in out.split("\x00") if t]
    files: list[dict[str, Any]] = []
    i = 0
    while i < len(tokens):
        status = tokens[i]
        code = status[0]
        i += 1
        if code in ("R", "C"):
            old_path, new_path = tokens[i], tokens[i + 1]
            i += 2
            files.append({"path": new_path, "oldPath": old_path, "status": code})
        else:
            files.append({"path": tokens[i], "status": code})
            i += 1
    return files


def _parse_numstat(out: str) -> dict[str, tuple[Optional[int], Optional[int]]]:
    """``path -> (additions, deletions)``; ``-`` counts (binary) become None.
    With ``-z`` a rename's line ends in an empty path field followed by the old
    and new names as the next two NUL-separated tokens."""
    tokens = out.split("\x00")
    stats: dict[str, tuple[Optional[int], Optional[int]]] = {}
    i = 0

    def count(field: str) -> Optional[int]:
        return None if field == "-" else int(field)

    while i < len(tokens):
        token = tokens[i]
        i += 1
        if not token:
            continue
        parts = token.split("\t")
        if len(parts) < 3:
            continue
        adds, dels = parts[0], parts[1]
        if parts[2]:
            path = parts[2]
        elif i + 1 < len(tokens):  # rename: next tokens are old, new
            path = tokens[i + 1]
            i += 2
        else:
            continue
        try:
            stats[path] = (count(adds), count(dels))
        except ValueError:
            continue
    return stats


# --- Endpoints ----------------------------------------------------------------


@router.get("/repo")
def repo(cwd: str = Query(...)) -> dict[str, Any]:
    """Repo summary for ``cwd``. Not-a-repo is a normal answer, never an error."""
    if not cwd or not Path(cwd).is_dir():
        return {"isRepo": False, "root": None, "name": None, "head": None,
                "branch": None, "detached": False, "empty": False, "refsHash": None}
    proc = _try_git(cwd, ["rev-parse", "--show-toplevel"])
    if proc is None:
        return {"isRepo": False, "root": None, "name": None, "head": None,
                "branch": None, "detached": False, "empty": False, "refsHash": None}
    root = _text(proc).strip()
    head, branch = _head_info(root)
    return {
        "isRepo": True,
        "root": root,
        "name": Path(root).name,
        "head": head,
        "branch": branch,
        "detached": head is not None and branch is None,
        "empty": head is None,
        "refsHash": _refs_hash(root, head, branch),
    }


@router.get("/graph")
def graph(
    cwd: str = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=2000),
) -> dict[str, Any]:
    """Topo-ordered commit page across all refs (stashes excluded)."""
    root = _repo_root(cwd)
    out = _try_git(root, [
        "log", "--exclude=refs/stash", "--all", "--topo-order", "-z",
        "--decorate=full",
        f"--skip={skip}", f"--max-count={limit + 1}",
        "--format=%H%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%D%x1f%s",
    ])
    if out is None:  # empty repo: log exits non-zero with no commits
        return {"commits": [], "hasMore": False}
    commits = []
    for record in _text(out).split("\x00"):
        if not record:
            continue
        fields = record.split("\x1f")
        if len(fields) < 7:
            continue
        sha, parents, author, email, ts, deco, subject = fields[:7]
        commits.append({
            "sha": sha,
            "parents": parents.split() if parents else [],
            "author": author,
            "email": email,
            "timestamp": int(ts),
            "subject": subject,
            "refs": _parse_decorations(deco),
        })
    return {"commits": commits[:limit], "hasMore": len(commits) > limit}


@router.get("/refs")
def refs(cwd: str = Query(...)) -> dict[str, Any]:
    root = _repo_root(cwd)
    out = _text(_run_git(root, [
        "for-each-ref",
        "--format=%(refname)%1f%(objectname)%1f%(*objectname)%1f%(upstream:short)%1f%(HEAD)",
        "refs/heads", "refs/remotes", "refs/tags",
    ]))
    branches: list[dict[str, Any]] = []
    remotes: list[dict[str, Any]] = []
    tags: list[dict[str, Any]] = []
    for line in out.splitlines():
        fields = line.split("\x1f")
        if len(fields) < 5:
            continue
        refname, oid, peeled, upstream, head = fields[:5]
        sha = peeled or oid  # annotated tags peel to the tagged commit
        if refname.startswith("refs/heads/"):
            branches.append({
                "name": refname[len("refs/heads/"):],
                "sha": oid,
                "current": head == "*",
                "upstream": upstream or None,
            })
        elif refname.startswith("refs/remotes/"):
            name = refname[len("refs/remotes/"):]
            if name.endswith("/HEAD"):
                continue
            remotes.append({"name": name, "sha": oid})
        elif refname.startswith("refs/tags/"):
            tags.append({"name": refname[len("refs/tags/"):], "sha": sha})
    return {"branches": branches, "remotes": remotes, "tags": tags}


@router.get("/commit")
def commit(cwd: str = Query(...), sha: str = Query(...)) -> dict[str, Any]:
    root = _repo_root(cwd)
    sha = _valid_sha(sha)
    show = _try_git(root, [
        "show", "-s", "-z",
        "--format=%H%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%cn%x1f%ce%x1f%ct%x1f%s%x1f%b",
        sha,
    ])
    if show is None:
        raise _err(404, "not_found", f"unknown commit: {sha}")
    fields = _text(show).rstrip("\x00").split("\x1f")
    if len(fields) < 10:
        raise _err(500, "git_failed", "unexpected git show output")
    full, parents_field, an, ae, at, cn, ce, ct, subject, body = fields[:10]
    parents = parents_field.split() if parents_field else []

    files = _parse_name_status(_diff_tree(root, sha, parents, ["--name-status"]))
    stats = _parse_numstat(_diff_tree(root, sha, parents, ["--numstat"]))
    for entry in files:
        adds, dels = stats.get(entry["path"], (None, None))
        entry["additions"] = adds
        entry["deletions"] = dels

    return {
        "sha": full,
        "parents": parents,
        "author": {"name": an, "email": ae, "timestamp": int(at)},
        "committer": {"name": cn, "email": ce, "timestamp": int(ct)},
        "subject": subject,
        "body": body.strip(),
        "files": files,
    }


@router.get("/diff")
def diff(cwd: str = Query(...), sha: str = Query(...), path: str = Query(...)) -> dict[str, Any]:
    """Unified diff of one file against the commit's first parent (root commit:
    against the empty tree). Renames resolve with ``-M`` so the rename header
    renders."""
    root = _repo_root(cwd)
    sha = _valid_sha(sha)
    path = _valid_path(path)
    header = _try_git(root, ["show", "-s", "--format=%P", sha])
    if header is None:
        raise _err(404, "not_found", f"unknown commit: {sha}")
    parents = _text(header).split()

    if parents:
        args = ["diff", "--no-ext-diff", "--no-textconv", "-M", parents[0], sha, "--", path]
    else:
        args = ["diff-tree", "--no-ext-diff", "--no-textconv", "--root", "-r", "-p", "-M", "--no-commit-id", sha, "--", path]
    proc = _run_git(root, args)
    raw = proc.stdout
    binary = b"Binary files" in raw or b"GIT binary patch" in raw
    truncated = len(raw) > _DIFF_CAP_BYTES
    if truncated:
        raw = raw[:_DIFF_CAP_BYTES]
    return {
        "diff": raw.decode("utf-8", "replace"),
        "truncated": truncated,
        "binary": binary,
    }
