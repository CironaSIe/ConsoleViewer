import { getRequestHeaders } from '../../../../script.js';

const EXTENSION_NAME = 'ConsoleViewer';
const TEMPLATE_PATH = 'third-party/ConsoleViewer';
const SETTINGS_KEY = 'consoleViewer';
const MAX_ENTRIES = 500;

let logEntries = [];
let currentFilter = 'all';
let searchQuery = '';
let entryIdCounter = 0;
let recording = true;
let notifyOnError = true;
let captureStack = true;
let reverseOrder = false;

const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
};

function safeStringify(obj) {
    const seen = new WeakSet();
    return JSON.stringify(obj, function (key, value) {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) return '[Circular]';
            seen.add(value);
        }
        if (value instanceof Error) return { message: value.message, stack: value.stack };
        if (typeof value === 'function') return '[Function]';
        if (value instanceof Node) return `[${value.tagName || 'Node'}]`;
        if (typeof value === 'symbol') return value.toString();
        return value;
    }, 2);
}

function getShortMessage(args) {
    return args.map(a => {
        if (a instanceof Error) return a.message;
        if (typeof a === 'object') {
            if (a === null) return 'null';
            try {
                const s = JSON.stringify(a, (k, v) => {
                    if (v instanceof Error) return v.message;
                    if (typeof v === 'function') return '[Function]';
                    return v;
                });
                return s.length > 200 ? s.slice(0, 200) + '...' : s;
            } catch {
                return String(a);
            }
        }
        return String(a);
    }).join(' ');
}

function safelyCloneArgs(args) {
    return args.map(a => {
        if (a instanceof Error) return { _type: 'Error', message: a.message, stack: a.stack };
        if (typeof a === 'object' && a !== null) {
            try { return JSON.parse(safeStringify(a)); } catch { return String(a); }
        }
        return a;
    });
}

function captureLog(level, args) {
    if (!recording) return;

    const entry = {
        id: Date.now() + '_' + (entryIdCounter++),
        level,
        message: getShortMessage(args),
        args: safelyCloneArgs(args),
        timestamp: Date.now(),
        stack: captureStack ? new Error().stack : null,
    };

    logEntries.push(entry);
    if (logEntries.length > MAX_ENTRIES) {
        logEntries.shift();
    }

    if (entryMatchesFilter(entry)) {
        appendEntryToDOM(entry);
    }

    updateCount();

    if (level === 'error' && notifyOnError && typeof toastr !== 'undefined') {
        toastr.warning(getShortMessage([entry.message]), '控制台错误');
    }
}

function overrideConsole() {
    console.log = function (...args) {
        originalConsole.log.apply(console, args);
        captureLog('log', args);
    };
    console.warn = function (...args) {
        originalConsole.warn.apply(console, args);
        captureLog('warn', args);
    };
    console.error = function (...args) {
        originalConsole.error.apply(console, args);
        captureLog('error', args);
    };
    console.info = function (...args) {
        originalConsole.info.apply(console, args);
        captureLog('info', args);
    };
}

function restoreConsole() {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
}

function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false });
}

function entryMatchesFilter(entry) {
    if (currentFilter !== 'all' && entry.level !== currentFilter) return false;
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!entry.message.toLowerCase().includes(q)) return false;
    }
    return true;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function buildEntryClickHandler(el, entry) {
    return function () {
        const isOpen = el.dataset.open === 'true';
        if (isOpen) {
            const detail = el.querySelector('.cv-entry-detail');
            if (detail) detail.remove();
            el.querySelector('.cv-entry-toggle').innerHTML = '&#9654;';
            el.dataset.open = 'false';
        } else {
            let parts = [];
            if (entry.stack) {
                parts.push(`<pre class="cv-stack">${escapeHtml(entry.stack)}</pre>`);
            }
            parts.push(`<pre class="cv-args">${escapeHtml(safeStringify(entry.args))}</pre>`);
            const detailDiv = document.createElement('div');
            detailDiv.className = 'cv-entry-detail';
            detailDiv.innerHTML = parts.join('');
            el.appendChild(detailDiv);
            el.querySelector('.cv-entry-toggle').innerHTML = '&#9660;';
            el.dataset.open = 'true';
        }
    };
}

