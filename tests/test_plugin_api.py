# SPDX-FileCopyrightText: 2026 Miguel Euraque
# SPDX-License-Identifier: MIT

"""End-to-end tests for dashboard/plugin_api.py against a real git repo."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "dashboard"))

import plugin_api  # noqa: E402

app = FastAPI()
app.include_router(plugin_api.router)
client = TestClient(app)


def git(repo: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", "-c", "user.name=Tester", "-c", "user.email=t@example.com",
         "-c", "core.quotepath=off", *args],
        cwd=repo, capture_output=True, text=True, check=True,
    )
    return proc.stdout.strip()


def write(repo: Path, name: str, content: bytes | str) -> None:
    path = repo / name
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(content, bytes):
        path.write_bytes(content)
    else:
        path.write_text(content)


@pytest.fixture()
def repo(tmp_path: Path) -> Path:
    r = tmp_path / "proj"
    r.mkdir()
    git(r, "init", "-b", "main")

    # c1 on main: a.txt, obsolete.txt
    write(r, "a.txt", "alpha\n")
    write(r, "obsolete.txt", "old\n")
    git(r, "add", "-A")
    git(r, "commit", "-m", "initial commit")
    c1 = git(r, "rev-parse", "HEAD")
    git(r, "tag", "v0.1")  # lightweight tag on c1
    git(r, "update-ref", "refs/remotes/origin/main", c1)  # a remote ref without a remote

    # feature branch: two commits
    git(r, "checkout", "-b", "feature")
    write(r, "feat.txt", "feat one\n")
    git(r, "add", "-A")
    git(r, "commit", "-m", "feature one")
    write(r, "a.txt", "alpha feature edit\n")
    git(r, "add", "-A")
    git(r, "commit", "-m", "feature two")

    # unmerged branch off c1
    git(r, "checkout", "-b", "unmerged", c1)
    write(r, "solo.txt", "solo\n")
    git(r, "add", "-A")
    git(r, "commit", "-m", "unmerged work")

    # main: rename a.txt->moved.txt (a.txt has the feature edit in the merge;
    # do the rename after merging so the rename is detected cleanly)
    git(r, "checkout", "main")
    git(r, "merge", "--no-ff", "-m", "merge feature", "feature")
    git(r, "mv", "a.txt", "moved.txt")
    git(r, "rm", "-q", "obsolete.txt")
    write(r, "bin.dat", b"\x00\x01\x02\x00\xff binary\x00")
    git(r, "add", "-A")
    git(r, "commit", "-m", "rename, delete and binary")
    git(r, "tag", "-a", "-m", "release", "v1.0")  # annotated tag on HEAD
    return r


@pytest.fixture()
def empty_repo(tmp_path: Path) -> Path:
    r = tmp_path / "empty"
    r.mkdir()
    git(r, "init", "-b", "main")
    return r


def detail(resp) -> dict:
    body = resp.json()["detail"]
    assert isinstance(body, dict) and "code" in body
    return body


# --- /repo ------------------------------------------------------------------


def test_repo_not_a_repo(tmp_path: Path):
    resp = client.get("/repo", params={"cwd": str(tmp_path)})
    assert resp.status_code == 200
    assert resp.json()["isRepo"] is False


def test_repo_empty(empty_repo: Path):
    body = client.get("/repo", params={"cwd": str(empty_repo)}).json()
    assert body["isRepo"] is True
    assert body["root"] == str(empty_repo)
    assert body["head"] is None and body["branch"] == "main"
    assert body["detached"] is False and body["empty"] is True
    assert body["refsHash"]


def test_repo_summary(repo: Path):
    body = client.get("/repo", params={"cwd": str(repo)}).json()
    assert body["isRepo"] is True
    assert body["root"] == str(repo)
    assert body["name"] == "proj"
    assert body["branch"] == "main"
    assert body["detached"] is False
    assert body["empty"] is False
    assert len(body["head"]) == 40


def test_repo_from_subdir(repo: Path):
    sub = repo / "deep" / "nested"
    sub.mkdir(parents=True)
    body = client.get("/repo", params={"cwd": str(sub)}).json()
    assert body["isRepo"] is True and body["root"] == str(repo)


def test_repo_refs_hash_changes_on_commit(repo: Path):
    first = client.get("/repo", params={"cwd": str(repo)}).json()["refsHash"]
    again = client.get("/repo", params={"cwd": str(repo)}).json()["refsHash"]
    assert first and first == again
    write(repo, "another.txt", "more\n")
    git(repo, "add", "-A")
    git(repo, "commit", "-m", "another")
    after = client.get("/repo", params={"cwd": str(repo)}).json()["refsHash"]
    assert after != first


def test_repo_refs_hash_changes_on_branch_switch(repo: Path):
    first = client.get("/repo", params={"cwd": str(repo)}).json()["refsHash"]
    git(repo, "checkout", "feature")
    after = client.get("/repo", params={"cwd": str(repo)}).json()["refsHash"]
    assert after != first
    git(repo, "checkout", "main")


# --- /graph -----------------------------------------------------------------


def test_graph_commits_and_refs(repo: Path):
    body = client.get("/graph", params={"cwd": str(repo)}).json()
    commits = body["commits"]
    assert len(commits) == 6  # c1, 2 feature, 1 unmerged, merge, rename/bin commit
    assert commits[0]["subject"] == "rename, delete and binary"
    merge = next(c for c in commits if c["subject"] == "merge feature")
    assert len(merge["parents"]) == 2

    top = commits[0]
    names = {(r["type"], r["name"]): r for r in top["refs"]}
    assert ("head", "HEAD") in names and names[("head", "HEAD")]["current"] is True
    assert ("branch", "main") in names and names[("branch", "main")]["current"] is True
    assert ("tag", "v1.0") in names

    c1 = next(c for c in commits if c["subject"] == "initial commit")
    c1_names = {(r["type"], r["name"]) for r in c1["refs"]}
    assert ("tag", "v0.1") in c1_names
    assert ("remote", "origin/main") in c1_names


def test_graph_empty_repo(empty_repo: Path):
    body = client.get("/graph", params={"cwd": str(empty_repo)}).json()
    assert body == {"commits": [], "hasMore": False}


def test_graph_pagination(repo: Path):
    page1 = client.get("/graph", params={"cwd": str(repo), "limit": 3}).json()
    assert len(page1["commits"]) == 3 and page1["hasMore"] is True
    page2 = client.get(
        "/graph",
        params={"cwd": str(repo), "limit": 3, "skip": 3},
    ).json()
    assert len(page2["commits"]) == 3 and page2["hasMore"] is False
    page3 = client.get(
        "/graph",
        params={"cwd": str(repo), "limit": 3, "skip": 6},
    ).json()
    assert len(page3["commits"]) == 0 and page3["hasMore"] is False
    seen = {c["sha"] for c in page1["commits"] + page2["commits"]}
    assert len(seen) == 6


def test_graph_not_a_repo(tmp_path: Path):
    resp = client.get("/graph", params={"cwd": str(tmp_path)})
    assert resp.status_code == 404
    assert detail(resp)["code"] == "not_a_repo"


# --- /refs ------------------------------------------------------------------


def test_refs(repo: Path):
    body = client.get("/refs", params={"cwd": str(repo)}).json()
    branches = {b["name"]: b for b in body["branches"]}
    assert set(branches) == {"main", "feature", "unmerged"}
    assert branches["main"]["current"] is True
    assert branches["feature"]["current"] is False
    assert branches["main"]["upstream"] is None
    assert [r["name"] for r in body["remotes"]] == ["origin/main"]

    tags = {t["name"]: t["sha"] for t in body["tags"]}
    assert set(tags) == {"v0.1", "v1.0"}
    c1 = git(repo, "rev-list", "-n", "1", "v0.1")
    head = git(repo, "rev-parse", "HEAD")
    assert tags["v0.1"] == c1
    assert tags["v1.0"] == head  # annotated tag peeled to the commit


# --- /commit ----------------------------------------------------------------


def test_commit_detail(repo: Path):
    head = git(repo, "rev-parse", "HEAD")
    body = client.get("/commit", params={"cwd": str(repo), "sha": head}).json()
    assert body["sha"] == head
    assert body["subject"] == "rename, delete and binary"
    assert body["author"]["name"] == "Tester"
    assert body["committer"]["email"] == "t@example.com"

    files = {f["path"]: f for f in body["files"]}
    assert files["moved.txt"]["status"] == "R"
    assert files["moved.txt"]["oldPath"] == "a.txt"
    assert files["obsolete.txt"]["status"] == "D"
    assert files["bin.dat"]["status"] == "A"
    assert files["bin.dat"]["additions"] is None  # binary
    assert files["bin.dat"]["deletions"] is None
    assert isinstance(files["moved.txt"]["additions"], (int, type(None)))


def test_commit_root(repo: Path):
    root_sha = git(repo, "rev-list", "--max-parents=0", "HEAD").splitlines()[0]
    body = client.get("/commit", params={"cwd": str(repo), "sha": root_sha}).json()
    assert body["parents"] == []
    assert body["subject"] == "initial commit"
    statuses = {f["path"]: f["status"] for f in body["files"]}
    assert statuses == {"a.txt": "A", "obsolete.txt": "A"}


def test_commit_merge_parents(repo: Path):
    merge_sha = git(repo, "rev-list", "--merges", "-n", "1", "HEAD")
    body = client.get("/commit", params={"cwd": str(repo), "sha": merge_sha}).json()
    assert len(body["parents"]) == 2
    # files diffed against the FIRST parent: the feature work landed by the merge
    assert "feat.txt" in {f["path"] for f in body["files"]}


def test_commit_bad_sha(repo: Path):
    resp = client.get("/commit", params={"cwd": str(repo), "sha": "notasha!!"})
    assert resp.status_code == 400
    assert detail(resp)["code"] == "bad_request"


def test_commit_unknown_sha(repo: Path):
    resp = client.get("/commit", params={"cwd": str(repo), "sha": "deadbeef" * 5})
    assert resp.status_code == 404
    assert detail(resp)["code"] == "not_found"


# --- /diff ------------------------------------------------------------------


def test_diff_text_file(repo: Path):
    head = git(repo, "rev-parse", "HEAD")
    body = client.get("/diff", params={"cwd": str(repo), "sha": head, "path": "moved.txt"}).json()
    assert body["binary"] is False
    assert body["truncated"] is False
    assert "rename from" in body["diff"] or "similarity index" in body["diff"] or "+alpha feature edit" in body["diff"]


def test_diff_binary(repo: Path):
    head = git(repo, "rev-parse", "HEAD")
    body = client.get("/diff", params={"cwd": str(repo), "sha": head, "path": "bin.dat"}).json()
    assert body["binary"] is True


def test_diff_root_commit(repo: Path):
    root_sha = git(repo, "rev-list", "--max-parents=0", "HEAD").splitlines()[0]
    body = client.get("/diff", params={"cwd": str(repo), "sha": root_sha, "path": "a.txt"}).json()
    assert "+alpha" in body["diff"]
    assert body["binary"] is False


def test_diff_truncation(repo: Path, monkeypatch):
    monkeypatch.setattr(plugin_api, "_DIFF_CAP_BYTES", 64)
    head = git(repo, "rev-parse", "HEAD")
    body = client.get("/diff", params={"cwd": str(repo), "sha": head, "path": "moved.txt"}).json()
    assert body["truncated"] is True
    assert len(body["diff"]) <= 64


def test_diff_unknown_sha(repo: Path):
    resp = client.get("/diff", params={"cwd": str(repo), "sha": "deadbeef" * 5, "path": "a.txt"})
    assert resp.status_code == 404
    assert detail(resp)["code"] == "not_found"


def test_diff_dash_path_rejected(repo: Path):
    head = git(repo, "rev-parse", "HEAD")
    resp = client.get("/diff", params={"cwd": str(repo), "sha": head, "path": "-foo"})
    assert resp.status_code == 400
    assert detail(resp)["code"] == "bad_request"
