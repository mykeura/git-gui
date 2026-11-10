// desktop-src/index.jsx
import {
  host as host4,
  PALETTE_AREA,
  PANES_AREA,
  ROUTES_AREA,
  SIDEBAR_NAV_AREA,
  usePluginI18n as usePluginI18n6
} from "@hermes/plugin-sdk";

// desktop-src/api.js
var rest = null;
var os = null;
function bindApi(ctx) {
  rest = ctx.rest;
  os = ctx.os;
}
var copyText = (text) => os ? os.writeClipboard(text) : Promise.resolve(false);
function errorBody(err) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const start = message.indexOf("{");
  if (start < 0) return null;
  try {
    const parsed = JSON.parse(message.slice(start));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function normalizeError(err) {
  const status = typeof err?.statusCode === "number" ? err.statusCode : NaN;
  const detail = errorBody(err)?.detail;
  const code = detail && typeof detail === "object" ? detail.code : void 0;
  const message = detail && typeof detail === "object" && detail.message || (typeof detail === "string" ? detail : "") || err?.message || String(err);
  if (status === 404) {
    if (!code) {
      return { kind: "backend_disabled", message };
    }
    return { kind: code === "not_a_repo" || code === "not_found" ? code : "error", message };
  }
  if (code === "git_missing") {
    return { kind: "git_missing", message };
  }
  return { kind: "error", message };
}
function enc(value) {
  return encodeURIComponent(value);
}
async function call(path) {
  try {
    return await rest(path);
  } catch (err) {
    throw normalizeError(err);
  }
}
var getRepo = (cwd) => call(`/repo?cwd=${enc(cwd)}`);
var getGraph = (cwd, skip = 0, limit = 500) => call(`/graph?cwd=${enc(cwd)}&skip=${skip}&limit=${limit}`);
var getCommit = (cwd, sha) => call(`/commit?cwd=${enc(cwd)}&sha=${enc(sha)}`);
var getDiff = (cwd, sha, path) => call(`/diff?cwd=${enc(cwd)}&sha=${enc(sha)}&path=${enc(path)}`);

// desktop-src/i18n.js
var LOCALES = {
  en: {
    "chip.current": (n) => `${n} (HEAD)`,
    "toggle.remotes": "Remote branches",
    "col.refs": "BRANCH / TAG",
    "col.graph": "GRAPH",
    "col.message": "COMMIT MESSAGE",
    "drawer.title": "Commit",
    "drawer.close": "Close",
    "drawer.copySha": "Copy commit hash",
    "drawer.copied": "Copied",
    "drawer.author": "Author",
    "drawer.committer": "Committer",
    "drawer.parents": "Parents",
    "drawer.noSelection": "Select a commit to see its details",
    "drawer.filesChanged": (n) => `${n} file${n === 1 ? "" : "s"} changed`,
    "drawer.pathView": "Path",
    "drawer.treeView": "Tree",
    "drawer.back": "Back",
    "drawer.binary": "Binary file \u2014 no diff to show",
    "drawer.truncated": "Diff truncated at 256 KB",
    "refs.more": (n) => `+${n}`,
    nav: "Git Gui",
    pageTitle: "Git Gui",
    paneTitle: "Git Gui",
    "command.open": "Git Gui: Open",
    "command.refresh": "Git Gui: Refresh",
    refresh: "Refresh",
    openFullView: "Open full view",
    commitCount: (n) => `${n} commit${n === 1 ? "" : "s"}`,
    detached: "detached HEAD",
    emptyRepo: "no commits yet",
    "state.loading": "Loading\u2026",
    "state.noCwd.title": "No working directory",
    "state.noCwd.desc": "Git Gui follows the active session. Start or focus a session with a working directory to see its commit graph.",
    "state.notRepo.title": "Not a git repository",
    "state.notRepo.desc": "The session working directory is not inside a git repository.",
    "state.gitMissing.title": "git is not installed",
    "state.gitMissing.desc": "Git Gui needs the git executable on the backend PATH.",
    "state.backendOff.title": "Backend is disabled",
    "state.backendOff.desc": "The Git Gui backend (Python plugin) is off. Enable it to load the commit graph.",
    "state.backendOff.action": "Enable backend",
    "state.error.title": "Could not load repository",
    "state.retry": "Retry"
  },
  es: {
    "chip.current": (n) => `${n} (HEAD)`,
    "toggle.remotes": "Ramas remotas",
    "col.refs": "RAMA / ETIQUETA",
    "col.graph": "GRAFO",
    "col.message": "MENSAJE DEL COMMIT",
    "drawer.title": "Commit",
    "drawer.close": "Cerrar",
    "drawer.copySha": "Copiar hash del commit",
    "drawer.copied": "Copiado",
    "drawer.author": "Autor",
    "drawer.committer": "Committer",
    "drawer.parents": "Padres",
    "drawer.noSelection": "Selecciona un commit para ver sus detalles",
    "drawer.filesChanged": (n) => `${n} archivo${n === 1 ? "" : "s"} modificado${n === 1 ? "" : "s"}`,
    "drawer.pathView": "Ruta",
    "drawer.treeView": "\xC1rbol",
    "drawer.back": "Volver",
    "drawer.binary": "Archivo binario \u2014 sin diff que mostrar",
    "drawer.truncated": "Diff truncado a 256 KB",
    "refs.more": (n) => `+${n}`,
    nav: "Git Gui",
    pageTitle: "Git Gui",
    paneTitle: "Git Gui",
    "command.open": "Git Gui: Abrir",
    "command.refresh": "Git Gui: Actualizar",
    refresh: "Actualizar",
    openFullView: "Abrir vista completa",
    commitCount: (n) => `${n} commit${n === 1 ? "" : "s"}`,
    detached: "HEAD separado",
    emptyRepo: "sin commits todav\xEDa",
    "state.loading": "Cargando\u2026",
    "state.noCwd.title": "Sin directorio de trabajo",
    "state.noCwd.desc": "Git Gui sigue a la sesi\xF3n activa. Inicia o enfoca una sesi\xF3n con directorio de trabajo para ver su grafo de commits.",
    "state.notRepo.title": "No es un repositorio git",
    "state.notRepo.desc": "El directorio de trabajo de la sesi\xF3n no est\xE1 dentro de un repositorio git.",
    "state.gitMissing.title": "git no est\xE1 instalado",
    "state.gitMissing.desc": "Git Gui necesita el ejecutable git en el PATH del backend.",
    "state.backendOff.title": "El backend est\xE1 desactivado",
    "state.backendOff.desc": "El backend de Git Gui (plugin de Python) est\xE1 desactivado. Act\xEDvalo para cargar el grafo de commits.",
    "state.backendOff.action": "Activar backend",
    "state.error.title": "No se pudo cargar el repositorio",
    "state.retry": "Reintentar"
  },
  fr: {
    "chip.current": (n) => `${n} (HEAD)`,
    "toggle.remotes": "Branches distantes",
    "col.refs": "BRANCHE / \xC9TIQUETTE",
    "col.graph": "GRAPHE",
    "col.message": "MESSAGE DU COMMIT",
    "drawer.title": "Commit",
    "drawer.close": "Fermer",
    "drawer.copySha": "Copier le hash du commit",
    "drawer.copied": "Copi\xE9",
    "drawer.author": "Auteur",
    "drawer.committer": "Committer",
    "drawer.parents": "Parents",
    "drawer.noSelection": "S\xE9lectionnez un commit pour voir ses d\xE9tails",
    "drawer.filesChanged": (n) => `${n} fichier${n === 1 ? "" : "s"} modifi\xE9${n === 1 ? "" : "s"}`,
    "drawer.pathView": "Chemin",
    "drawer.treeView": "Arbre",
    "drawer.back": "Retour",
    "drawer.binary": "Fichier binaire \u2014 pas de diff \xE0 afficher",
    "drawer.truncated": "Diff tronqu\xE9 \xE0 256 Ko",
    "refs.more": (n) => `+${n}`,
    nav: "Git Gui",
    pageTitle: "Git Gui",
    paneTitle: "Git Gui",
    "command.open": "Git Gui : Ouvrir",
    "command.refresh": "Git Gui : Actualiser",
    refresh: "Actualiser",
    openFullView: "Ouvrir la vue compl\xE8te",
    commitCount: (n) => `${n} commit${n === 1 ? "" : "s"}`,
    detached: "HEAD d\xE9tach\xE9e",
    emptyRepo: "aucun commit",
    "state.loading": "Chargement\u2026",
    "state.noCwd.title": "Aucun r\xE9pertoire de travail",
    "state.noCwd.desc": "Git Gui suit la session active. D\xE9marrez ou s\xE9lectionnez une session avec un r\xE9pertoire de travail pour voir son graphe de commits.",
    "state.notRepo.title": "Pas un d\xE9p\xF4t git",
    "state.notRepo.desc": "Le r\xE9pertoire de travail de la session n\u2019est pas dans un d\xE9p\xF4t git.",
    "state.gitMissing.title": "git n\u2019est pas install\xE9",
    "state.gitMissing.desc": "Git Gui a besoin de l\u2019ex\xE9cutable git dans le PATH du backend.",
    "state.backendOff.title": "Le backend est d\xE9sactiv\xE9",
    "state.backendOff.desc": "Le backend de Git Gui (plugin Python) est d\xE9sactiv\xE9. Activez-le pour charger le graphe de commits.",
    "state.backendOff.action": "Activer le backend",
    "state.error.title": "Impossible de charger le d\xE9p\xF4t",
    "state.retry": "R\xE9essayer"
  },
  de: {
    "chip.current": (n) => `${n} (HEAD)`,
    "toggle.remotes": "Remote-Branches",
    "col.refs": "BRANCH / TAG",
    "col.graph": "GRAPH",
    "col.message": "COMMIT-NACHRICHT",
    "drawer.title": "Commit",
    "drawer.close": "Schlie\xDFen",
    "drawer.copySha": "Commit-Hash kopieren",
    "drawer.copied": "Kopiert",
    "drawer.author": "Autor",
    "drawer.committer": "Committer",
    "drawer.parents": "Eltern",
    "drawer.noSelection": "W\xE4hle einen Commit, um Details zu sehen",
    "drawer.filesChanged": (n) => `${n} ge\xE4nderte Datei${n === 1 ? "" : "en"}`,
    "drawer.pathView": "Pfad",
    "drawer.treeView": "Baum",
    "drawer.back": "Zur\xFCck",
    "drawer.binary": "Bin\xE4rdatei \u2014 kein Diff verf\xFCgbar",
    "drawer.truncated": "Diff auf 256 KB gek\xFCrzt",
    "refs.more": (n) => `+${n}`,
    nav: "Git Gui",
    pageTitle: "Git Gui",
    paneTitle: "Git Gui",
    "command.open": "Git Gui: \xD6ffnen",
    "command.refresh": "Git Gui: Aktualisieren",
    refresh: "Aktualisieren",
    openFullView: "Vollansicht \xF6ffnen",
    commitCount: (n) => `${n} Commit${n === 1 ? "" : "s"}`,
    detached: "losgel\xF6ster HEAD",
    emptyRepo: "noch keine Commits",
    "state.loading": "Laden\u2026",
    "state.noCwd.title": "Kein Arbeitsverzeichnis",
    "state.noCwd.desc": "Git Gui folgt der aktiven Sitzung. Starte oder fokussiere eine Sitzung mit Arbeitsverzeichnis, um den Commit-Graphen zu sehen.",
    "state.notRepo.title": "Kein Git-Repository",
    "state.notRepo.desc": "Das Arbeitsverzeichnis der Sitzung liegt nicht in einem Git-Repository.",
    "state.gitMissing.title": "git ist nicht installiert",
    "state.gitMissing.desc": "Git Gui ben\xF6tigt das git-Programm im PATH des Backends.",
    "state.backendOff.title": "Backend ist deaktiviert",
    "state.backendOff.desc": "Das Git-Gui-Backend (Python-Plugin) ist deaktiviert. Aktiviere es, um den Commit-Graphen zu laden.",
    "state.backendOff.action": "Backend aktivieren",
    "state.error.title": "Repository konnte nicht geladen werden",
    "state.retry": "Wiederholen"
  },
  ru: {
    "chip.current": (n) => `${n} (HEAD)`,
    "toggle.remotes": "\u0423\u0434\u0430\u043B\u0451\u043D\u043D\u044B\u0435 \u0432\u0435\u0442\u043A\u0438",
    "col.refs": "\u0412\u0415\u0422\u041A\u0410 / \u0422\u0415\u0413",
    "col.graph": "\u0413\u0420\u0410\u0424",
    "col.message": "\u0421\u041E\u041E\u0411\u0429\u0415\u041D\u0418\u0415 \u041A\u041E\u041C\u041C\u0418\u0422\u0410",
    "drawer.title": "\u041A\u043E\u043C\u043C\u0438\u0442",
    "drawer.close": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
    "drawer.copySha": "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0445\u0435\u0448 \u043A\u043E\u043C\u043C\u0438\u0442\u0430",
    "drawer.copied": "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E",
    "drawer.author": "\u0410\u0432\u0442\u043E\u0440",
    "drawer.committer": "\u041A\u043E\u043C\u043C\u0438\u0442\u0435\u0440",
    "drawer.parents": "\u0420\u043E\u0434\u0438\u0442\u0435\u043B\u0438",
    "drawer.noSelection": "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u043E\u043C\u043C\u0438\u0442, \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u0434\u0435\u0442\u0430\u043B\u0438",
    "drawer.filesChanged": (n) => {
      const r = new Intl.PluralRules("ru").select(n);
      return `${n} ${r === "one" ? "\u0444\u0430\u0439\u043B \u0438\u0437\u043C\u0435\u043D\u0451\u043D" : r === "few" ? "\u0444\u0430\u0439\u043B\u0430 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u043E" : "\u0444\u0430\u0439\u043B\u043E\u0432 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u043E"}`;
    },
    "drawer.pathView": "\u041F\u0443\u0442\u044C",
    "drawer.treeView": "\u0414\u0435\u0440\u0435\u0432\u043E",
    "drawer.back": "\u041D\u0430\u0437\u0430\u0434",
    "drawer.binary": "\u0414\u0432\u043E\u0438\u0447\u043D\u044B\u0439 \u0444\u0430\u0439\u043B \u2014 diff \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D",
    "drawer.truncated": "Diff \u043E\u0431\u0440\u0435\u0437\u0430\u043D \u0434\u043E 256 \u041A\u0411",
    "refs.more": (n) => `+${n}`,
    nav: "Git Gui",
    pageTitle: "Git Gui",
    paneTitle: "Git Gui",
    "command.open": "Git Gui: \u041E\u0442\u043A\u0440\u044B\u0442\u044C",
    "command.refresh": "Git Gui: \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C",
    refresh: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C",
    openFullView: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u043E\u043B\u043D\u044B\u0439 \u0432\u0438\u0434",
    commitCount: (n) => {
      const m10 = n % 10;
      const m100 = n % 100;
      const f = m10 === 1 && m100 !== 11 ? "" : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? "\u0430" : "\u043E\u0432";
      return `${n} \u043A\u043E\u043C\u043C\u0438\u0442${f}`;
    },
    detached: "\u043E\u0442\u0434\u0435\u043B\u0451\u043D\u043D\u044B\u0439 HEAD",
    emptyRepo: "\u043A\u043E\u043C\u043C\u0438\u0442\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442",
    "state.loading": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026",
    "state.noCwd.title": "\u041D\u0435\u0442 \u0440\u0430\u0431\u043E\u0447\u0435\u0433\u043E \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430",
    "state.noCwd.desc": "Git Gui \u0441\u043B\u0435\u0434\u0443\u0435\u0442 \u0437\u0430 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0435\u0439. \u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0438\u043B\u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0435\u0441\u0441\u0438\u044E \u0441 \u0440\u0430\u0431\u043E\u0447\u0438\u043C \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u043E\u043C, \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u0433\u0440\u0430\u0444 \u043A\u043E\u043C\u043C\u0438\u0442\u043E\u0432.",
    "state.notRepo.title": "\u042D\u0442\u043E \u043D\u0435 git-\u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439",
    "state.notRepo.desc": "\u0420\u0430\u0431\u043E\u0447\u0438\u0439 \u043A\u0430\u0442\u0430\u043B\u043E\u0433 \u0441\u0435\u0441\u0441\u0438\u0438 \u043D\u0435 \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0432\u043D\u0443\u0442\u0440\u0438 git-\u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F.",
    "state.gitMissing.title": "git \u043D\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D",
    "state.gitMissing.desc": "Git Gui \u043D\u0443\u0436\u0435\u043D \u0438\u0441\u043F\u043E\u043B\u043D\u044F\u0435\u043C\u044B\u0439 \u0444\u0430\u0439\u043B git \u0432 PATH \u0431\u044D\u043A\u0435\u043D\u0434\u0430.",
    "state.backendOff.title": "\u0411\u044D\u043A\u0435\u043D\u0434 \u043E\u0442\u043A\u043B\u044E\u0447\u0451\u043D",
    "state.backendOff.desc": "\u0411\u044D\u043A\u0435\u043D\u0434 Git Gui (Python-\u043F\u043B\u0430\u0433\u0438\u043D) \u043E\u0442\u043A\u043B\u044E\u0447\u0451\u043D. \u0412\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0435\u0433\u043E, \u0447\u0442\u043E\u0431\u044B \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0433\u0440\u0430\u0444 \u043A\u043E\u043C\u043C\u0438\u0442\u043E\u0432.",
    "state.backendOff.action": "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0431\u044D\u043A\u0435\u043D\u0434",
    "state.error.title": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439",
    "state.retry": "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C"
  },
  ja: {
    "chip.current": (n) => `${n} (HEAD)`,
    "toggle.remotes": "\u30EA\u30E2\u30FC\u30C8\u30D6\u30E9\u30F3\u30C1",
    "col.refs": "\u30D6\u30E9\u30F3\u30C1 / \u30BF\u30B0",
    "col.graph": "\u30B0\u30E9\u30D5",
    "col.message": "\u30B3\u30DF\u30C3\u30C8\u30E1\u30C3\u30BB\u30FC\u30B8",
    "drawer.title": "\u30B3\u30DF\u30C3\u30C8",
    "drawer.close": "\u9589\u3058\u308B",
    "drawer.copySha": "\u30B3\u30DF\u30C3\u30C8\u30CF\u30C3\u30B7\u30E5\u3092\u30B3\u30D4\u30FC",
    "drawer.copied": "\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F",
    "drawer.author": "\u4F5C\u6210\u8005",
    "drawer.committer": "\u30B3\u30DF\u30C3\u30BF\u30FC",
    "drawer.parents": "\u89AA",
    "drawer.noSelection": "\u30B3\u30DF\u30C3\u30C8\u3092\u9078\u629E\u3059\u308B\u3068\u8A73\u7D30\u304C\u8868\u793A\u3055\u308C\u307E\u3059",
    "drawer.filesChanged": (n) => `${n} \u4EF6\u306E\u30D5\u30A1\u30A4\u30EB\u304C\u5909\u66F4`,
    "drawer.pathView": "\u30D1\u30B9",
    "drawer.treeView": "\u30C4\u30EA\u30FC",
    "drawer.back": "\u623B\u308B",
    "drawer.binary": "\u30D0\u30A4\u30CA\u30EA\u30D5\u30A1\u30A4\u30EB \u2014 diff \u306F\u3042\u308A\u307E\u305B\u3093",
    "drawer.truncated": "diff \u306F 256 KB \u3067\u5207\u308A\u6368\u3066\u3089\u308C\u307E\u3057\u305F",
    "refs.more": (n) => `+${n}`,
    nav: "Git Gui",
    pageTitle: "Git Gui",
    paneTitle: "Git Gui",
    "command.open": "Git Gui: \u958B\u304F",
    "command.refresh": "Git Gui: \u66F4\u65B0",
    refresh: "\u66F4\u65B0",
    openFullView: "\u30D5\u30EB\u30D3\u30E5\u30FC\u3092\u958B\u304F",
    commitCount: (n) => `${n} \u4EF6\u306E\u30B3\u30DF\u30C3\u30C8`,
    detached: "detached HEAD",
    emptyRepo: "\u30B3\u30DF\u30C3\u30C8\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093",
    "state.loading": "\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026",
    "state.noCwd.title": "\u4F5C\u696D\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u304C\u3042\u308A\u307E\u305B\u3093",
    "state.noCwd.desc": "Git Gui \u306F\u30A2\u30AF\u30C6\u30A3\u30D6\u306A\u30BB\u30C3\u30B7\u30E7\u30F3\u306B\u8FFD\u5F93\u3057\u307E\u3059\u3002\u4F5C\u696D\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306E\u3042\u308B\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u958B\u59CB\u307E\u305F\u306F\u30D5\u30A9\u30FC\u30AB\u30B9\u3059\u308B\u3068\u30B3\u30DF\u30C3\u30C8\u30B0\u30E9\u30D5\u304C\u8868\u793A\u3055\u308C\u307E\u3059\u3002",
    "state.notRepo.title": "git \u30EA\u30DD\u30B8\u30C8\u30EA\u3067\u306F\u3042\u308A\u307E\u305B\u3093",
    "state.notRepo.desc": "\u30BB\u30C3\u30B7\u30E7\u30F3\u306E\u4F5C\u696D\u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u306F git \u30EA\u30DD\u30B8\u30C8\u30EA\u5185\u306B\u3042\u308A\u307E\u305B\u3093\u3002",
    "state.gitMissing.title": "git \u304C\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
    "state.gitMissing.desc": "Git Gui \u306B\u306F\u30D0\u30C3\u30AF\u30A8\u30F3\u30C9\u306E PATH \u4E0A\u306E git \u5B9F\u884C\u30D5\u30A1\u30A4\u30EB\u304C\u5FC5\u8981\u3067\u3059\u3002",
    "state.backendOff.title": "\u30D0\u30C3\u30AF\u30A8\u30F3\u30C9\u304C\u7121\u52B9\u3067\u3059",
    "state.backendOff.desc": "Git Gui \u306E\u30D0\u30C3\u30AF\u30A8\u30F3\u30C9\uFF08Python \u30D7\u30E9\u30B0\u30A4\u30F3\uFF09\u304C\u7121\u52B9\u306B\u306A\u3063\u3066\u3044\u307E\u3059\u3002\u6709\u52B9\u306B\u3059\u308B\u3068\u30B3\u30DF\u30C3\u30C8\u30B0\u30E9\u30D5\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u3059\u3002",
    "state.backendOff.action": "\u30D0\u30C3\u30AF\u30A8\u30F3\u30C9\u3092\u6709\u52B9\u5316",
    "state.error.title": "\u30EA\u30DD\u30B8\u30C8\u30EA\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F",
    "state.retry": "\u518D\u8A66\u884C"
  },
  zh: {
    "chip.current": (n) => `${n} (HEAD)`,
    "toggle.remotes": "\u8FDC\u7A0B\u5206\u652F",
    "col.refs": "\u5206\u652F / \u6807\u7B7E",
    "col.graph": "\u56FE\u8C31",
    "col.message": "\u63D0\u4EA4\u4FE1\u606F",
    "drawer.title": "\u63D0\u4EA4",
    "drawer.close": "\u5173\u95ED",
    "drawer.copySha": "\u590D\u5236\u63D0\u4EA4\u54C8\u5E0C",
    "drawer.copied": "\u5DF2\u590D\u5236",
    "drawer.author": "\u4F5C\u8005",
    "drawer.committer": "\u63D0\u4EA4\u8005",
    "drawer.parents": "\u7236\u8282\u70B9",
    "drawer.noSelection": "\u9009\u62E9\u4E00\u4E2A\u63D0\u4EA4\u4EE5\u67E5\u770B\u8BE6\u60C5",
    "drawer.filesChanged": (n) => `\u66F4\u6539\u4E86 ${n} \u4E2A\u6587\u4EF6`,
    "drawer.pathView": "\u8DEF\u5F84",
    "drawer.treeView": "\u6811",
    "drawer.back": "\u8FD4\u56DE",
    "drawer.binary": "\u4E8C\u8FDB\u5236\u6587\u4EF6\u2014\u65E0\u53EF\u663E\u793A\u7684\u5DEE\u5F02",
    "drawer.truncated": "\u5DEE\u5F02\u5DF2\u622A\u65AD\u81F3 256 KB",
    "refs.more": (n) => `+${n}`,
    nav: "Git Gui",
    pageTitle: "Git Gui",
    paneTitle: "Git Gui",
    "command.open": "Git Gui\uFF1A\u6253\u5F00",
    "command.refresh": "Git Gui\uFF1A\u5237\u65B0",
    refresh: "\u5237\u65B0",
    openFullView: "\u6253\u5F00\u5B8C\u6574\u89C6\u56FE",
    commitCount: (n) => `${n} \u4E2A\u63D0\u4EA4`,
    detached: "\u5206\u79BB\u7684 HEAD",
    emptyRepo: "\u5C1A\u65E0\u63D0\u4EA4",
    "state.loading": "\u52A0\u8F7D\u4E2D\u2026",
    "state.noCwd.title": "\u6CA1\u6709\u5DE5\u4F5C\u76EE\u5F55",
    "state.noCwd.desc": "Git Gui \u8DDF\u968F\u5F53\u524D\u4F1A\u8BDD\u3002\u542F\u52A8\u6216\u805A\u7126\u4E00\u4E2A\u5E26\u6709\u5DE5\u4F5C\u76EE\u5F55\u7684\u4F1A\u8BDD\u5373\u53EF\u67E5\u770B\u5176\u63D0\u4EA4\u56FE\u3002",
    "state.notRepo.title": "\u4E0D\u662F git \u4ED3\u5E93",
    "state.notRepo.desc": "\u4F1A\u8BDD\u7684\u5DE5\u4F5C\u76EE\u5F55\u4E0D\u5728 git \u4ED3\u5E93\u4E2D\u3002",
    "state.gitMissing.title": "\u672A\u5B89\u88C5 git",
    "state.gitMissing.desc": "Git Gui \u9700\u8981\u540E\u7AEF PATH \u4E2D\u7684 git \u53EF\u6267\u884C\u6587\u4EF6\u3002",
    "state.backendOff.title": "\u540E\u7AEF\u5DF2\u7981\u7528",
    "state.backendOff.desc": "Git Gui \u7684\u540E\u7AEF\uFF08Python \u63D2\u4EF6\uFF09\u5DF2\u7981\u7528\u3002\u542F\u7528\u540E\u5373\u53EF\u52A0\u8F7D\u63D0\u4EA4\u56FE\u3002",
    "state.backendOff.action": "\u542F\u7528\u540E\u7AEF",
    "state.error.title": "\u65E0\u6CD5\u52A0\u8F7D\u4ED3\u5E93",
    "state.retry": "\u91CD\u8BD5"
  },
  "zh-hant": {
    "chip.current": (n) => `${n} (HEAD)`,
    "toggle.remotes": "\u9060\u7A0B\u5206\u652F",
    "col.refs": "\u5206\u652F / \u6A19\u7C64",
    "col.graph": "\u5716\u8B9C",
    "col.message": "\u63D0\u4EA4\u8A0A\u606F",
    "drawer.title": "\u63D0\u4EA4",
    "drawer.close": "\u95DC\u9589",
    "drawer.copySha": "\u8907\u88FD\u63D0\u4EA4\u96DC\u6E4A",
    "drawer.copied": "\u5DF2\u8907\u88FD",
    "drawer.author": "\u4F5C\u8005",
    "drawer.committer": "\u63D0\u4EA4\u8005",
    "drawer.parents": "\u7236\u7BC0\u9EDE",
    "drawer.noSelection": "\u9078\u64C7\u4E00\u500B\u63D0\u4EA4\u4EE5\u6AA2\u8996\u8A73\u60C5",
    "drawer.filesChanged": (n) => `\u8B8A\u66F4\u4E86 ${n} \u500B\u6A94\u6848`,
    "drawer.pathView": "\u8DEF\u5F91",
    "drawer.treeView": "\u6A39",
    "drawer.back": "\u8FD4\u56DE",
    "drawer.binary": "\u4E8C\u9032\u4F4D\u6A94\u6848\u2014\u7121\u53EF\u986F\u793A\u7684\u5DEE\u7570",
    "drawer.truncated": "\u5DEE\u7570\u5DF2\u622A\u65B7\u81F3 256 KB",
    "refs.more": (n) => `+${n}`,
    nav: "Git Gui",
    pageTitle: "Git Gui",
    paneTitle: "Git Gui",
    "command.open": "Git Gui\uFF1A\u958B\u555F",
    "command.refresh": "Git Gui\uFF1A\u91CD\u65B0\u6574\u7406",
    refresh: "\u91CD\u65B0\u6574\u7406",
    openFullView: "\u958B\u555F\u5B8C\u6574\u6AA2\u8996",
    commitCount: (n) => `${n} \u500B\u63D0\u4EA4`,
    detached: "\u5206\u96E2\u7684 HEAD",
    emptyRepo: "\u5C1A\u7121\u63D0\u4EA4",
    "state.loading": "\u8F09\u5165\u4E2D\u2026",
    "state.noCwd.title": "\u6C92\u6709\u5DE5\u4F5C\u76EE\u9304",
    "state.noCwd.desc": "Git Gui \u8DDF\u96A8\u76EE\u524D\u5DE5\u4F5C\u968E\u6BB5\u3002\u555F\u52D5\u6216\u805A\u7126\u4E00\u500B\u5E36\u6709\u5DE5\u4F5C\u76EE\u9304\u7684\u5DE5\u4F5C\u968E\u6BB5\u5373\u53EF\u6AA2\u8996\u5176\u63D0\u4EA4\u5716\u3002",
    "state.notRepo.title": "\u4E0D\u662F git \u5132\u5B58\u5EAB",
    "state.notRepo.desc": "\u5DE5\u4F5C\u968E\u6BB5\u7684\u5DE5\u4F5C\u76EE\u9304\u4E0D\u5728 git \u5132\u5B58\u5EAB\u4E2D\u3002",
    "state.gitMissing.title": "\u672A\u5B89\u88DD git",
    "state.gitMissing.desc": "Git Gui \u9700\u8981\u5F8C\u7AEF PATH \u4E2D\u7684 git \u53EF\u57F7\u884C\u6A94\u3002",
    "state.backendOff.title": "\u5F8C\u7AEF\u5DF2\u505C\u7528",
    "state.backendOff.desc": "Git Gui \u7684\u5F8C\u7AEF\uFF08Python \u5916\u639B\uFF09\u5DF2\u505C\u7528\u3002\u555F\u7528\u5F8C\u5373\u53EF\u8F09\u5165\u63D0\u4EA4\u5716\u3002",
    "state.backendOff.action": "\u555F\u7528\u5F8C\u7AEF",
    "state.error.title": "\u7121\u6CD5\u8F09\u5165\u5132\u5B58\u5EAB",
    "state.retry": "\u91CD\u8A66"
  },
  ar: {
    "chip.current": (n) => `${n} (HEAD)`,
    "toggle.remotes": "\u0627\u0644\u0641\u0631\u0648\u0639 \u0627\u0644\u0628\u0639\u064A\u062F\u0629",
    "col.refs": "\u0641\u0631\u0639 / \u0648\u0633\u0645",
    "col.graph": "\u0645\u062E\u0637\u0637",
    "col.message": "\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645",
    "drawer.title": "\u0627\u0644\u062A\u0632\u0627\u0645",
    "drawer.close": "\u0625\u063A\u0644\u0627\u0642",
    "drawer.copySha": "\u0646\u0633\u062E \u0628\u0627\u0634\u0629 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645",
    "drawer.copied": "\u062A\u0645 \u0627\u0644\u0646\u0633\u062E",
    "drawer.author": "\u0627\u0644\u0645\u0624\u0644\u0641",
    "drawer.committer": "\u0627\u0644\u0645\u064F\u0644\u062A\u0632\u0650\u0645",
    "drawer.parents": "\u0627\u0644\u0622\u0628\u0627\u0621",
    "drawer.noSelection": "\u0627\u062E\u062A\u0631 \u0627\u0644\u062A\u0632\u0627\u0645\u0627\u064B \u0644\u0639\u0631\u0636 \u062A\u0641\u0627\u0635\u064A\u0644\u0647",
    "drawer.filesChanged": (n) => {
      const r = new Intl.PluralRules("ar").select(n);
      return r === "zero" ? "\u0644\u0627 \u0645\u0644\u0641\u0627\u062A \u0645\u0639\u062F\u0644\u0629" : r === "one" ? "\u0645\u0644\u0641 \u0648\u0627\u062D\u062F \u0645\u0639\u062F\u0644" : r === "two" ? "\u0645\u0644\u0641\u0627\u0646 \u0645\u0639\u062F\u0644\u0627\u0646" : `${n} \u0645\u0644\u0641\u0627\u062A \u0645\u0639\u062F\u0644\u0629`;
    },
    "drawer.pathView": "\u0645\u0633\u0627\u0631",
    "drawer.treeView": "\u0634\u062C\u0631\u0629",
    "drawer.back": "\u0631\u062C\u0648\u0639",
    "drawer.binary": "\u0645\u0644\u0641 \u062B\u0646\u0627\u0626\u064A \u2014 \u0644\u0627 diff \u0644\u0644\u0639\u0631\u0636",
    "drawer.truncated": "\u062A\u0645 \u0627\u0642\u062A\u0637\u0627\u0639 diff \u0639\u0646\u062F 256 \u0643\u064A\u0644\u0648\u0628\u0627\u064A\u062A",
    "refs.more": (n) => `+${n}`,
    nav: "Git Gui",
    pageTitle: "Git Gui",
    paneTitle: "Git Gui",
    "command.open": "Git Gui: \u0641\u062A\u062D",
    "command.refresh": "Git Gui: \u062A\u062D\u062F\u064A\u062B",
    refresh: "\u062A\u062D\u062F\u064A\u062B",
    openFullView: "\u0641\u062A\u062D \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0643\u0627\u0645\u0644",
    commitCount: (n) => `${n} \u0645\u0646 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A`,
    detached: "HEAD \u0645\u0646\u0641\u0635\u0644",
    emptyRepo: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A \u0628\u0639\u062F",
    "state.loading": "\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u062D\u0645\u064A\u0644\u2026",
    "state.noCwd.title": "\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u062C\u0644\u062F \u0639\u0645\u0644",
    "state.noCwd.desc": "\u064A\u062A\u0628\u0639 Git Gui \u0627\u0644\u062C\u0644\u0633\u0629 \u0627\u0644\u0646\u0634\u0637\u0629. \u0627\u0628\u062F\u0623 \u062C\u0644\u0633\u0629 \u0644\u0647\u0627 \u0645\u062C\u0644\u062F \u0639\u0645\u0644 \u0623\u0648 \u0631\u0643\u0651\u0632 \u0639\u0644\u064A\u0647\u0627 \u0644\u0639\u0631\u0636 \u0645\u062E\u0637\u0637 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A.",
    "state.notRepo.title": "\u0644\u064A\u0633 \u0645\u0633\u062A\u0648\u062F\u0639 git",
    "state.notRepo.desc": "\u0645\u062C\u0644\u062F \u0639\u0645\u0644 \u0627\u0644\u062C\u0644\u0633\u0629 \u0644\u064A\u0633 \u062F\u0627\u062E\u0644 \u0645\u0633\u062A\u0648\u062F\u0639 git.",
    "state.gitMissing.title": "git \u063A\u064A\u0631 \u0645\u062B\u0628\u062A",
    "state.gitMissing.desc": "\u064A\u062D\u062A\u0627\u062C Git Gui \u0625\u0644\u0649 \u0645\u0644\u0641 git \u0627\u0644\u062A\u0646\u0641\u064A\u0630\u064A \u0641\u064A PATH \u0627\u0644\u062E\u0644\u0641\u064A\u0629.",
    "state.backendOff.title": "\u0627\u0644\u062E\u0644\u0641\u064A\u0629 \u0645\u0639\u0637\u0644\u0629",
    "state.backendOff.desc": "\u062E\u0644\u0641\u064A\u0629 Git Gui (\u0625\u0636\u0627\u0641\u0629 \u0628\u0627\u064A\u062B\u0648\u0646) \u0645\u0639\u0637\u0644\u0629. \u0641\u0639\u0651\u0644\u0647\u0627 \u0644\u062A\u062D\u0645\u064A\u0644 \u0645\u062E\u0637\u0637 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A.",
    "state.backendOff.action": "\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062E\u0644\u0641\u064A\u0629",
    "state.error.title": "\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0648\u062F\u0639",
    "state.retry": "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629"
  }
};

// desktop-src/page.jsx
import { useCallback as useCallback3, useEffect as useEffect3, useMemo as useMemo3, useRef as useRef3 } from "react";
import {
  Codicon as Codicon4,
  relativeTime,
  Tip as Tip4,
  useI18n as useI18n2,
  usePluginI18n as usePluginI18n5,
  useValue as useValue4
} from "@hermes/plugin-sdk";

// desktop-src/chips.jsx
import { Codicon, Tip } from "@hermes/plugin-sdk";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function buildChips(refs, showRemotes) {
  const branches = refs.filter((r) => r.type === "branch");
  const current = branches.find((b) => b.current);
  const detached = refs.some((r) => r.type === "head" && r.current) && !current;
  const remotes = refs.filter((r) => r.type === "remote");
  const tags = refs.filter((r) => r.type === "tag");
  const chips = [];
  if (detached) chips.push({ key: "head", name: "HEAD", icons: ["git-commit"], head: true });
  const ordered = current ? [current, ...branches.filter((b) => b !== current)] : branches;
  const localNames = new Set(ordered.map((b) => b.name));
  const byLocal = /* @__PURE__ */ new Map();
  for (const b of ordered) {
    const chip = { key: `b:${b.name}`, name: b.name, icons: ["git-branch"], current: Boolean(b.current) };
    chips.push(chip);
    byLocal.set(b.name, chip);
  }
  for (const r of remotes) {
    const local = r.name.split("/").slice(1).join("/");
    if (localNames.has(local)) {
      byLocal.get(local).icons.push("cloud");
    } else if (showRemotes) {
      chips.push({ key: `r:${r.name}`, name: r.name, icons: ["cloud"], remote: true });
    }
  }
  for (const tg of tags) chips.push({ key: `t:${tg.name}`, name: tg.name, icons: ["tag"], tag: true });
  return chips;
}
function RefChips({ refs, color, t, showRemotes = true, max = 3 }) {
  const chips = buildChips(refs, showRemotes);
  if (!chips.length) return null;
  const shown = chips.slice(0, max);
  const rest2 = chips.slice(max);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    shown.map((c) => /* @__PURE__ */ jsxs(
      "span",
      {
        className: `gg-chip${c.current ? " gg-chip-current" : ""}${c.remote ? " gg-chip-remote" : ""}`,
        style: { "--gg-chip-color": color },
        title: c.current ? t("chip.current", c.name) : c.name,
        children: [
          c.icons.map((ic) => /* @__PURE__ */ jsx(Codicon, { name: ic, size: "0.7rem" }, ic)),
          /* @__PURE__ */ jsx("bdi", { className: "gg-chip-name", children: c.name }),
          c.current ? /* @__PURE__ */ jsx(Codicon, { name: "check", size: "0.7rem" }) : null
        ]
      },
      c.key
    )),
    rest2.length ? /* @__PURE__ */ jsx(Tip, { label: rest2.map((c) => c.name).join(", "), children: /* @__PURE__ */ jsx("span", { className: "gg-chip gg-chip-more", children: t("refs.more", rest2.length) }) }) : null
  ] });
}