function appendEntryToDOM(entry) {
    const container = document.getElementById('cv_log_list');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `cv-entry cv-entry-${entry.level}`;
    el.dataset.id = entry.id;
    el.innerHTML = [
        `<span class="cv-entry-time">${formatTime(entry.timestamp)}</span>`,
        `<span class="cv-entry-level">[${entry.level.toUpperCase()}]</span>`,
        `<span class="cv-entry-msg">${escapeHtml(entry.message)}</span>`,
        `<span class="cv-entry-toggle">&#9654;</span>`,
    ].join('');

    el.addEventListener('click', buildEntryClickHandler(el, entry));
    if (reverseOrder) container.prepend(el); else container.appendChild(el);
    container.scrollTop = container.scrollHeight;
}

function renderLogList() {
    const container = document.getElementById('cv_log_list');
    if (!container) return;

    const filtered = logEntries.filter(e => entryMatchesFilter(e));
    const list = reverseOrder ? filtered.reverse() : filtered;
    container.innerHTML = list.map(e => [
        `<div class="cv-entry cv-entry-${e.level}" data-id="${e.id}">`,
        `<span class="cv-entry-time">${formatTime(e.timestamp)}</span>`,
        `<span class="cv-entry-level">[${e.level.toUpperCase()}]</span>`,
        `<span class="cv-entry-msg">${escapeHtml(e.message)}</span>`,
        `<span class="cv-entry-toggle">&#9654;</span>`,
        `</div>`,
    ].join('')).join('');

    container.querySelectorAll('.cv-entry').forEach(el => {
        const id = el.dataset.id;
        const entry = logEntries.find(e => e.id === id);
        if (!entry) return;
        el.addEventListener('click', buildEntryClickHandler(el, entry));
    });
}

function updateCount() {
    const el = document.getElementById('cv_count');
    if (el) el.textContent = `${logEntries.length} / ${MAX_ENTRIES}`;
}

function exportLogs() {
    const date = new Date().toISOString().slice(0, 10);
    const text = logEntries.map(e => {
        const time = formatTime(e.timestamp);
        const stack = e.stack ? '\n' + e.stack : '';
        return `[${time}][${e.level.toUpperCase()}] ${e.message}${stack}`;
    }).join('\n\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `控制台日志-${date}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function clearLogs() {
    if (!confirm('确定清空所有捕获的日志？')) return;
    logEntries = [];
    const container = document.getElementById('cv_log_list');
    if (container) container.innerHTML = '';
    updateCount();
}

function saveSettings() {
    const ctx = globalThis.SillyTavern?.getContext?.();
    if (!ctx) return;
    const s = ctx.extensionSettings[SETTINGS_KEY];
    s.recording = recording;
    s.notifyOnError = notifyOnError;
    s.captureStack = captureStack;
    s.reverseOrder = reverseOrder;
    ctx.saveSettingsDebounced();
}

function addWandButton() {
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return;

    let button = document.getElementById('cv_wand_button');
    if (!button) {
        button = document.createElement('div');
        button.id = 'cv_wand_button';
        button.classList.add('list-group-item', 'flex-container', 'flexGap5', 'interactable');
        button.tabIndex = 0;

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-terminal';
        button.append(icon);

        const span = document.createElement('span');
        span.textContent = '控制台日志';
        button.append(span);

        button.addEventListener('click', () => {
            const drawer = document.querySelector('.console-viewer-settings .inline-drawer');
            if (!drawer) return;
            drawer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const toggle = drawer.querySelector('.inline-drawer-toggle');
            if (toggle && !drawer.classList.contains('openDrawer')) {
                toggle.click();
            }
        });

        menu.appendChild(button);
    }
}

function bindEvents() {
    const recordToggle = document.getElementById('cv_recording_toggle');
    if (recordToggle) {
        recordToggle.addEventListener('change', () => {
            recording = recordToggle.checked;
            if (recording) overrideConsole();
            else restoreConsole();
            saveSettings();
        });
    }

    const notifyToggle = document.getElementById('cv_notify_toggle');
    if (notifyToggle) {
        notifyToggle.addEventListener('change', () => {
            notifyOnError = notifyToggle.checked;
            saveSettings();
        });
    }

    const stackToggle = document.getElementById('cv_stack_toggle');
    if (stackToggle) {
        stackToggle.addEventListener('change', () => {
            captureStack = stackToggle.checked;
            saveSettings();
        });
    }

    document.querySelectorAll('.cv-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cv-filter-btn').forEach(b => b.classList.remove('cv-active', 'active'));
            btn.classList.add('cv-active');
            currentFilter = btn.dataset.level;
            renderLogList();
        });
    });

    const searchInput = document.getElementById('cv_search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            searchQuery = searchInput.value;
            renderLogList();
        });
    }

    const exportBtn = document.getElementById('cv_export');
    if (exportBtn) exportBtn.addEventListener('click', exportLogs);

    const clearBtn = document.getElementById('cv_clear');
    if (clearBtn) clearBtn.addEventListener('click', clearLogs);

    const reverseToggle = document.getElementById('cv_reverse_toggle');
    if (reverseToggle) {
        reverseToggle.addEventListener('change', () => {
            reverseOrder = reverseToggle.checked;
            saveSettings();
            renderLogList();
        });
    }
}

