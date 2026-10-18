/* global chrome */

const $ = (id) => document.getElementById(id);

const queryInput = $("queryInput");
const searchButton = $("searchButton");
const includeTitle = $("includeTitle");
const includeUrl = $("includeUrl");
const limitSelect = $("limitSelect");
const selectAll = $("selectAll");
const deleteSelectedButton = $("deleteSelectedButton");
const resultsElement = $("results");
const emptyState = $("emptyState");
const resultSummary = $("resultSummary");
const statusElement = $("status");

let results = [];
let selectedUrls = new Set();

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
}

function formatDate(timestamp) {
  if (!timestamp) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  }).format(new Date(timestamp));
}

function safeText(value) {
  return typeof value === "string" ? value : "";
}

function renderResults() {
  resultsElement.replaceChildren();
  emptyState.hidden = results.length !== 0;

  if (!results.length) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
    deleteSelectedButton.disabled = true;
    return;
  }

  for (const item of results) {
    const row = document.createElement("div");
    row.className = "result-item";
    row.setAttribute("role", "listitem");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "result-check";
    checkbox.checked = selectedUrls.has(item.url);
    checkbox.setAttribute("aria-label", `Select ${item.url}`);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedUrls.add(item.url);
      else selectedUrls.delete(item.url);
      updateSelectionUi();
    });

    const content = document.createElement("div");
    content.className = "result-content";
    const title = document.createElement("div");
    title.className = "result-title";
    title.textContent = safeText(item.title) || "Untitled page";
    title.title = title.textContent;
    const url = document.createElement("div");
    url.className = "result-url";
    url.textContent = safeText(item.url);
    url.title = url.textContent;
    const meta = document.createElement("div");
    meta.className = "result-meta";
    meta.textContent = `${formatDate(item.lastVisitTime)} · ${item.visitCount || 1} visit${item.visitCount === 1 ? "" : "s"}`;
    content.append(title, url, meta);
    row.append(checkbox, content);
    resultsElement.appendChild(row);
  }

  updateSelectionUi();
}

function updateSelectionUi() {
  const selectedCount = results.filter((item) => selectedUrls.has(item.url)).length;
  const resultCount = results.length;
  selectAll.checked = resultCount > 0 && selectedCount === resultCount;
  selectAll.indeterminate = selectedCount > 0 && selectedCount < resultCount;
  deleteSelectedButton.disabled = selectedCount === 0;
  deleteSelectedButton.textContent = selectedCount ? `Delete selected (${selectedCount})` : "Delete selected";
  resultSummary.textContent = `${resultCount} result${resultCount === 1 ? "" : "s"} · ${selectedCount} selected`;
}

function getSearchOptions() {
  const query = queryInput.value.trim();
  if (!query) throw new Error("Enter a search term first.");
  if (!includeTitle.checked && !includeUrl.checked) {
    throw new Error("Select Page titles or URLs.");
  }
  return { query, maxResults: Number(limitSelect.value) };
}

async function searchHistory() {
  let options;
  try { options = getSearchOptions(); }
  catch (error) { setStatus(error.message, true); return; }

  searchButton.disabled = true;
  setStatus("Searching history…");
  results = [];
  selectedUrls.clear();
  renderResults();

  try {
    const found = await chrome.history.search({
      text: options.query,
      startTime: 0,
      maxResults: options.maxResults
    });
    const needle = options.query.toLocaleLowerCase();
    results = found.filter((item) => {
      const urlMatch = includeUrl.checked && safeText(item.url).toLocaleLowerCase().includes(needle);
      const titleMatch = includeTitle.checked && safeText(item.title).toLocaleLowerCase().includes(needle);
      return urlMatch || titleMatch;
    });
    setStatus(results.length ? "Search complete. Select items to remove." : "No matching history found.");
    renderResults();
  } catch (error) {
    setStatus(`Search failed: ${error.message || "History API unavailable"}`, true);
  } finally {
    searchButton.disabled = false;
  }
}

async function deleteSelected() {
  const urls = [...selectedUrls].filter((url) => results.some((item) => item.url === url));
  if (!urls.length) return;
  if (!confirm(`Delete ${urls.length} selected history item${urls.length === 1 ? "" : "s"}? This cannot be undone.`)) return;

  deleteSelectedButton.disabled = true;
  setStatus(`Deleting ${urls.length} item${urls.length === 1 ? "" : "s"}…`);
  let deleted = 0;
  const failed = [];
  for (const url of urls) {
    try {
      await chrome.history.deleteUrl({ url });
      deleted += 1;
    } catch (error) {
      failed.push(url);
    }
  }
  results = results.filter((item) => !urls.includes(item.url) || failed.includes(item.url));
  selectedUrls = new Set(failed);
  renderResults();
  if (failed.length) setStatus(`Removed ${deleted}; ${failed.length} failed. Try again.`, true);
  else setStatus(`Removed ${deleted} history item${deleted === 1 ? "" : "s"}.`);
}

async function clearAllHistory() {
  if (!confirm("Clear all browser history? This cannot be undone.")) return;
  try {
    await chrome.history.deleteAll();
    results = [];
    selectedUrls.clear();
    renderResults();
    resultSummary.textContent = "History cleared";
    setStatus("All browser history has been cleared.");
  } catch (error) {
    setStatus(`Clear failed: ${error.message || "Unknown error"}`, true);
  }
}

selectAll.addEventListener("change", () => {
  if (selectAll.checked) results.forEach((item) => selectedUrls.add(item.url));
  else results.forEach((item) => selectedUrls.delete(item.url));
  renderResults();
});
searchButton.addEventListener("click", searchHistory);
queryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") searchHistory();
});
deleteSelectedButton.addEventListener("click", deleteSelected);
$("clearQueryButton").addEventListener("click", () => {
  queryInput.value = "";
  results = [];
  selectedUrls.clear();
  resultSummary.textContent = "Search to see matching history";
  setStatus("");
  renderResults();
  queryInput.focus();
});
$("clearAllHistoryButton").addEventListener("click", clearAllHistory);

renderResults();