// desktop-src/detail-drawer.jsx
import { useMemo, useState } from "react";
import {
  Codicon as Codicon2,
  GlyphSpinner,
  Tip as Tip2,
  useI18n,
  usePluginI18n,
  useQuery,
  useValue
} from "@hermes/plugin-sdk";

// desktop-src/store.js
import { atom } from "@hermes/plugin-sdk";
var $selectedSha = atom(null);
var $drawerOpen = atom(false);
var $colWidths = atom({ refs: 220, graph: null, drawer: 380 });
var $fileView = atom("path");
var $showRemotes = atom(true);
var $drawerView = atom("files");
var storage = null;
var PERSIST = {
  colWidths: $colWidths,
  fileView: $fileView,
  showRemotes: $showRemotes
};
function bindStorage(ctx) {
  storage = ctx.storage;
  for (const [key, a] of Object.entries(PERSIST)) {
    const v = storage.get(`${key}`);
    if (v !== void 0 && v !== null) a.set(v);
  }
}
function persist(key, value) {
  storage?.set(`${key}`, value);
}
var setDrawerOpen = (open) => {
  $drawerOpen.set(open);
  persist("drawerOpen", open);
};
var setFileView = (view) => {
  $fileView.set(view);
  persist("fileView", view);
};
var setShowRemotes = (v) => {
  $showRemotes.set(v);
  persist("showRemotes", v);
};
var setColWidth = (col, px) => {
  $colWidths.set({ ...$colWidths.get(), [col]: px });
  persist("colWidths", $colWidths.get());
};
var selectCommit = (sha) => {
  $selectedSha.set(sha);
  $drawerView.set("files");
  if (sha) setDrawerOpen(true);
};
var $scrollToSha = atom(null);
var scrollToCommit = (sha) => {
  selectCommit(sha);
  $scrollToSha.set(sha);
};