export async function onActivate() {
    if (typeof toastr !== 'undefined') {
        toastr.info('[ConsoleViewer] 开始加载');
    }
    console.log('[ConsoleViewer] onActivate 被调用');
    
    try {
        const ctx = globalThis.SillyTavern?.getContext?.();
        if (!ctx) {
            console.error('[ConsoleViewer] 无法获取 SillyTavern 上下文');
            if (typeof toastr !== 'undefined') toastr.error('无法获取上下文');
            return;
        }

        const ext = ctx.extensionSettings;
        if (!ext[SETTINGS_KEY]) {
            ext[SETTINGS_KEY] = {
                recording: true,
                notifyOnError: true,
                captureStack: true,
            };
        }

        const s = ext[SETTINGS_KEY];
        recording = s.recording;
        notifyOnError = s.notifyOnError;
        captureStack = s.captureStack;
        reverseOrder = s.reverseOrder || false;

        console.log('[ConsoleViewer] 开始渲染模板:', TEMPLATE_PATH);
        const html = await ctx.renderExtensionTemplateAsync(TEMPLATE_PATH, 'settings', {});
        console.log('[ConsoleViewer] 模板渲染完成，长度:', html?.length);
        
        $('#extensions_settings2').append(html);
        console.log('[ConsoleViewer] HTML 已注入');

        const toggle1 = document.getElementById('cv_recording_toggle');
        const toggle2 = document.getElementById('cv_notify_toggle');
        const toggle3 = document.getElementById('cv_stack_toggle');
        
        if (toggle1) toggle1.checked = recording;
        if (toggle2) toggle2.checked = notifyOnError;

        const toggle4 = document.getElementById('cv_reverse_toggle');
        if (toggle4) toggle4.checked = reverseOrder;
        if (toggle3) toggle3.checked = captureStack;

        addWandButton();
        bindEvents();
        updateCount();

        if (recording) {
            overrideConsole();
            console.info('[控制台日志] 捕获已开启，本条目说明扩展工作正常');
        }
        
        if (typeof toastr !== 'undefined') {
            toastr.success('[ConsoleViewer] 加载成功');
        }
    } catch (err) {
        console.error('[控制台日志] 初始化失败:', err);
        if (typeof toastr !== 'undefined') {
            toastr.error('[ConsoleViewer] 初始化失败: ' + err.message);
        }
    }
}