// desktop-src/detail-drawer.jsx
import { Fragment as Fragment2, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var short = (sha) => sha.slice(0, 8);
var STATUS_LABEL = { A: "added", M: "modified", D: "deleted", R: "renamed", C: "copied", T: "type-changed" };
function PersonLine({ label, person, locale, t }) {
  if (!person) return null;
  return /* @__PURE__ */ jsxs2("div", { className: "gg-meta-row", children: [
    /* @__PURE__ */ jsx2("span", { className: "gg-meta-label", children: label }),
    /* @__PURE__ */ jsxs2("span", { className: "gg-meta-value", children: [
      /* @__PURE__ */ jsx2("bdi", { children: person.name }),
      " ",
      /* @__PURE__ */ jsxs2("span", { className: "gg-file-dir", children: [
        "<",
        /* @__PURE__ */ jsx2("bdi", { children: person.email }),
        ">"
      ] }),
      " \xB7 ",
      new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(person.timestamp * 1e3)
    ] })
  ] });
}
function FileRow({ file, depth, onOpen }) {
  const slash = file.path.lastIndexOf("/");
  const dir = slash >= 0 ? file.path.slice(0, slash + 1) : "";
  const base = slash >= 0 ? file.path.slice(slash + 1) : file.path;
  return /* @__PURE__ */ jsxs2("div", { className: "gg-file", onClick: () => onOpen(file), role: "button", tabIndex: -1, children: [
    depth ? /* @__PURE__ */ jsx2("span", { className: "gg-tree-indent", style: { width: depth * 12 } }) : null,
    /* @__PURE__ */ jsx2("span", { className: `gg-file-status gg-file-status-${file.status}`, title: STATUS_LABEL[file.status] ?? file.status, children: file.status }),
    /* @__PURE__ */ jsxs2("span", { className: "gg-file-path", title: file.oldPath ? `${file.oldPath} \u2192 ${file.path}` : file.path, children: [
      file.oldPath ? /* @__PURE__ */ jsxs2(Fragment2, { children: [
        /* @__PURE__ */ jsx2("span", { className: "gg-file-dir", children: file.oldPath }),
        " \u2192 "
      ] }) : null,
      /* @__PURE__ */ jsxs2("bdi", { children: [
        /* @__PURE__ */ jsx2("span", { className: "gg-file-dir", children: dir }),
        base
      ] })
    ] }),
    /* @__PURE__ */ jsxs2("span", { className: "gg-file-stats", children: [
      file.additions === null ? "\u2014" : /* @__PURE__ */ jsxs2("span", { className: "gg-file-add", children: [
        "+",
        file.additions
      ] }),
      " ",
      file.deletions === null ? "" : /* @__PURE__ */ jsxs2("span", { className: "gg-file-del", children: [
        "\u2212",
        file.deletions
      ] })
    ] })
  ] });
}
function treeRows(files) {
  const root = { dirs: /* @__PURE__ */ new Map(), files: [] };
  for (const f of files) {
    const parts = f.path.split("/");
    let node = root;
    for (const d of parts.slice(0, -1)) {
      if (!node.dirs.has(d)) node.dirs.set(d, { dirs: /* @__PURE__ */ new Map(), files: [] });
      node = node.dirs.get(d);
    }
    node.files.push(f);
  }
  const rows = [];
  const walk = (node, depth) => {
    for (const name of [...node.dirs.keys()].sort()) {
      rows.push({ dir: name, depth });
      walk(node.dirs.get(name), depth + 1);
    }
    for (const f of node.files) rows.push({ file: f, depth });
  };
  walk(root, 0);
  return rows;
}
function DiffView({ cwd, sha, path }) {
  const t = usePluginI18n("git-gui");
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["git-gui", "diff", cwd, sha, path],
    queryFn: () => getDiff(cwd, sha, path)
  });
  if (isPending) {
    return /* @__PURE__ */ jsx2("div", { className: "gg-gate", children: /* @__PURE__ */ jsx2(GlyphSpinner, {}) });
  }
  if (isError) {
    return /* @__PURE__ */ jsxs2("div", { className: "gg-diff-notice", children: [
      error?.message || t("state.error.title"),
      " ",
      /* @__PURE__ */ jsx2("button", { className: "gg-parent-link", onClick: () => refetch(), type: "button", children: t("state.retry") })
    ] });
  }
  if (data.binary) {
    return /* @__PURE__ */ jsx2("div", { className: "gg-diff-notice", children: t("drawer.binary") });
  }
  const lines = (data.diff || "").split("\n");
  return /* @__PURE__ */ jsxs2("div", { className: "gg-diff", children: [
    data.truncated ? /* @__PURE__ */ jsx2("div", { className: "gg-diff-notice", children: t("drawer.truncated") }) : null,
    lines.map((line, i) => {
      const cls = line.startsWith("+++") || line.startsWith("---") ? "gg-diff-meta" : line.startsWith("+") ? "gg-diff-add" : line.startsWith("-") ? "gg-diff-del" : line.startsWith("@@") ? "gg-diff-hunk" : line.startsWith("diff ") || line.startsWith("index ") || line.startsWith("similarity") || line.startsWith("rename") || line.startsWith("new file") || line.startsWith("deleted") || line.startsWith("old mode") || line.startsWith("new mode") ? "gg-diff-meta" : "";
      return /* @__PURE__ */ jsx2("div", { className: `gg-diff-line ${cls}`, children: line || " " }, i);
    })
  ] });
}
function DetailDrawer({ cwd }) {
  const t = usePluginI18n("git-gui");
  const { locale } = useI18n();
  const sha = useValue($selectedSha);
  const open = useValue($drawerOpen);
  const view = useValue($drawerView);
  const fileView = useValue($fileView);
  const [copied, setCopied] = useState(false);
  const { data: commit, isPending, isError, error, refetch } = useQuery({
    queryKey: ["git-gui", "commit", cwd, sha],
    queryFn: () => getCommit(cwd, sha),
    enabled: Boolean(sha)
  });
  const rows = useMemo(
    () => commit && fileView === "tree" ? treeRows(commit.files) : null,
    [commit, fileView]
  );
  let body;
  if (!sha) {
    body = /* @__PURE__ */ jsx2("div", { className: "gg-diff-notice", children: t("drawer.noSelection") });
  } else if (view !== "files") {
    body = /* @__PURE__ */ jsxs2(Fragment2, { children: [
      /* @__PURE__ */ jsxs2("button", { className: "gg-parent-link", onClick: () => $drawerView.set("files"), type: "button", children: [
        "\u2190 ",
        t("drawer.back")
      ] }),
      /* @__PURE__ */ jsx2(DiffView, { cwd, sha, path: view.diff })
    ] });
  } else if (isPending) {
    body = /* @__PURE__ */ jsx2("div", { className: "gg-gate", children: /* @__PURE__ */ jsx2(GlyphSpinner, {}) });
  } else if (isError) {
    body = /* @__PURE__ */ jsxs2("div", { className: "gg-diff-notice", children: [
      error?.message || t("state.error.title"),
      " ",
      /* @__PURE__ */ jsx2("button", { className: "gg-parent-link", onClick: () => refetch(), type: "button", children: t("state.retry") })
    ] });
  } else {
    const files = commit.files ?? [];
    const adds = files.reduce((s, f) => s + (f.additions ?? 0), 0);
    const dels = files.reduce((s, f) => s + (f.deletions ?? 0), 0);
    const samePerson = commit.author.name === commit.committer.name && commit.author.email === commit.committer.email && commit.author.timestamp === commit.committer.timestamp;
    body = /* @__PURE__ */ jsxs2(Fragment2, { children: [
      /* @__PURE__ */ jsx2("div", { className: "gg-subject", children: commit.subject }),
      commit.body ? /* @__PURE__ */ jsx2("div", { className: "gg-bodytext", children: commit.body }) : null,
      /* @__PURE__ */ jsxs2("div", { className: "gg-meta", children: [
        /* @__PURE__ */ jsx2(PersonLine, { label: t("drawer.author"), person: commit.author, locale, t }),
        samePerson ? null : /* @__PURE__ */ jsx2(PersonLine, { label: t("drawer.committer"), person: commit.committer, locale, t }),
        commit.parents.length ? /* @__PURE__ */ jsxs2("div", { className: "gg-meta-row", children: [
          /* @__PURE__ */ jsx2("span", { className: "gg-meta-label", children: t("drawer.parents") }),
          /* @__PURE__ */ jsx2("span", { className: "gg-parents", children: commit.parents.map((p) => /* @__PURE__ */ jsx2("button", { className: "gg-parent-link", onClick: () => scrollToCommit(p), type: "button", children: /* @__PURE__ */ jsx2("bdi", { children: short(p) }) }, p)) })
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxs2("div", { className: "gg-files-head", children: [
        /* @__PURE__ */ jsxs2("span", { className: "gg-files-count", children: [
          t("drawer.filesChanged", files.length),
          adds || dels ? ` \xB7 ` : "",
          adds ? /* @__PURE__ */ jsxs2("span", { className: "gg-file-add", children: [
            "+",
            adds
          ] }) : "",
          dels ? /* @__PURE__ */ jsxs2("span", { className: "gg-file-del", children: [
            " \u2212",
            dels
          ] }) : ""
        ] }),
        /* @__PURE__ */ jsxs2("span", { className: "gg-view-toggle", children: [
          /* @__PURE__ */ jsx2(
            "button",
            {
              className: `gg-view-btn${fileView === "path" ? " gg-view-btn-on" : ""}`,
              onClick: () => setFileView("path"),
              type: "button",
              children: t("drawer.pathView")
            }
          ),
          /* @__PURE__ */ jsx2(
            "button",
            {
              className: `gg-view-btn${fileView === "tree" ? " gg-view-btn-on" : ""}`,
              onClick: () => setFileView("tree"),
              type: "button",
              children: t("drawer.treeView")
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx2("div", { children: fileView === "path" ? files.map((f) => /* @__PURE__ */ jsx2(FileRow, { file: f, onOpen: (f2) => $drawerView.set({ diff: f2.path }) }, f.path)) : rows.map(
        (r, i) => r.dir ? /* @__PURE__ */ jsxs2("div", { className: "gg-file gg-file-dir", children: [
          /* @__PURE__ */ jsx2("span", { className: "gg-tree-indent", style: { width: r.depth * 12 } }),
          /* @__PURE__ */ jsx2(Codicon2, { name: "folder", size: "0.75rem" }),
          " ",
          r.dir
        ] }, `d${i}`) : /* @__PURE__ */ jsx2(FileRow, { file: r.file, depth: r.depth, onOpen: (f) => $drawerView.set({ diff: f.path }) }, r.file.path)
      ) })
    ] });
  }
  return /* @__PURE__ */ jsxs2("div", { className: "gg-drawer", style: { width: "var(--gg-drawer-w, 380px)" }, children: [
    /* @__PURE__ */ jsxs2("div", { className: "gg-drawer-head", children: [
      /* @__PURE__ */ jsxs2("span", { className: "gg-drawer-title", children: [
        sha ? `${t("drawer.title")} ` : t("drawer.title"),
        sha ? /* @__PURE__ */ jsx2("span", { className: "gg-sha", children: /* @__PURE__ */ jsx2("bdi", { children: short(sha) }) }) : null
      ] }),
      sha ? /* @__PURE__ */ jsx2(Tip2, { label: copied ? t("drawer.copied") : t("drawer.copySha"), children: /* @__PURE__ */ jsx2(
        "button",
        {
          className: "gg-icon-btn",
          onClick: () => copyText(sha).then((ok) => {
            if (ok !== false) {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }
          }),
          type: "button",
          children: /* @__PURE__ */ jsx2(Codicon2, { name: copied ? "check" : "copy", size: "0.8rem" })
        }
      ) }) : null,
      /* @__PURE__ */ jsx2(Tip2, { label: t("drawer.close"), children: /* @__PURE__ */ jsx2("button", { className: "gg-icon-btn", onClick: () => setDrawerOpen(false), type: "button", children: /* @__PURE__ */ jsx2(Codicon2, { name: "chevron-right", size: "0.8rem" }) }) })
    ] }),
    /* @__PURE__ */ jsx2("div", { className: "gg-drawer-body", children: body })
  ] });
}

// desktop-src/gate.jsx
import { Button, EmptyState, GlyphSpinner as GlyphSpinner2, host, usePluginI18n as usePluginI18n2 } from "@hermes/plugin-sdk";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function repoStatus(cwd, repoQuery) {
  if (!cwd) return "no-cwd";
  if (repoQuery.isPending) return "loading";
  if (repoQuery.isError) return repoQuery.error?.kind ?? "error";
  if (!repoQuery.data?.isRepo) return "not_a_repo";
  return "ok";
}
function BackendGate({ status, message, onRetry, children }) {
  const t = usePluginI18n2("git-gui");
  if (status === "ok") return children;
  if (status === "loading") {
    return /* @__PURE__ */ jsx3("div", { className: "gg-gate", children: /* @__PURE__ */ jsx3(GlyphSpinner2, {}) });
  }
  const copy = {
    "no-cwd": ["state.noCwd.title", "state.noCwd.desc"],
    not_a_repo: ["state.notRepo.title", "state.notRepo.desc"],
    git_missing: ["state.gitMissing.title", "state.gitMissing.desc"],
    backend_disabled: ["state.backendOff.title", "state.backendOff.desc"],
    error: ["state.error.title", ""],
    not_found: ["state.error.title", ""]
  }[status] ?? ["state.error.title", ""];
  const action = status === "backend_disabled" ? /* @__PURE__ */ jsx3(
    Button,
    {
      onClick: () => host.request("plugins.manage", { action: "toggle", key: "git-gui", enable: true }).then(() => onRetry?.()).catch(() => onRetry?.()),
      size: "sm",
      type: "button",
      children: t("state.backendOff.action")
    }
  ) : status === "error" || status === "not_found" || status === "git_missing" ? /* @__PURE__ */ jsx3(Button, { onClick: () => onRetry?.(), size: "sm", type: "button", variant: "outline", children: t("state.retry") }) : null;
  return /* @__PURE__ */ jsx3("div", { className: "gg-gate", children: /* @__PURE__ */ jsxs3("div", { className: "gg-gate-inner", children: [
    /* @__PURE__ */ jsx3(EmptyState, { title: t(copy[0]), description: copy[1] ? t(copy[1]) : message }),
    action ? /* @__PURE__ */ jsx3("div", { children: action }) : null
  ] }) });
}

// desktop-src/graph.jsx
import { useCallback, useEffect, useRef, useState as useState2 } from "react";
import { PROFILE_SWATCHES } from "@hermes/plugin-sdk";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var LANE_W = 14;
var ROW_H = 28;
var PAD_X = 6;
var laneColor = (i) => PROFILE_SWATCHES[(i + 8) % PROFILE_SWATCHES.length];
var graphWidth = (maxLanes) => PAD_X * 2 + Math.max(1, maxLanes) * LANE_W;
var laneX = (lane, laneW) => PAD_X + lane * laneW + laneW / 2;
function GraphCell({ row, rowHeight = ROW_H, laneWidth = LANE_W, lanes, hasRefs = false, dotR }) {
  const w = PAD_X * 2 + Math.max(1, lanes) * laneWidth;
  const mid = rowHeight / 2;
  const color = laneColor(row.color);
  const x = (l) => laneX(l, laneWidth);
  const parts = [];
  for (const e of row.edges) {
    const stroke = laneColor(e.color);
    if (e.type === "pass") {
      parts.push(
        /* @__PURE__ */ jsx4("line", { x1: x(e.lane), y1: 0, x2: x(e.lane), y2: rowHeight, stroke, strokeWidth: 2 }, `p${e.lane}`)
      );
    } else if (e.type === "in") {
      const x1 = x(e.fromLane);
      const x2 = x(row.lane);
      parts.push(
        e.fromLane === row.lane ? /* @__PURE__ */ jsx4("line", { x1, y1: 0, x2, y2: mid, stroke, strokeWidth: 2 }, `i${e.fromLane}`) : /* @__PURE__ */ jsx4("path", { d: `M ${x1} 0 C ${x1} ${mid}, ${x2} 0, ${x2} ${mid}`, stroke, strokeWidth: 2, fill: "none" }, `i${e.fromLane}`)
      );
    } else {
      const x1 = x(row.lane);
      const x2 = x(e.toLane);
      parts.push(
        e.toLane === row.lane ? /* @__PURE__ */ jsx4("line", { x1, y1: mid, x2, y2: rowHeight, stroke, strokeWidth: 2 }, `o${e.toLane}`) : /* @__PURE__ */ jsx4("path", { d: `M ${x1} ${mid} C ${x1} ${rowHeight}, ${x2} ${mid}, ${x2} ${rowHeight}`, stroke, strokeWidth: 2, fill: "none" }, `o${e.toLane}`)
      );
    }
  }
  const r = dotR ?? (rowHeight >= 28 ? 4.5 : 3.5);
  const dot = row.isMerge ? /* @__PURE__ */ jsx4("circle", { cx: x(row.lane), cy: mid, r, fill: "var(--ui-bg-editor)", stroke: color, strokeWidth: 2 }) : /* @__PURE__ */ jsx4("circle", { cx: x(row.lane), cy: mid, r, fill: color });
  return /* @__PURE__ */ jsxs4("svg", { className: "gg-cell-graph", width: w, height: rowHeight, "aria-hidden": "true", children: [
    hasRefs ? /* @__PURE__ */ jsx4("line", { x1: 0, y1: mid, x2: x(row.lane) - r - 2, y2: mid, stroke: color, strokeWidth: 1, opacity: 0.5 }) : null,
    parts,
    dot,
    row.isHead ? /* @__PURE__ */ jsx4("circle", { cx: x(row.lane), cy: mid, r: r + 3, fill: "none", stroke: color, strokeWidth: 1.5, opacity: 0.55 }) : null
  ] });
}
function useWindowing({ count, rowHeight, overscan = 10, endPad = 200, onNearEnd }) {
  const [el, setEl] = useState2(null);
  const [view, setView] = useState2({ top: 0, height: 600 });
  const onNearEndRef = useRef(onNearEnd);
  onNearEndRef.current = onNearEnd;
  useEffect(() => {
    if (!el) return;
    setView({ top: el.scrollTop, height: el.clientHeight });
    const ro = new ResizeObserver(() => {
      setView((v) => v.height === el.clientHeight ? v : { ...v, height: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  const start = Math.max(0, Math.floor(view.top / rowHeight) - overscan);
  const end = Math.min(count, Math.ceil((view.top + view.height) / rowHeight) + overscan);
  useEffect(() => {
    if (count && end >= count - endPad) onNearEndRef.current?.();
  }, [count, end, endPad]);
  const onScroll = useCallback((e) => {
    const top = e.currentTarget.scrollTop;
    setView((v) => v.top === top ? v : { ...v, top });
  }, []);
  const scrollToRow = useCallback((i) => {
    el?.scrollTo({ top: Math.max(0, i * rowHeight - 120) });
  }, [el, rowHeight]);
  return { ref: setEl, start, end, onScroll, scrollToRow, totalHeight: count * rowHeight };
}

// desktop-src/lanes.js
var PALETTE_SIZE = 12;
var cache = /* @__PURE__ */ new WeakMap();
function layoutGraph(commits, { primary } = {}) {
  if (cache.has(commits)) return cache.get(commits);
  const result = compute(commits, primary);
  cache.set(commits, result);
  return result;
}
function resolvePrimary(commits) {
  const seen = /* @__PURE__ */ new Set();
  let current = null;
  for (const c of commits) {
    for (const r of c.refs ?? []) {
      if (r.type !== "branch") continue;
      seen.add(r.name);
      if (r.current && !current) current = r.name;
    }
  }
  for (const name of ["main", "master", "trunk", "develop"]) {
    if (seen.has(name)) return name;
  }
  return current;
}
function compute(commits, primary) {
  const bySha = new Map(commits.map((c, i) => [c.sha, i]));
  const primaryShas = /* @__PURE__ */ new Set();
  const primaryName = primary ?? resolvePrimary(commits);
  if (primaryName) {
    let sha = commits.find(
      (c) => c.refs?.some((r) => r.type === "branch" && r.name === primaryName)
    )?.sha;
    for (let guard = 0; sha && guard <= commits.length; guard++) {
      const i = bySha.get(sha);
      if (i === void 0) break;
      primaryShas.add(sha);
      sha = commits[i].parents?.[0];
    }
  }
  const active = [];
  const expect = /* @__PURE__ */ new Map();
  const colorCount = new Array(PALETTE_SIZE).fill(0);
  const lastUsed = new Array(PALETTE_SIZE).fill(0);
  let clock = 0;
  const expectAdd = (sha, lane) => {
    const l = expect.get(sha);
    if (l) l.push(lane);
    else expect.set(sha, [lane]);
  };
  const expectDel = (sha, lane) => {
    const l = expect.get(sha);
    if (!l) return;
    const i = l.indexOf(lane);
    if (i >= 0) l.splice(i, 1);
    if (!l.length) expect.delete(sha);
  };
  const setActive = (lane, entry) => {
    const prev = active[lane];
    if (prev) {
      expectDel(prev.sha, lane);
      colorCount[prev.color]--;
    }
    active[lane] = entry;
    if (entry) {
      expectAdd(entry.sha, lane);
      colorCount[entry.color]++;
    }
  };
  const CANDIDATES = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const ORDER = [6, 3, 9, 4, 8, 2, 10, 5, 7];
  const ringDist = (a, b) => Math.min(Math.abs(a - b), PALETTE_SIZE - Math.abs(a - b));
  const newColor = () => {
    const busy = [0];
    for (const e of active) if (e && !busy.includes(e.color)) busy.push(e.color);
    const pick = (minDist) => {
      let best2 = -1;
      for (const i of ORDER) {
        if (!CANDIDATES.includes(i) || colorCount[i]) continue;
        let d = PALETTE_SIZE;
        for (const b of busy) {
          const r = ringDist(i, b);
          if (r < d) d = r;
        }
        if (d < minDist) continue;
        if (best2 < 0 || lastUsed[i] < lastUsed[best2]) best2 = i;
      }
      return best2;
    };
    const lru = (pool) => {
      let best2 = -1;
      for (const i of pool) if (best2 < 0 || lastUsed[i] < lastUsed[best2]) best2 = i;
      return best2;
    };
    let best = pick(2);
    if (best < 0) best = pick(1);
    if (best < 0) best = lru(ORDER.filter((i) => !colorCount[i]));
    if (best < 0) best = lru(ORDER);
    lastUsed[best] = ++clock;
    return best;
  };
  const freeLane = () => {
    for (let l = 1; l < active.length; l++) if (!active[l]) return l;
    if (!active.length) active.push(null);
    active.push(null);
    return active.length - 1;
  };
  const rows = [];
  let maxLanes = 0;
  for (const c of commits) {
    const isPrimary = primaryShas.has(c.sha);
    const expecting = (expect.get(c.sha) ?? []).filter((l) => isPrimary || l > 0);
    const edges = [];
    let lane;
    if (isPrimary && !expecting.includes(0)) {
      lane = 0;
    } else if (expecting.length) {
      lane = expecting[0];
    } else {
      lane = isPrimary ? 0 : freeLane();
      if (!active[lane] || active[lane].sha !== c.sha) {
        setActive(lane, { sha: c.sha, color: isPrimary ? 0 : newColor() });
      }
    }
    const color = isPrimary ? 0 : active[lane]?.color ?? newColor();
    const consumed = /* @__PURE__ */ new Set([lane]);
    for (const l of expecting) {
      if (l === lane) continue;
      edges.push({ type: "in", fromLane: l, lane, color: active[l].color });
      setActive(l, null);
      consumed.add(l);
    }
    if (expecting.includes(lane)) {
      edges.push({ type: "in", fromLane: lane, lane, color });
    }
    const parents = c.parents ?? [];
    if (parents.length) {
      setActive(lane, { sha: parents[0], color });
      edges.push({ type: "out", toLane: lane, lane, color });
      for (const p of parents.slice(1)) {
        const pPrimary = primaryShas.has(p);
        let toLane;
        if (pPrimary) {
          toLane = 0;
        } else {
          const lanes = expect.get(p) ?? [];
          toLane = lanes.find((l) => l > 0);
          if (toLane === void 0) {
            toLane = freeLane();
            setActive(toLane, { sha: p, color: newColor() });
          }
        }
        edges.push({ type: "out", toLane, lane, color: pPrimary ? 0 : active[toLane].color });
        consumed.add(toLane);
      }
    } else {
      setActive(lane, null);
    }
    for (let l = 0; l < active.length; l++) {
      if (active[l] && !consumed.has(l)) {
        edges.push({ type: "pass", lane: l, color: active[l].color });
      }
    }
    while (active.length && !active[active.length - 1]) active.pop();
    maxLanes = Math.max(maxLanes, active.length);
    rows.push({
      lane,
      color,
      isMerge: parents.length > 1,
      isHead: Boolean(c.refs?.some((r) => r.type === "head" && r.current)),
      edges
    });
  }
  return { rows, maxLanes };
}

// desktop-src/pane.jsx
import { useMemo as useMemo2 } from "react";
import {
  Codicon as Codicon3,
  host as host3,
  queryClient,
  Tip as Tip3,
  usePluginI18n as usePluginI18n4,
  useValue as useValue3
} from "@hermes/plugin-sdk";

// desktop-src/repo.jsx
import { useCallback as useCallback2, useEffect as useEffect2, useRef as useRef2, useState as useState3 } from "react";
import { host as host2, usePluginI18n as usePluginI18n3, useQuery as useQuery2, useValue as useValue2 } from "@hermes/plugin-sdk";
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
var PAGE = 500;
function useRepo(cwd) {
  return useQuery2({
    queryKey: ["git-gui", "repo", cwd],
    queryFn: () => getRepo(cwd),
    enabled: Boolean(cwd),
    refetchInterval: 15e3,
    refetchOnWindowFocus: true
  });
}
var EMPTY = { commits: [], hasMore: false, loading: true, loadingMore: false, error: null };
function useCommitGraph(cwd, enabled, refsHash) {
  const [state, setState] = useState3(EMPTY);
  const gen = useRef2(0);
  const busy = useRef2(false);
  const len = useRef2(0);
  len.current = state.commits.length;
  useEffect2(() => {
    const g = ++gen.current;
    busy.current = false;
    if (!cwd || !enabled) {
      setState(EMPTY);
      return;
    }
    setState(EMPTY);
    getGraph(cwd, 0, PAGE).then(
      (d) => gen.current === g && setState({ commits: d.commits, hasMore: d.hasMore, loading: false, loadingMore: false, error: null }),
      (e) => gen.current === g && setState({ ...EMPTY, loading: false, error: e })
    );
  }, [cwd, enabled, refsHash]);
  const loadMore = useCallback2(() => {
    if (busy.current) return;
    const g = gen.current;
    busy.current = true;
    setState((s) => s.hasMore ? { ...s, loadingMore: true } : s);
    getGraph(cwd, len.current, PAGE).then(
      (d) => {
        busy.current = false;
        if (gen.current !== g) return;
        setState((s) => ({
          commits: [...s.commits, ...d.commits],
          hasMore: d.hasMore,
          loading: false,
          loadingMore: false,
          error: null
        }));
      },
      (e) => {
        busy.current = false;
        if (gen.current !== g) return;
        setState((s) => ({ ...s, loadingMore: false, error: e }));
      }
    );
  }, [cwd]);
  return { ...state, loadMore };
}
function useGitGui() {
  const cwd = useValue2(host2.state.cwd);
  const repoQuery = useRepo(cwd);
  const status = repoStatus(cwd, repoQuery);
  const repo = repoQuery.data;
  const graph = useCommitGraph(cwd, status === "ok", repo?.refsHash);
  return { cwd, repo, repoQuery, status, graph };
}

// desktop-src/pane.jsx
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
var PANE_ROW_H = 24;
var PANE_LANE_W = 10;
function refreshAll() {
  queryClient.invalidateQueries({ queryKey: ["git-gui"] });
}
function GitGuiPane() {
  const t = usePluginI18n4("git-gui");
  const { repo, repoQuery, status, graph } = useGitGui();
  const showRemotes = useValue3($showRemotes);
  const commits = graph.commits;
  const { rows, maxLanes } = useMemo2(() => layoutGraph(commits), [commits]);
  const windowing = useWindowing({
    count: rows.length,
    rowHeight: PANE_ROW_H,
    onNearEnd: () => graph.hasMore && !graph.loadingMore && graph.loadMore()
  });
  const open = (sha) => {
    selectCommit(sha);
    $scrollToSha.set(sha);
    host3.navigate("/git-gui");
  };
  return /* @__PURE__ */ jsxs6("div", { className: "gg-pane", children: [
    /* @__PURE__ */ jsxs6("div", { className: "gg-pane-head", children: [
      /* @__PURE__ */ jsx6("span", { className: "gg-pane-title", children: repo ? /* @__PURE__ */ jsxs6("bdi", { children: [
        repo.name,
        repo.branch ? ` \xB7 ${repo.branch}` : ""
      ] }) : t("paneTitle") }),
      /* @__PURE__ */ jsx6(Tip3, { label: t("refresh"), children: /* @__PURE__ */ jsx6("button", { className: "gg-icon-btn", onClick: refreshAll, type: "button", children: /* @__PURE__ */ jsx6(Codicon3, { name: "refresh", size: "0.75rem" }) }) }),
      /* @__PURE__ */ jsx6(Tip3, { label: t("openFullView"), children: /* @__PURE__ */ jsx6("button", { className: "gg-icon-btn", onClick: () => host3.navigate("/git-gui"), type: "button", children: /* @__PURE__ */ jsx6(Codicon3, { name: "arrow-right", size: "0.75rem" }) }) })
    ] }),
    /* @__PURE__ */ jsx6(
      BackendGate,
      {
        status,
        message: repoQuery.error?.message,
        onRetry: () => repoQuery.refetch(),
        children: /* @__PURE__ */ jsxs6("div", { className: "gg-pane-body", onScroll: windowing.onScroll, ref: windowing.ref, children: [
          /* @__PURE__ */ jsx6("div", { className: "gg-rows", style: { height: windowing.totalHeight }, children: rows.slice(windowing.start, windowing.end).map((row, vi) => {
            const i = windowing.start + vi;
            const c = commits[i];
            const color = laneColor(row.color);
            return /* @__PURE__ */ jsxs6(
              "div",
              {
                className: "gg-prow",
                onClick: () => open(c.sha),
                style: { top: i * PANE_ROW_H, position: "absolute", insetInlineStart: 0, width: "100%" },
                title: c.subject,
                children: [
                  /* @__PURE__ */ jsx6("div", { className: "gg-prow-graph", style: { maxWidth: "40%" }, children: /* @__PURE__ */ jsx6(
                    GraphCell,
                    {
                      dotR: 3.5,
                      hasRefs: Boolean(c.refs?.length),
                      laneWidth: PANE_LANE_W,
                      lanes: maxLanes,
                      row,
                      rowHeight: PANE_ROW_H
                    }
                  ) }),
                  /* @__PURE__ */ jsx6(RefChips, { max: 1, refs: c.refs ?? [], color, showRemotes, t }),
                  /* @__PURE__ */ jsx6("span", { className: "gg-prow-subject", children: c.subject })
                ]
              },
              c.sha
            );
          }) }),
          graph.loadingMore ? /* @__PURE__ */ jsx6("div", { className: "gg-loading-more", children: t("state.loading") }) : null
        ] })
      }
    )
  ] });
}

// desktop-src/page.jsx
import { Fragment as Fragment3, jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
function Resizer({ onDelta }) {
  return /* @__PURE__ */ jsx7(
    "div",
    {
      className: "gg-resizer",
      onMouseDown: (e) => {
        e.preventDefault();
        const handle = e.currentTarget;
        handle.classList.add("gg-resizer-active");
        const move = (ev) => onDelta(ev.movementX);
        const up = () => {
          handle.classList.remove("gg-resizer-active");
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", up);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
      }
    }
  );
}
var clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function GitGuiPage() {
  const t = usePluginI18n5("git-gui");
  const { locale } = useI18n2();
  const { cwd, repo, repoQuery, status, graph } = useGitGui();
  const selectedSha = useValue4($selectedSha);
  const colWidths = useValue4($colWidths);
  const scrollToSha = useValue4($scrollToSha);
  const showRemotes = useValue4($showRemotes);
  const drawerOpen = useValue4($drawerOpen);
  const commits = graph.commits;
  const { rows, maxLanes } = useMemo3(() => layoutGraph(commits), [commits]);
  const windowing = useWindowing({
    count: rows.length,
    rowHeight: ROW_H,
    onNearEnd: () => graph.hasMore && !graph.loadingMore && graph.loadMore()
  });
  useEffect3(() => {
    if (!scrollToSha) return;
    const i = commits.findIndex((c) => c.sha === scrollToSha);
    if (i >= 0) {
      windowing.scrollToRow(i);
      $scrollToSha.set(null);
    } else if (graph.hasMore && !graph.loadingMore && commits.length < 5e3) {
      graph.loadMore();
    }
  }, [scrollToSha, commits, graph, windowing]);
  const graphW = colWidths.graph ?? graphWidth(maxLanes);
  const onKeyDown = useCallback3(
    (e) => {
      if (!commits.length) return;
      const idx = commits.findIndex((c) => c.sha === selectedSha);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = e.key === "ArrowDown" ? Math.min(commits.length - 1, idx < 0 ? 0 : idx + 1) : Math.max(0, idx < 0 ? 0 : idx - 1);
        selectCommit(commits[next].sha);
        windowing.scrollToRow(next);
      } else if (e.key === "Escape") {
        if ($drawerView.get() !== "files") $drawerView.set("files");
        else setDrawerOpen(false);
      }
    },
    [commits, selectedSha, windowing]
  );
  const visible = rows.slice(windowing.start, windowing.end);
  return /* @__PURE__ */ jsxs7("div", { className: "gg-root", children: [
    /* @__PURE__ */ jsxs7("header", { className: "gg-header", children: [
      /* @__PURE__ */ jsx7(Codicon4, { name: "git-branch", size: "0.9rem" }),
      /* @__PURE__ */ jsx7("span", { className: "gg-header-title", children: repo?.name ?? t("pageTitle") }),
      repo ? /* @__PURE__ */ jsx7("span", { className: "gg-header-branch", children: /* @__PURE__ */ jsx7("bdi", { children: repo.empty ? t("emptyRepo") : repo.branch ?? t("detached") }) }) : null,
      commits.length ? /* @__PURE__ */ jsxs7("span", { className: "gg-header-count", children: [
        t("commitCount", commits.length),
        graph.hasMore ? "+" : ""
      ] }) : null,
      /* @__PURE__ */ jsx7("span", { className: "gg-header-spacer" }),
      /* @__PURE__ */ jsxs7("label", { className: "gg-remote-toggle", title: t("toggle.remotes"), children: [
        /* @__PURE__ */ jsx7(
          "input",
          {
            checked: showRemotes,
            onChange: (e) => setShowRemotes(e.target.checked),
            type: "checkbox"
          }
        ),
        /* @__PURE__ */ jsx7(Codicon4, { name: "cloud", size: "0.8rem" }),
        /* @__PURE__ */ jsx7("span", { children: t("toggle.remotes") })
      ] }),
      /* @__PURE__ */ jsx7(Tip4, { label: t("refresh"), children: /* @__PURE__ */ jsx7("button", { className: "gg-icon-btn", onClick: refreshAll, type: "button", children: /* @__PURE__ */ jsx7(Codicon4, { name: "refresh", size: "0.8rem" }) }) })
    ] }),
    /* @__PURE__ */ jsxs7(
      BackendGate,
      {
        status,
        message: repoQuery.error?.message,
        onRetry: () => repoQuery.refetch(),
        children: [
          /* @__PURE__ */ jsxs7("div", { className: "gg-colheads", children: [
            /* @__PURE__ */ jsx7("div", { className: "gg-colhead", style: { width: colWidths.refs }, children: t("col.refs") }),
            /* @__PURE__ */ jsx7(Resizer, { onDelta: (d) => setColWidth("refs", clamp(colWidths.refs + d, 100, 560)) }),
            /* @__PURE__ */ jsx7("div", { className: "gg-colhead", style: { width: graphW }, children: t("col.graph") }),
            /* @__PURE__ */ jsx7(
              Resizer,
              {
                onDelta: (d) => setColWidth("graph", clamp(graphW + d, graphWidth(1), graphWidth(maxLanes) + 160))
              }
            ),
            /* @__PURE__ */ jsx7("div", { className: "gg-colhead", style: { flex: 1 }, children: t("col.message") })
          ] }),
          /* @__PURE__ */ jsxs7("div", { className: "gg-body", children: [
            /* @__PURE__ */ jsxs7(
              "div",
              {
                className: "gg-scroll",
                onKeyDown,
                onScroll: windowing.onScroll,
                ref: windowing.ref,
                tabIndex: 0,
                children: [
                  /* @__PURE__ */ jsx7("div", { className: "gg-rows", style: { height: windowing.totalHeight }, children: visible.map((row, vi) => {
                    const i = windowing.start + vi;
                    const c = commits[i];
                    const color = laneColor(row.color);
                    const cls = [
                      "gg-row",
                      c.sha === selectedSha ? "gg-row-selected" : "",
                      c.refs?.length ? "gg-row-hasrefs" : ""
                    ].join(" ");
                    return /* @__PURE__ */ jsxs7(
                      "div",
                      {
                        className: cls,
                        onClick: () => selectCommit(c.sha),
                        style: { top: i * ROW_H, height: ROW_H },
                        title: c.subject,
                        children: [
                          /* @__PURE__ */ jsx7("div", { className: "gg-cell gg-cell-refs", style: { width: colWidths.refs }, children: /* @__PURE__ */ jsx7(RefChips, { refs: c.refs ?? [], color, showRemotes, t }) }),
                          /* @__PURE__ */ jsx7("div", { className: "gg-cell", style: { width: graphW }, children: /* @__PURE__ */ jsx7(GraphCell, { hasRefs: Boolean(c.refs?.length), lanes: maxLanes, row }) }),
                          /* @__PURE__ */ jsxs7("div", { className: "gg-cell gg-cell-msg", style: { flex: 1 }, children: [
                            /* @__PURE__ */ jsx7("span", { className: "gg-msg-subject", title: c.subject, children: c.subject }),
                            /* @__PURE__ */ jsxs7("span", { className: "gg-msg-meta", children: [
                              /* @__PURE__ */ jsx7("bdi", { children: c.author }),
                              " \xB7 ",
                              relativeTime(c.timestamp * 1e3, Date.now(), locale)
                            ] })
                          ] })
                        ]
                      },
                      c.sha
                    );
                  }) }),
                  graph.loadingMore ? /* @__PURE__ */ jsx7("div", { className: "gg-loading-more", children: t("state.loading") }) : null
                ]
              }
            ),
            drawerOpen ? /* @__PURE__ */ jsxs7(Fragment3, { children: [
              /* @__PURE__ */ jsx7(Resizer, { onDelta: (d) => setColWidth("drawer", clamp(colWidths.drawer - d, 240, 640)) }),
              /* @__PURE__ */ jsx7("div", { className: "gg-drawer-slot", style: { "--gg-drawer-w": `${colWidths.drawer}px` }, children: /* @__PURE__ */ jsx7(DetailDrawer, { cwd }) })
            ] }) : null
          ] })
        ]
      }
    )
  ] });
}

// desktop-src/styles.css
var styles_default = "/* Git Gui plugin styles \u2014 the plugin's own design language on top of Hermes\n * theme variables only. All classes are `gg-` prefixed and scoped under\n * `.gg-root`; no Tailwind utilities (runtime plugins aren't in core's CSS\n * build). Lane colors come from the SDK's PROFILE_SWATCHES (inline style),\n * not from this file. */\n\n.gg-root {\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n  min-height: 0;\n  overflow: hidden;\n  color: var(--ui-text-primary);\n  font-size: 0.8125rem;\n}\n\n.gg-header {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.375rem 0.75rem;\n  border-bottom: 1px solid var(--ui-stroke-tertiary);\n  flex: none;\n}\n.gg-header-title { font-weight: 600; font-size: 0.8125rem; }\n.gg-header-branch { color: var(--ui-text-secondary); font-size: 0.75rem; }\n.gg-header-count { color: var(--ui-text-tertiary); font-size: 0.75rem; }\n.gg-header-spacer { flex: 1; }\n\n.gg-colheads {\n  display: flex;\n  flex: none;\n  border-bottom: 1px solid var(--ui-stroke-tertiary);\n  color: var(--ui-text-quaternary);\n  font-size: 0.625rem;\n  font-weight: 600;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  user-select: none;\n}\n.gg-colhead {\n  display: flex;\n  align-items: center;\n  padding: 0.25rem 0.5rem;\n  min-width: 0;\n  overflow: hidden;\n  white-space: nowrap;\n}\n\n.gg-body { display: flex; flex: 1; min-height: 0; }\n.gg-scroll { flex: 1; overflow: auto; position: relative; outline: none; }\n.gg-rows { position: relative; }\n\n.gg-row {\n  position: absolute;\n  inset-inline-start: 0;\n  width: 100%;\n  display: flex;\n  align-items: stretch;\n  cursor: default;\n}\n.gg-row:hover { background: var(--ui-row-hover-background); }\n.gg-row-selected,\n.gg-row-selected:hover { background: var(--ui-row-active-background); }\n.gg-row-hasrefs { background: color-mix(in srgb, var(--ui-accent) 3%, transparent); }\n.gg-row-hasrefs:hover { background: color-mix(in srgb, var(--ui-accent) 6%, transparent); }\n\n.gg-cell { display: flex; align-items: center; min-width: 0; overflow: hidden; }\n.gg-cell-refs { gap: 0.25rem; padding-inline: 0.375rem; position: relative; }\n.gg-cell-graph { flex: none; }\n.gg-cell-msg { padding-inline: 0.5rem; gap: 0.5rem; }\n\n.gg-resizer {\n  flex: none;\n  width: 5px;\n  margin-inline-start: -3px;\n  cursor: col-resize;\n  z-index: 2;\n}\n.gg-resizer:hover,\n.gg-resizer-active { background: var(--ui-sash-hover-background); }\n\n.gg-chip {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  max-width: 100%;\n  padding: 0 0.375rem;\n  border-inline-start: 3px solid var(--gg-chip-color, transparent);\n  border-radius: 3px;\n  background: color-mix(in srgb, var(--gg-chip-color, transparent) 14%, transparent);\n  color: var(--ui-text-primary);\n  font-size: 0.6875rem;\n  line-height: 1.25rem;\n  white-space: nowrap;\n  flex: none;\n}\n.gg-chip-name { overflow: hidden; text-overflow: ellipsis; }\n.gg-chip-current { font-weight: 700; }\n.gg-chip-remote { opacity: 0.85; }\n.gg-chip-more {\n  color: var(--ui-text-tertiary);\n  background: var(--ui-bg-tertiary);\n  border-inline-start-color: transparent;\n}\n/* guide line from the last chip to the graph lane */\n.gg-chip-line {\n  position: absolute;\n  inset-inline-end: 0;\n  top: 50%;\n  width: 0.5rem;\n  height: 1px;\n  background: var(--gg-chip-color, transparent);\n  opacity: 0.5;\n}\n\n.gg-msg-subject {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  flex: 1;\n  min-width: 0;\n}\n.gg-msg-meta {\n  flex: none;\n  color: var(--ui-text-tertiary);\n  font-size: 0.75rem;\n  white-space: nowrap;\n}\n\n.gg-loading-more {\n  padding: 0.5rem;\n  text-align: center;\n  color: var(--ui-text-quaternary);\n  font-size: 0.75rem;\n}\n\n/* --- drawer ------------------------------------------------------------- */\n\n.gg-drawer {\n  flex: none;\n  display: flex;\n  flex-direction: column;\n  min-width: 0;\n  border-inline-start: 1px solid var(--ui-stroke-tertiary);\n  background: var(--ui-bg-chrome);\n}\n.gg-drawer-slot { display: flex; height: 100%; flex: none; }\n.gg-remote-toggle {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.25rem;\n  font-size: 0.6875rem;\n  color: var(--ui-text-tertiary);\n  cursor: pointer;\n  user-select: none;\n}\n.gg-drawer-collapsed {\n  flex: none;\n  display: flex;\n  align-items: flex-start;\n  justify-content: center;\n  padding-top: 0.5rem;\n  border-inline-start: 1px solid var(--ui-stroke-tertiary);\n}\n.gg-drawer-head {\n  display: flex;\n  align-items: center;\n  gap: 0.375rem;\n  padding: 0.375rem 0.5rem;\n  border-bottom: 1px solid var(--ui-stroke-tertiary);\n  flex: none;\n}\n.gg-drawer-title { font-weight: 600; font-size: 0.75rem; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.gg-drawer-body { flex: 1; overflow: auto; padding: 0.625rem 0.75rem; min-height: 0; }\n\n.gg-subject { font-size: 0.875rem; font-weight: 600; overflow-wrap: anywhere; }\n.gg-bodytext {\n  margin-top: 0.5rem;\n  white-space: pre-wrap;\n  color: var(--ui-text-secondary);\n  font-size: 0.75rem;\n  overflow-wrap: anywhere;\n}\n.gg-meta { margin-top: 0.625rem; display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.75rem; }\n.gg-meta-row { display: flex; gap: 0.375rem; }\n.gg-meta-label { color: var(--ui-text-tertiary); flex: none; width: 4.5rem; }\n.gg-meta-value { min-width: 0; overflow-wrap: anywhere; }\n.gg-parents { display: flex; gap: 0.375rem; flex-wrap: wrap; }\n.gg-parent-link {\n  color: var(--ui-accent);\n  font-family: var(--dt-font-mono, monospace);\n  font-size: 0.75rem;\n  cursor: pointer;\n  background: none;\n  border: none;\n  padding: 0;\n}\n.gg-parent-link:hover { text-decoration: underline; }\n.gg-sha { font-family: var(--dt-font-mono, monospace); }\n\n.gg-files-head {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-top: 0.875rem;\n  margin-bottom: 0.375rem;\n}\n.gg-files-count { font-size: 0.75rem; color: var(--ui-text-secondary); flex: 1; }\n.gg-view-toggle { display: flex; gap: 0.125rem; }\n.gg-view-btn {\n  border: 1px solid var(--ui-stroke-secondary);\n  background: transparent;\n  color: var(--ui-text-tertiary);\n  font-size: 0.6875rem;\n  padding: 0.125rem 0.5rem;\n  cursor: pointer;\n}\n.gg-view-btn:first-child { border-radius: 3px 0 0 3px; border-inline-end: none; }\n.gg-view-btn:last-child { border-radius: 0 3px 3px 0; }\nhtml[dir='rtl'] .gg-view-btn:first-child { border-radius: 0 3px 3px 0; border-inline-end: 1px solid var(--ui-stroke-secondary); }\nhtml[dir='rtl'] .gg-view-btn:last-child { border-radius: 3px 0 0 3px; border-inline-end: none; }\n.gg-view-btn-on { background: var(--ui-bg-tertiary); color: var(--ui-text-primary); }\n\n.gg-file {\n  display: flex;\n  align-items: center;\n  gap: 0.375rem;\n  padding: 0.125rem 0.25rem;\n  border-radius: 3px;\n  cursor: pointer;\n  font-size: 0.75rem;\n  min-width: 0;\n}\n.gg-file:hover { background: var(--ui-row-hover-background); }\n.gg-file-status {\n  flex: none;\n  width: 1rem;\n  text-align: center;\n  font-weight: 700;\n  font-size: 0.6875rem;\n}\n.gg-file-status-A { color: var(--ui-green); }\n.gg-file-status-M { color: var(--ui-yellow); }\n.gg-file-status-D { color: var(--ui-red); }\n.gg-file-status-R,\n.gg-file-status-C { color: var(--ui-blue); }\n.gg-file-status-T { color: var(--ui-text-tertiary); }\n.gg-file-path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.gg-file-dir { color: var(--ui-text-tertiary); }\n.gg-file-stats { flex: none; font-size: 0.6875rem; color: var(--ui-text-tertiary); font-variant-numeric: tabular-nums; }\n.gg-file-add { color: var(--ui-green); }\n.gg-file-del { color: var(--ui-red); }\n.gg-tree-indent { flex: none; }\n\n/* --- diff --------------------------------------------------------------- */\n\n.gg-diff {\n  font-family: var(--dt-font-mono, monospace);\n  font-size: 0.6875rem;\n  line-height: 1.35;\n  overflow-x: auto;\n  white-space: pre;\n  margin-top: 0.5rem;\n}\n.gg-diff-line { min-width: max-content; padding-inline: 0.25rem; }\n.gg-diff-add { background: var(--ui-diff-add-background); color: var(--ui-diff-add-foreground); }\n.gg-diff-del { background: var(--ui-diff-remove-background); color: var(--ui-diff-remove-foreground); }\n.gg-diff-hunk { color: var(--ui-text-tertiary); }\n.gg-diff-meta { color: var(--ui-text-quaternary); }\n.gg-diff-notice {\n  padding: 0.375rem 0.5rem;\n  color: var(--ui-text-tertiary);\n  font-size: 0.75rem;\n  background: var(--ui-bg-tertiary);\n  border-radius: 3px;\n  margin-top: 0.5rem;\n}\n\n/* --- gate / misc --------------------------------------------------------- */\n\n.gg-gate { display: grid; place-items: center; min-height: 8rem; text-align: center; height: 100%; }\n.gg-gate-inner > * + * { margin-top: 0.75rem; }\n.gg-pane {\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n  overflow: hidden;\n  font-size: 0.8125rem;\n}\n.gg-pane-head {\n  display: flex;\n  align-items: center;\n  gap: 0.25rem;\n  padding: 0.25rem 0.5rem;\n  border-bottom: 1px solid var(--ui-stroke-tertiary);\n  flex: none;\n}\n.gg-pane-body { flex: 1; overflow: auto; min-height: 0; }\n.gg-pane-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }\n.gg-pane-title .gg-repo-sub { display: inline; margin: 0; }\n.gg-prow {\n  display: flex;\n  align-items: center;\n  height: 24px;\n  cursor: default;\n}\n.gg-prow:hover { background: var(--ui-row-hover-background); }\n.gg-prow-graph { flex: none; overflow: hidden; }\n.gg-prow-subject {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font-size: 0.75rem;\n  padding-inline: 0.25rem;\n}\n.gg-prow .gg-chip { font-size: 0.625rem; line-height: 1rem; padding: 0 0.25rem; }\n.gg-repo { padding: 0.625rem 0.75rem; }\n.gg-repo-name { font-weight: 600; }\n.gg-repo-sub { margin-top: 0.125rem; font-size: 0.75rem; color: var(--ui-text-secondary); }\n.gg-icon-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 1.375rem;\n  height: 1.375rem;\n  border: none;\n  border-radius: 4px;\n  background: transparent;\n  color: var(--ui-text-secondary);\n  cursor: pointer;\n}\n.gg-icon-btn:hover { background: var(--ui-control-hover-background); color: var(--ui-text-primary); }\n";

// desktop-src/index.jsx
import { jsx as jsx8 } from "react/jsx-runtime";
function GitGuiTabTitle() {
  const t = usePluginI18n6("git-gui");
  return t("paneTitle");
}
var plugin = {
  id: "git-gui",
  name: "Git Gui",
  description: "Read-only graphical git client \u2014 GitKraken-style commit graph in the sidebar and on a full page.",
  defaultEnabled: false,
  register(ctx) {
    ctx.i18n.register(LOCALES);
    bindApi(ctx);
    bindStorage(ctx);
    const style = document.createElement("style");
    style.dataset.plugin = "git-gui";
    style.textContent = styles_default;
    document.head.appendChild(style);
    ctx.onDispose(() => style.remove());
    ctx.registerMany([
      {
        id: "page",
        area: ROUTES_AREA,
        data: { path: "/git-gui" },
        render: () => /* @__PURE__ */ jsx8(GitGuiPage, {})
      }
    ]);
    const registerLabels = () => ctx.registerMany([
      {
        id: "nav",
        area: SIDEBAR_NAV_AREA,
        order: 60,
        data: { codicon: "git-branch", label: ctx.i18n.t("nav"), path: "/git-gui" }
      },
      {
        id: "pane",
        area: PANES_AREA,
        title: ctx.i18n.t("paneTitle"),
        data: {
          placement: "right",
          collapsible: true,
          width: "300px",
          minWidth: "240px",
          maxWidth: "520px",
          tabTitle: () => /* @__PURE__ */ jsx8(GitGuiTabTitle, {})
        },
        render: () => /* @__PURE__ */ jsx8(GitGuiPane, {})
      },
      {
        id: "open",
        area: PALETTE_AREA,
        data: {
          id: "git-gui.open",
          label: ctx.i18n.t("command.open"),
          keywords: ["git", "graph", "commits", "gui"],
          run: () => host4.navigate("/git-gui")
        }
      },
      {
        id: "refresh",
        area: PALETTE_AREA,
        data: {
          id: "git-gui.refresh",
          label: ctx.i18n.t("command.refresh"),
          keywords: ["git", "refresh", "graph"],
          run: refreshAll
        }
      }
    ]);
    let disposeLabels = registerLabels();
    ctx.i18n.onLocaleChange(() => {
      disposeLabels();
      disposeLabels = registerLabels();
    });
  }
};
var index_default = plugin;
export {
  index_default as default
};
