// ==========================================
// 1. APP STATE & GLOBAL VARIABLES
// ==========================================
let contacts = [];
let currentFilteredData = []; 
let selectedPhones = new Set(); 
let starredPhones = new Set(JSON.parse(localStorage.getItem('starred_phones') || '[]'));
let currentView = 'all'; 
let isAllSelected = false;
let progressChart = null;
const dutyStore = new Map();
let attendanceStatuses = JSON.parse(localStorage.getItem('attendance_statuses') || '{}');

// Data Sources Map
const DEFAULT_SHEET_URLS = {
    district: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSAPIvxDtzErZy7EWmmjRJ6WkiU5K-ix8Dsxscy5w35wKN38PW2VCxLvNMrOf6-ZyyAfa6juaNIOpN0/pub?output=csv",
    office: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRxjBrWNE35n58fVQ6Vf73AwejmS3TgDCk4g_EqGwDPSz0BFxpVnV4VlD2cHcfK1Ls86Sah2Pj6YQXg/pub?output=csv"
};

const CUSTOM_SHEET_URL_KEYS = {
    district: 'custom_sheet_url_district',
    office: 'custom_sheet_url_office'
};

function getCurrentSheetUrl(type) {
    return localStorage.getItem(CUSTOM_SHEET_URL_KEYS[type]) || DEFAULT_SHEET_URLS[type];
}

function setCurrentSheetUrl(type, url) {
    localStorage.setItem(CUSTOM_SHEET_URL_KEYS[type], url);
}

function resolveSheetUrl(type) {
    return getCurrentSheetUrl(type);
}

function applySheetUrlInputs() {
    const urlInput = document.getElementById('sheet-url-input');
    const sourceLabel = document.getElementById('sheet-source-label');
    if (urlInput) urlInput.value = getCurrentSheetUrl(currentDirectoryType);
    if (sourceLabel) {
        sourceLabel.innerText = currentDirectoryType === 'district'
            ? 'Source: District Sheet'
            : 'Source: Office Sheet';
    }
}

function saveSheetUrl() {
    const input = document.getElementById('sheet-url-input');
    if (!input) return;
    const url = input.value.trim();
    if (!url) {
        alert('Sheet URL paste karo.');
        return;
    }
    if (!/^https?:\/\//.test(url)) {
        alert('Valid URL paste karo, jaise https://docs.google.com/...');
        return;
    }
    setCurrentSheetUrl(currentDirectoryType, url);
    applySheetUrlInputs();
    showAssistantToast('Sheet URL saved. Refreshing data...');
    fetchGoogleSheet();
}

let currentDirectoryType = 'district'; // Default tab
const dictionary = {
    en: {
        title: "Officer Directory (Collectorate)", 
        deptSlicer: "Select Department:", allDept: "All Departments",
        listTitle_district: "Officers List",       // District Tab ke liye English
        listTitle_office: "Staff List",            // Office Tab ke liye English
        searchPlaceholder: "Search by name, number, role or command..."
    },
    hi: {
        title: "अधिकारी निर्देशिका (जिला - फलौदी)", 
        deptSlicer: "विभाग चुनें:", allDept: "सभी विभाग",
        listTitle_district: "अधिकारियों की सूची",    // District Tab ke liye Hindi
        listTitle_office: "कार्मिक सूची",            // Office Tab ke liye Hindi (Aap chahein toh isko "कार्मिक का नाम" भी कर sakte hain)
        searchPlaceholder: "नाम, पद खोजें या कमांड बोलें..."
    }
};

const LEGACY_FONT_MAPS = {
    kruti: {
        'अ': 'd', 'आ': 'aa', 'इ': 'b', 'ई': 'B', 'उ': 'm', 'ऊ': 'M', 'ए': 'Å', 'ऐ': 'ç', 'ओ': '½', 'औ': '»',
        'क': 'd', 'ख': 'K', 'ग': 'g', 'घ': 'z', 'ङ': 'Z', 'च': 'v', 'छ': 'V', 'ज': 'u', 'झ': 'U', 'ञ': '{',
        'ट': 'r', 'ठ': 'R', 'ड': 'e', 'ढ': 'T', 'ण': 'w', 'त': 't', 'थ': 'f', 'द': 'y', 'ध': 'Y', 'न': 'n',
        'प': 'p', 'फ': 'p}', 'ब': 'F', 'भ': 'Q', 'म': 'm', 'य': 'u', 'र': 'r', 'ल': 'l', 'व': '\'', 'श': 'p', 'ष': 'Å', 'स': 's', 'ह': 'g',
        'ा': 'k', 'ि': 'f', 'ी': 'h', 'ु': 't', 'ू': 'w', 'े': 'q', 'ै': 'Q', 'ो': '›', 'ौ': 'µ', '्': ']', 'ं': 'Z', 'ः': ']', 'ँ': '\\',
        '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
    },
    devlys: {
        'अ': 'k', 'आ': 'ka', 'इ': 'b', 'ई': 'B', 'उ': 'm', 'ऊ': 'M', 'ए': 'M', 'ऐ': 'q', 'ओ': '>', 'औ': '}',
        'क': 'd', 'ख': 'K', 'ग': 'g', 'घ': 'z', 'ङ': 'q', 'च': 'v', 'छ': 'V', 'ज': 'u', 'झ': 'U', 'ञ': 'f',
        'ट': 't', 'ठ': 'T', 'ड': 'N', 'ढ': 'n', 'ण': 'w', 'त': 'i', 'थ': 'I', 'द': 'y', 'ध': 'Y', 'न': 'm',
        'प': 'p', 'फ': 'P', 'ब': 'F', 'भ': 'Q', 'म': 'M', 'य': 'r', 'र': 'j', 'ल': 'l', 'व': 'x', 'श': 'Þ', 'ष': 'å', 'स': 's', 'ह': 'h',
        'ा': 'k', 'ि': 'f', 'ी': 'F', 'ु': 't', 'ू': 'T', 'े': 'e', 'ै': 'E', 'ो': '>', 'ौ': '}', '्': '\\', 'ं': 'Z', 'ः': '\\', 'ँ': '`',
        '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
    }
};

function normalizePhone(rawPhone, withCountryCode = true) {
    if (rawPhone === undefined || rawPhone === null) return '';
    let digits = rawPhone.toString().replace(/\D/g, '');
    if (digits.length === 10) return withCountryCode ? '91' + digits : digits;
    if (digits.length === 11 && digits.startsWith('0')) return withCountryCode ? '91' + digits.slice(1) : digits.slice(1);
    if (digits.length === 12 && digits.startsWith('91')) return withCountryCode ? digits : digits.slice(2);
    if (digits.length === 13 && digits.startsWith('091')) return withCountryCode ? '91' + digits.slice(3) : digits.slice(3);
    return withCountryCode ? digits : digits;
}

// ==========================================
// 2. THEME & LANGUAGE MANAGEMENT
// ==========================================
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    document.getElementById('theme-toggle').innerText = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function loadTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-toggle').innerText = '☀️';
    }
}

function changeLanguage() {
    const lang = document.getElementById('lang-select').value;
    document.getElementById('app-title').innerText = dictionary[lang].title;
    document.getElementById('dept-slicer-label').innerText = dictionary[lang].deptSlicer;
    
    // Tab ke hisaab se List Title change karein
    if (currentDirectoryType === 'district') {
        document.getElementById('list-title').innerText = dictionary[lang].listTitle_district;
    } else {
        document.getElementById('list-title').innerText = dictionary[lang].listTitle_office;
    }
    
    document.getElementById('search-bar').placeholder = dictionary[lang].searchPlaceholder;
    
    const deptSlicer = document.getElementById('dept-slicer');
    if (deptSlicer && deptSlicer.options.length > 0) deptSlicer.options[0].text = dictionary[lang].allDept;
}

// ==========================================
// 3. DATA FETCHING & OFFLINE CACHE
// ==========================================
async function fetchGoogleSheet() {
    try {
        const currentUrl = resolveSheetUrl(currentDirectoryType);
        const cacheKey = `directory_cache_${currentDirectoryType}`;

        const totalCountEl = document.getElementById('total-count-display');
        if (totalCountEl) totalCountEl.innerText = 'Loading...';

        const response = await fetch(currentUrl);
        const textData = await response.text();

        // Try XLSX parsing first; if it fails, fall back to simple CSV parser
        try {
            const workbook = XLSX.read(textData, { type: 'string' });
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            contacts = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        } catch (xlsxErr) {
            console.warn('XLSX parsing failed, falling back to CSV parse:', xlsxErr);
            // Basic CSV fallback: split lines, use first row as header
            const lines = textData.split(/\r?\n/).filter(Boolean);
            if (lines.length > 0) {
                const headers = lines[0].split(/,|;|\t/).map(h => h.trim());
                const rows = lines.slice(1).map(l => l.split(/,|;|\t/).map(cell => cell.trim()));
                contacts = rows.map(r => {
                    const obj = {};
                    headers.forEach((h, i) => obj[h] = r[i] || '');
                    return obj;
                });
            } else {
                contacts = [];
            }
        }
        
        if(contacts.length === 0) {
            alert("Sheet khali hai ya data load nahi ho paya.");
            const totalCountEl2 = document.getElementById('total-count-display');
            if (totalCountEl2) totalCountEl2.innerText = 'Total Officers: 0';
            return;
        }

        // Alag alag cache save hoga
        localStorage.setItem(cacheKey, JSON.stringify(contacts));
        
        selectedPhones.clear(); // Jab sheet change ho toh purana selection clear kar do
        updateBulkActionBar();
        
        runDataAudit(contacts);
        updateSlicerOptions();
        currentFilteredData = contacts;
        updateDashboard(contacts.length, contacts.length);
        // Ensure the list title reflects the chosen tab
        const lang = document.getElementById('lang-select') ? document.getElementById('lang-select').value : 'hi';
        const titleElement = document.getElementById('list-title');
        if (titleElement) titleElement.innerText = currentDirectoryType === 'district' ? dictionary[lang].listTitle_district : dictionary[lang].listTitle_office;
        renderContacts(contacts);
        updateAnalyticsVisuals(contacts);
        if (document.getElementById('attendance-modal')?.style.display === 'flex') {
            openAttendanceModal();
        }
        
    } catch (error) {
        console.error("Error fetching Google Sheet: ", error);

        const cachedData = localStorage.getItem(cacheKey);

        if (cachedData) {
            contacts = JSON.parse(cachedData);
            currentFilteredData = contacts;

            runDataAudit(contacts);
            updateSlicerOptions();
            updateDashboard(contacts.length, contacts.length);
            renderContacts(contacts);
            updateAnalyticsVisuals(contacts);
            if (document.getElementById('attendance-modal')?.style.display === 'flex') {
                openAttendanceModal();
            }

            alert("⚠️ Internet connection nahi hai! App Offline Mode mein pichla saved data dikha rahi hai.");
        } else {
            alert("Data lane mein error aayi. Kripya internet check karein.");
            const totalCountEl3 = document.getElementById('total-count-display');
            if (totalCountEl3) totalCountEl3.innerText = 'Total Officers: 0';
        }
    }
}

// Naya function: Tab Switch karne ke liye
function switchDirectoryTab(type) {
    if (currentDirectoryType === type) return; 
    
    currentDirectoryType = type;
    applySheetUrlInputs();
    
    const districtTab = document.getElementById('tab-district');
    const officeTab = document.getElementById('tab-office');
    if (districtTab) {
        districtTab.style.background = type === 'district' ? '#007bff' : '#e0e0e0';
        districtTab.style.color = type === 'district' ? 'white' : '#333';
    }
    if (officeTab) {
        officeTab.style.background = type === 'office' ? '#007bff' : '#e0e0e0';
        officeTab.style.color = type === 'office' ? 'white' : '#333';
    }

    changeLanguage();
    fetchGoogleSheet();
}
// ==========================================
// 4. DATA QUALITY AUDITOR
// ==========================================
function runDataAudit(data) {
    let invalidPhones = 0;
    let duplicates = 0;
    let missingFields = 0;
    let seenPhones = new Set();

    data.forEach((c) => {
        const name = c["Officer Name"] || c["अधिकारी का नाम"] || c.Name || c.name || '';
        const rawPhone = (c["Mobile/Phone No."] || c["फ़ोन नंबर"] || c.Phone || c.Mobile || c.phone || '').toString().trim();
        const dept = c.Department || c.विभाग || c.dept || '';
        const desig = c.Designation || c.पद || c.designation || '';

        if (!name || !dept || !desig) missingFields++;

        let normalizedPhone = normalizePhone(rawPhone);
        if (!normalizedPhone || normalizedPhone.length !== 12) {
            invalidPhones++;
        } else {
            if (seenPhones.has(normalizedPhone)) {
                duplicates++;
            } else {
                seenPhones.add(normalizedPhone);
            }
        }
    });

    const auditDisplay = document.getElementById('audit-count-display');
    const auditPanel = document.getElementById('audit-details-panel');

    if (!auditDisplay || !auditPanel) return;

    if (invalidPhones === 0 && duplicates === 0 && missingFields === 0) {
        auditDisplay.innerHTML = "✅ Data Quality: Perfect";
        auditDisplay.style.color = "#28a745";
        auditPanel.style.display = "none";
    } else {
        auditDisplay.innerHTML = `⚠️ Data Issues: ${invalidPhones + duplicates + missingFields} Found ▾`;
        auditDisplay.style.color = "#ffc107";
        
        let issuesHTML = "<strong>📋 Sheet Data Audit Report:</strong><ul style='margin: 8px 0 0 18px; padding: 0;'>";
        if (invalidPhones > 0) issuesHTML += `<li><b>${invalidPhones} Entries:</b> Phone number missing ya galat hai.</li>`;
        if (duplicates > 0) issuesHTML += `<li><b>${duplicates} Entries:</b> Duplicate Mobile numbers mile hain.</li>`;
        if (missingFields > 0) issuesHTML += `<li><b>${missingFields} Entries:</b> Name, Department ya Designation khali hai.</li>`;
        issuesHTML += "</ul><small style='display:block; margin-top:8px; color:#c69500;'>Tip: In galtiyon ko sheet mein sahi karke 'Refresh Data' karein.</small>";
        auditPanel.innerHTML = issuesHTML;
    }
}

function updateDashboard(totalCount, filteredCount) {
    const totalEl = document.getElementById('total-count-display');
    const filteredEl = document.getElementById('filtered-count-display');
    if (totalEl) totalEl.innerText = `Total Officers: ${totalCount}`;
    if (filteredEl) filteredEl.innerText = `Showing: ${filteredCount}`;
}

function normalizeNumericValue(value) {
    if (value === undefined || value === null) return NaN;
    let cleaned = value.toString().trim().replace(/,/g, '').replace(/%/g, '');
    cleaned = cleaned.replace(/[^0-9.\-]/g, '');
    return parseFloat(cleaned);
}

function findFieldByPatterns(sample, patterns) {
    if (!sample || typeof sample !== 'object') return null;
    let keys = Object.keys(sample);
    for (let pattern of patterns) {
        let lowerPattern = pattern.toLowerCase();
        let match = keys.find(k => k.toLowerCase().includes(lowerPattern));
        if (match) return match;
    }
    return null;
}

function aggregateByField(items, categoryField, valueField) {
    const aggregated = new Map();
    items.forEach(item => {
        const category = (item[categoryField] || 'Unknown').toString().trim() || 'Unknown';
        const value = normalizeNumericValue(item[valueField]);
        if (!isFinite(value)) return;
        const entry = aggregated.get(category) || { sum: 0, count: 0 };
        entry.sum += value;
        entry.count += 1;
        aggregated.set(category, entry);
    });
    return Array.from(aggregated.entries()).map(([key, data]) => ({ key, value: data.count ? data.sum / data.count : 0 }));
}

function renderProgressChart(data) {
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;
    const sample = data[0] || {};
    const blockField = findFieldByPatterns(sample, ['block', 'tehsil', 'area', 'zone', 'circle', 'region', 'division', 'mandal', 'sector', 'कस्बा', 'ब्लॉक', 'मंडल', 'प्रभाग']);
    const progressField = findFieldByPatterns(sample, ['progress', 'completion', 'achievement', 'target', 'percent', 'score', 'पूर्ण', 'प्रगति', 'उपलब्धि', 'टार्गेट', 'पूरा', 'स्टेटस']);
    let labels = [];
    let values = [];
    let chartLabel = 'Progress';

    if (blockField && progressField) {
        const rows = aggregateByField(data, blockField, progressField)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        labels = rows.map(row => row.key);
        values = rows.map(row => parseFloat(row.value.toFixed(1)));
        chartLabel = `${progressField} by ${blockField}`;
    } else if (blockField) {
        const counts = new Map();
        data.forEach(item => {
            const category = (item[blockField] || 'Unknown').toString().trim() || 'Unknown';
            counts.set(category, (counts.get(category) || 0) + 1);
        });
        const rows = Array.from(counts.entries())
            .map(([key, count]) => ({ key, value: count }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        labels = rows.map(row => row.key);
        values = rows.map(row => row.value);
        chartLabel = `Entries by ${blockField}`;
    } else {
        const deptField = findFieldByPatterns(sample, ['department', 'dept', 'section', 'division', 'विभाग', 'सेक्शन']);
        if (deptField) {
            const counts = new Map();
            data.forEach(item => {
                const category = (item[deptField] || 'Unknown').toString().trim() || 'Unknown';
                counts.set(category, (counts.get(category) || 0) + 1);
            });
            const rows = Array.from(counts.entries())
                .map(([key, count]) => ({ key, value: count }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10);
            labels = rows.map(row => row.key);
            values = rows.map(row => row.value);
            chartLabel = `Entries by ${deptField}`;
        }
    }

    if (labels.length === 0) {
        const chartArea = canvas.parentElement;
        if (chartArea) {
            chartArea.style.display = 'none';
        }
        return;
    }

    const chartArea = canvas.parentElement;
    if (chartArea) chartArea.style.display = 'block';

    if (progressChart) {
        progressChart.destroy();
        progressChart = null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    progressChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: chartLabel,
                data: values,
                backgroundColor: 'rgba(37, 99, 235, 0.6)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 1,
                borderRadius: 10,
                maxBarThickness: 36,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { ticks: { color: '#334155' }, grid: { display: false } },
                y: { ticks: { color: '#334155' }, grid: { color: 'rgba(148, 163, 184, 0.2)' }, beginAtZero: true }
            }
        }
    });
}

function updateAnalyticsVisuals(data) {
    renderProgressChart(data);
}

function toggleAuditDetails() {
    const auditPanel = document.getElementById('audit-details-panel');
    if (auditPanel) {
        auditPanel.style.display = (auditPanel.style.display === "none") ? "block" : "none";
    }
}

// ==========================================
// 5. SLICERS, FILTERS & VIEW MANAGEMENT
// ==========================================
function updateSlicerOptions() {
    const deptSlicer = document.getElementById('dept-slicer');
    const lang = document.getElementById('lang-select').value;
    if (!deptSlicer) return;
    
    deptSlicer.innerHTML = `<option value="All">${dictionary[lang].allDept}</option>`;
    
    let departments = new Set();
    contacts.forEach(c => {
        let d = c.Department || c.विभाग || c.dept || c.Dept || '';
        if(d) departments.add(d);
    });
    
    Array.from(departments).sort().forEach(dept => {
        let opt = document.createElement('option');
        opt.value = dept; opt.innerText = dept;
        deptSlicer.appendChild(opt);
    });
}

function applyFilters() {
    const selectedDept = document.getElementById('dept-slicer').value;
    const searchText = document.getElementById('search-bar').value.toLowerCase().trim();
    
    let filtered = contacts;

    if (currentView === 'starred') {
        filtered = filtered.filter(c => {
            let rawPhone = c["Mobile/Phone No."] || c["फ़ोन नंबर"] || c.Phone || c.Mobile || c.phone || '';
            let waPhone = normalizePhone(rawPhone);
            return starredPhones.has(waPhone);
        });
    }

    if(selectedDept !== "All") {
        filtered = filtered.filter(c => {
            let d = c.Department || c.विभाग || c.dept || c.Dept || '';
            return d === selectedDept;
        });
    }

    if(searchText !== "") {
        filtered = filtered.filter(c => {
            let name = (c["Officer Name"] || c["अधिकारी का नाम"] || c.Name || c.name || '').toLowerCase();
            let rawPhone = (c["Mobile/Phone No."] || c["फ़ोन नंबर"] || c.Phone || c.Mobile || c.phone || '').toString().toLowerCase();
            let desig = (c.Designation || c.पद || c.designation || '').toLowerCase();
            let duty = (c.Duty || c.Role || c["ड्यूटी"] || '').toLowerCase();
            
            return name.includes(searchText) || rawPhone.includes(searchText) || desig.includes(searchText) || duty.includes(searchText);
        });
    }

    currentFilteredData = filtered; 
    updateDashboard(contacts.length, filtered.length);
    renderContacts(filtered);
    updateAnalyticsVisuals(filtered);

    isAllSelected = false;
    const selectAllBtn = document.getElementById('select-all-btn');
    if(selectAllBtn) { 
        selectAllBtn.innerHTML = '☑️ Select All'; 
        selectAllBtn.style.background = '#6c757d'; 
    }
}

function switchView(view) {
    currentView = view;
    const allBtn = document.getElementById('view-all-btn');
    const starredBtn = document.getElementById('view-starred-btn');
    const aiBtn = document.getElementById('view-ai-btn');
    
    const filtersPanel = document.getElementById('normal-filters-panel');
    const contactSection = document.getElementById('main-contact-section');
    const aiWorkspace = document.getElementById('ai-drafter-workspace');

    if(allBtn) allBtn.style.background = '#6c757d';
    if(starredBtn) starredBtn.style.background = '#6c757d';
    if(aiBtn) aiBtn.style.background = '#6c757d';

    if (view === 'ai') {
        if(aiBtn) aiBtn.style.background = '#6f42c1';
        if(filtersPanel) filtersPanel.style.display = 'none';
        if(contactSection) contactSection.style.display = 'none';
        if(aiWorkspace) aiWorkspace.style.display = 'block';
    } else {
        if(filtersPanel) filtersPanel.style.display = 'block';
        if(contactSection) contactSection.style.display = 'block';
        if(aiWorkspace) aiWorkspace.style.display = 'none';

        if (view === 'starred') {
            if(starredBtn) starredBtn.style.background = '#28a745';
        } else {
            if(allBtn) allBtn.style.background = '#007bff';
        }

        const lang = document.getElementById('lang-select').value;
        const titleElement = document.getElementById('list-title');
        if (titleElement) {
            titleElement.innerText = currentDirectoryType === 'district' ? dictionary[lang].listTitle_district : dictionary[lang].listTitle_office;
        }
    }
        applyFilters();
    }
// ==========================================
// 6. ROBUST VOICE ASSISTANT ENGINE
// ==========================================
function startVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        alert("Aapka browser Voice Assistant support nahi karta. Google Chrome ya Edge use karein.");
        return;
    }

    const recognition = new SpeechRecognition();
    const micBtn = document.getElementById('voice-search-btn');
    const searchBar = document.getElementById('search-bar');
    const currentLang = document.getElementById('lang-select').value;

    recognition.lang = currentLang === 'hi' ? 'hi-IN' : 'en-US';
    recognition.continuous = false; 
    recognition.interimResults = false;

    recognition.onstart = function() {
        micBtn.innerHTML = "🔴"; 
        showAssistantToast("🤖 Sun raha hu...");
    };

    recognition.onerror = function(event) {
        console.error("Mic Error:", event.error);
        micBtn.innerHTML = "🎙️";
        if(event.error === 'not-allowed') {
            alert("Microphone access allow nahi hai. Browser settings mein jaakar mic allow karein.");
        } else {
            showAssistantToast("Error: " + event.error);
        }
    };

    recognition.onend = function() {
        micBtn.innerHTML = "🎙️";
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript.toLowerCase().replace(/[.]/g, "");
        searchBar.value = transcript;
        applyFilters();
    };

    recognition.start();
}

let meetingRecognition = null;
let meetingTranscriptBuffer = [];
let meetingMinutesCache = '';

function setTranscriptionStatus(message) {
    const statusEl = document.getElementById('transcription-status');
    if (statusEl) statusEl.innerText = `Status: ${message}`;
}

function startMeetingTranscription() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Aapka browser Voice Recognition support nahi karta. Google Chrome ya Edge use karein.");
        return;
    }
    if (meetingRecognition) {
        meetingRecognition.stop();
        meetingRecognition = null;
    }

    meetingRecognition = new SpeechRecognition();
    meetingRecognition.continuous = true;
    meetingRecognition.interimResults = true;
    const langSelect = document.getElementById('lang-select');
    const selectedLang = langSelect ? langSelect.value : 'hi';
    meetingRecognition.lang = selectedLang === 'hi' ? 'hi-IN' : 'en-IN';

    meetingRecognition.onstart = function() {
        setTranscriptionStatus('Recording... speak clearly in Hindi or English.');
        showAssistantToast('🗣️ Meeting transcription started.');
    };

    meetingRecognition.onerror = function(event) {
        console.error('Meeting transcription error:', event.error);
        setTranscriptionStatus('Error: ' + event.error);
        if (event.error === 'not-allowed') {
            alert('Microphone access allow nahi hai. Browser settings mein jaakar mic allow karein.');
        }
    };

    meetingRecognition.onend = function() {
        setTranscriptionStatus('Stopped');
        meetingRecognition = null;
        showAssistantToast('🛑 Meeting transcription stopped.');
    };

    meetingRecognition.onresult = function(event) {
        let transcriptText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                meetingTranscriptBuffer.push(result.trim());
            } else {
                transcriptText += result;
            }
        }
        const transcriptArea = document.getElementById('meeting-transcript-text');
        if (transcriptArea) {
            transcriptArea.value = meetingTranscriptBuffer.join('\n') + (transcriptText ? '\n' + transcriptText : '');
        }
    };

    meetingRecognition.start();
}

function stopMeetingTranscription() {
    if (meetingRecognition) {
        meetingRecognition.stop();
        meetingRecognition = null;
        setTranscriptionStatus('Stopping...');
    } else {
        setTranscriptionStatus('Not recording');
    }
}

function clearMeetingTranscript() {
    stopMeetingTranscription();
    meetingTranscriptBuffer = [];
    meetingMinutesCache = '';
    const transcriptArea = document.getElementById('meeting-transcript-text');
    const minutesArea = document.getElementById('meeting-minutes-output');
    if (transcriptArea) transcriptArea.value = '';
    if (minutesArea) minutesArea.value = '';
    setTranscriptionStatus('Ready');
}

function summarizeMeetingTranscript(text) {
    if (!text || !text.trim()) return 'कोई ट्रांसक्रिप्शन उपलब्ध नहीं है। कृपया पहले रिकॉर्ड करें।';
    const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
    const bullets = [];

    lines.forEach(line => {
        const cleaned = line.replace(/\s+/g, ' ').trim();
        if (!cleaned) return;
        const lower = cleaned.toLowerCase();
        if (/action|करना|नोट|निर्देश|मंजूर|निर्णय|decision|follow up|follow-up|todo|टूडू/.test(lower)) {
            bullets.push('• ' + cleaned);
        } else if (/meeting|बैठक|agenda|एजेंडा|topic|विषय|discussion|चर्चा/.test(lower)) {
            bullets.unshift('• ' + cleaned);
        } else {
            bullets.push('• ' + cleaned);
        }
    });

    if (bullets.length === 0) {
        bullets.push('• शॉर्ट ट्रांसक्रिप्शन मिला; कृपया meeting को दोबारा रिकॉर्ड करें।');
    }

    return `Meeting Minutes\n=====================\nDate: ${new Date().toLocaleDateString('hi-IN')}\nTime: ${new Date().toLocaleTimeString('hi-IN', { hour:'2-digit', minute:'2-digit' })}\n\nKey Notes and Actions:\n${bullets.join('\n')}\n\nGenerated from live transcript.`;
}

function generateMeetingMinutes() {
    const transcriptArea = document.getElementById('meeting-transcript-text');
    if (!transcriptArea) return;
    const transcriptText = transcriptArea.value.trim();
    const minutes = summarizeMeetingTranscript(transcriptText);
    meetingMinutesCache = minutes;
    const minutesArea = document.getElementById('meeting-minutes-output');
    if (minutesArea) minutesArea.value = minutes;
    showAssistantToast('📝 Meeting minutes generated.');
}

function copyMeetingMinutes() {
    const minutesArea = document.getElementById('meeting-minutes-output');
    if (!minutesArea || !minutesArea.value.trim()) {
        alert('पहले Meeting Minutes Generate करें।');
        return;
    }
    minutesArea.select();
    document.execCommand('copy');
    showAssistantToast('📋 MOM copied to clipboard.');
}

function downloadMeetingMinutes() {
    const content = meetingMinutesCache || document.getElementById('meeting-minutes-output')?.value || '';
    if (!content.trim()) {
        alert('पहले Meeting Minutes Generate करें।');
        return;
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MOM_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showAssistantToast('⬇️ MOM download started.');
}

function downloadMeetingMinutesPDF() {
    const momText = meetingMinutesCache || document.getElementById('meeting-minutes-output')?.value || '';
    if (!momText.trim()) {
        alert('पहले Meeting Minutes Generate करें।');
        return;
    }

    const pdfContainer = document.createElement('div');
    pdfContainer.style.padding = '20px';
    pdfContainer.style.fontFamily = 'Arial, sans-serif';
    pdfContainer.style.lineHeight = '1.6';
    pdfContainer.style.color = '#000';
    pdfContainer.style.background = '#fff';
    pdfContainer.style.width = '210mm';
    pdfContainer.style.boxSizing = 'border-box';

    const header = document.createElement('div');
    header.innerHTML = `<div style="text-align:center; font-size:18px; font-weight:bold; margin-bottom:10px;">Meeting Minutes</div>`;
    const bodyText = document.createElement('pre');
    bodyText.style.whiteSpace = 'pre-wrap';
    bodyText.style.wordBreak = 'break-word';
    bodyText.style.fontSize = '13px';
    bodyText.textContent = momText;

    pdfContainer.appendChild(header);
    pdfContainer.appendChild(bodyText);

    const opt = {
        margin: 0.5,
        filename: `Meeting_Minutes_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(pdfContainer).save();
}

function showAssistantToast(msg) {
    const toast = document.getElementById('assistant-toast');
    const toastMsg = document.getElementById('toast-msg');
    if(toast && toastMsg) {
        toastMsg.innerText = msg;
        toast.style.display = 'flex';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }
}

// ==========================================
// 7. 3D AVATAR & IMAGE CONVERTER LOGIC
// ==========================================
function normalizeOfficerName(name) {
    if (!name || typeof name !== 'string') return 'Unknown Officer';
    return name.trim();
}

function looksLikeDutyList(text) {
    if (!text || typeof text !== 'string') return false;
    let normalized = text.replace(/<br\s*\/?>/gi, '\n');
    normalized = normalized.replace(/<[^>]+>/g, ' ');
    normalized = normalized.replace(/\r/g, '').trim();
    if (normalized.length === 0) return false;

    const lineCount = (normalized.match(/\n/g) || []).length + 1;
    const semicolonCount = (normalized.match(/;/g) || []).length;
    const commaCount = (normalized.match(/,/g) || []).length;
    const periodCount = (normalized.match(/\./g) || []).length;
    const hyphenCount = (normalized.match(/-/g) || []).length;
    const listMarkers = /(?:^|\s)(?:•|▪|⁃|·|\u2022|\u2023|\d+\.)/;
    const sentenceLike = /[।.!?]/g;
    const words = normalized.split(/\s+/).filter(Boolean).length;
    const keywordMatches = normalized.match(/\b(कार्य|संबंधित|अधिकारी|सेवा|प्रशासन|पदस्थ|विभाग|पद|ड्यूटी|कार्यभार|अनुज्ञप्ति|स्वीकृति|परमाणु|प्रशासक|सेवा)\b/g) || [];

    if (normalized.length > 180 && words > 18) return true;
    if (lineCount > 2 && normalized.length > 90) return true;
    if (semicolonCount >= 3 && normalized.length > 70) return true;
    if (commaCount >= 5 && normalized.length > 90) return true;
    if (periodCount >= 4 && normalized.length > 80) return true;
    if (hyphenCount >= 4 && normalized.length > 80) return true;
    if (listMarkers.test(normalized)) return true;
    if (words > 20 && normalized.length > 90) return true;
    if (sentenceLike.test(normalized) && normalized.length > 120) return true;
    if (keywordMatches.length >= 2 && normalized.length > 60) return true;
    return false;
}

function sanitizeCardField(fieldValue) {
    if (!fieldValue || typeof fieldValue !== 'string') return '';
    if (looksLikeDutyList(fieldValue)) return '';
    const trimmed = fieldValue.trim();
    if (trimmed.length > 120 && trimmed.split(/\s+/).length > 24) return '';
    return trimmed;
}

function getValidImageUrl(url) {
    if (!url || url.trim() === "") return 'https://cdn-icons-png.flaticon.com/512/149/149071.png'; 
    let fileId = "";
    if (url.includes('drive.google.com/file/d/')) {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) fileId = match[1];
    } else if (url.includes('id=')) {
        const match = url.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) fileId = match[1];
    }
    if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w500`;
    return url; 
}

function getInitials(name) {
    if (!name) return 'NA';
    let parts = name.trim().split(' ').filter(Boolean);
    const honorifics = ['श्री', 'श्री.', 'श्रीमान', 'श्रीमती', 'श्रीमान्', 'श्री.', 'Shri', 'Shree', 'Mr', 'Mrs', 'Ms', 'Dr'];
    while (parts.length > 0 && honorifics.includes(parts[0])) {
        parts.shift();
    }
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length > 0) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return 'NA';
}

function getAvatarColor(name) {
    const gradients = [
        'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
        'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
        'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
}

// ==========================================
// 8. CONTACT CARD GENERATOR & RENDER
// ==========================================
function renderContacts(dataToRender) {
    const listDiv = document.getElementById('contact-list');
    if(!listDiv) return;
    listDiv.innerHTML = '';
    dutyStore.clear();
    
    if(dataToRender.length === 0) {
        listDiv.innerHTML = '<p style="color:red; text-align:center;">Koi record nahi mila.</p>';
        return;
    }

    dataToRender.forEach((contact, index) => {
        try {
        const rawDept = contact.Department || contact.विभाग || contact.dept || contact.Dept || '';
        const rawDesig = contact.Designation || contact.पद || contact.designation || '';
        const isDutyLikeDept = looksLikeDutyList(rawDept);
        const isDutyLikeDesig = looksLikeDutyList(rawDesig);
        const cardDept = isDutyLikeDept ? '' : sanitizeCardField(rawDept);
        const cardDesig = isDutyLikeDesig ? '' : sanitizeCardField(rawDesig);
        const modalDept = isDutyLikeDept ? '' : rawDept.toString().trim();
        const modalDesig = isDutyLikeDesig ? '' : rawDesig.toString().trim();
        const rawName = contact["Officer Name"] || contact["अधिकारी का नाम"] || contact.Name || contact.name || 'Unknown Officer';
        const name = normalizeOfficerName(rawName);
        const rawPhone = contact["Mobile/Phone No."] || contact["फ़ोन नंबर"] || contact.Phone || contact.Mobile || contact.phone || '';
        const email = contact.Email || contact.ईमेल || contact.email || '';
        
        const duty = contact.Duty || contact.Role || contact["ड्यूटी"] || '';
        const rawPhotoLink = contact.Photo || contact["Photo URL"] || contact["Photo Link"] || contact.Image || contact["Profile Photo"] || contact["Image URL"] || '';
        const chargeWith = contact["Additional Charge"] || contact["Charge With"] || contact["charge_with"] || contact["Charge"] || contact["चार्ज"] || '';
        // Do not show duty inline on the card — only show via View Duties modal
        const dutyBadgeHTML = '';
        const dutyId = `duty_${currentDirectoryType}_${index}`;
        dutyStore.set(dutyId, { name, desig: modalDesig, dept: modalDept, duty });

     // 🔥 MASTER DETECTOR: Checking every cell safely
        let rawStatus = "Active";
        let isTransferred = false;
        let isLeave = false;

        for (let key in contact) {
            let cellValue = contact[key] ? contact[key].toString().trim() : "";
            let valLower = cellValue.toLowerCase();
            
            let k = key.toLowerCase();
            
            // FIX: Yahan 'duty', 'ड्यूटी', 'role' aur 'photo' columns ko ignore karne ki command add ki hai
            if(k.includes('name') || k.includes('नाम') || k.includes('phone') || 
               k.includes('email') || k.includes('dept') || k.includes('designation') || 
               k.includes('पद') || k.includes('duty') || k.includes('ड्यूटी') || 
               k.includes('role') || k.includes('photo') || k.includes('फ़ोटो')) {
                continue;
            }

            if (valLower === 'apo' || valLower === 'एपीओ' || valLower.includes('transfer') || valLower.includes('स्थानांतरित') || valLower.includes('inactive') || valLower.includes('relieved') || valLower.includes('suspended') || valLower.includes('निलंबित')) {
                rawStatus = cellValue; 
                isTransferred = true;
                break;
            }
            else if (valLower.includes('leave') || valLower.includes('chhutti') || valLower.includes('अवकाश') || valLower.includes('छुट्टी')) {
                rawStatus = cellValue;
                isLeave = true;
                break;
            }
        }

        let statusClass = 'status-active';
        let alertHTML = '';
        if (isTransferred) {
            statusClass = 'status-leave';
            alertHTML = `<p style="margin:2px 0; color:#dc3545; font-size:12px;"><b>Status:</b> ${escapeHtml(rawStatus)}</p>`;
        } else if (isLeave) {
            statusClass = 'status-leave';
            alertHTML = `<p style="margin:2px 0; color:#e67e22; font-size:12px;"><b>Status:</b> ${escapeHtml(rawStatus)}</p>`;
        }

        const photoUrl = getValidImageUrl(rawPhotoLink);

        let profileMediaHTML = '';
        if (photoUrl === 'https://cdn-icons-png.flaticon.com/512/149/149071.png') {
            const initials = getInitials(name);
            const bgGradient = getAvatarColor(name);
            profileMediaHTML = `<div class="avatar-circle" style="background: ${bgGradient};">${initials}</div>`;
        } else {
            profileMediaHTML = `<img src="${photoUrl}" alt="Profile" class="contact-photo" onerror="this.onerror=null; this.outerHTML='<div class=&quot;avatar-circle&quot; style=&quot;background: linear-gradient(135deg, #ccc, #999);&quot;>${getInitials(name)}</div>'">`;
        }

        let waPhone = normalizePhone(rawPhone);
        let displayPhone = rawPhone ? rawPhone.toString().trim() : '<span style="color:red">No Number</span>';

        const isChecked = selectedPhones.has(waPhone) ? "checked" : "";
        const isStarred = starredPhones.has(waPhone);
        const starHTML = waPhone ? `<button class="star-icon" onclick="toggleStar(event, '${waPhone}')" title="Bookmark">${isStarred ? '⭐' : '☆'}</button>` : '';

        const cardStyle = isTransferred ? "opacity: 0.85; background: #fafafa; border-left: 4px solid #dc3545;" : "";

        const card = document.createElement('div');
        card.className = 'contact-card';
        if(isTransferred) card.style.cssText = cardStyle;
        
        const checkboxHTML = waPhone ? `<input type="checkbox" class="contact-checkbox" value="${waPhone}" onchange="toggleSelection(this)" ${isChecked}>` : `<span style="width:20px; display:inline-block;"></span>`;

       let actionsHTML = '';
        if(waPhone) {
            actionsHTML += `<a href="tel:${waPhone.replace('91', '')}" class="action-icon" title="Call">📞</a>`;
            actionsHTML += `<a href="https://wa.me/${waPhone}" target="_blank" class="action-icon" title="WhatsApp"><img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" style="width:24px; height:24px; vertical-align:middle; border-radius:50%;" alt="WhatsApp"></a>`;
            const safeDesigRaw = (modalDesig && modalDesig.length) ? modalDesig : (cardDesig || '');
            const safeDeptRaw = (modalDept && modalDept.length) ? modalDept : (cardDept || '');
            const escSafeDesig = (safeDesigRaw || '').replace(/'/g, "\\'");
            const escSafeDept = (safeDeptRaw || '').replace(/'/g, "\\'");
            actionsHTML += `<button onclick="generateDutyPass('${name.replace(/'/g, "\\'")}', '${escSafeDesig}', '${escSafeDept}', '${waPhone}', '${photoUrl}')" class="action-icon" title="Generate Duty Pass">🪪</button>`;
            actionsHTML += `<button onclick="shareContact('${name.replace(/'/g, "\\'")}', '${escSafeDesig}', '${waPhone.replace('91', '')}')" class="action-icon" title="Share Contact">📤</button>`;
            // Naya OOO Auto-Responder Button
            actionsHTML += `<button onclick="generateOOOMessage('${name.replace(/'/g, "\\'")}', '${escSafeDesig}', '${waPhone}', '${chargeWith.replace(/'/g, "\\'")}')" class="action-icon" title="Send OOO Auto-Reply Draft">🏖️</button>`;
            actionsHTML += `<button onclick="showDutyDetailsFromId('${dutyId}')" class="action-icon duty-btn" title="View Duties">📋</button>`;
        }

        // Email action (render even if no phone exists)
        if(email) {
            actionsHTML += `<a href="mailto:${email}" class="action-icon" title="Email">✉️</a>`;
        }

        // Ensure View Duties button shows even if no phone exists
        if(!waPhone) {
            actionsHTML += `<button onclick="showDutyDetailsFromId('${dutyId}')" class="action-icon duty-btn" title="View Duties">📋</button>`;
        }

        card.innerHTML = `
            <div class="contact-info">
                ${checkboxHTML}
                ${starHTML}
                <div class="photo-wrapper">
                    ${profileMediaHTML}
                    <div class="status-dot ${statusClass}"></div>
                </div>
                
                <div>
                    <strong style="font-size:16px; color:${isTransferred ? '#dc3545' : '#007bff'};">${name}</strong>
                    <p style="margin:2px 0; font-size:13px; color:#333; line-height:1.35;">${cardDesig ? `<b>${cardDesig}</b>` : ''} ${dutyBadgeHTML} ${cardDept ? `<br>(${cardDept})` : ''}</p>
                    <p style="margin:2px 0; color:#555; font-size:13px;">📞 ${displayPhone}</p>
                    ${alertHTML}
                </div>
            </div>
            <div class="contact-actions">
                ${actionsHTML}
            </div>
        `;

        listDiv.appendChild(card);
        } catch (renderErr) {
            console.error('Error rendering contact at index', index, renderErr, contact);
            // show a visible error placeholder so user knows rendering failed
            const errDiv = document.createElement('div');
            errDiv.style = 'padding:12px; border:1px solid #f5c6cb; background:#f8d7da; color:#721c24; border-radius:8px; margin-bottom:10px;';
            errDiv.innerText = `Rendering error for record ${index + 1}. Check console for details.`;
            listDiv.appendChild(errDiv);
        }
    });
}

function showDutyDetailsFromId(dutyId) {
    const payload = dutyStore.get(dutyId);
    if (payload) {
        showDutyDetails(payload.name, payload.desig, payload.dept, payload.duty);
    } else {
        alert('Duty details not found. Please refresh and try again.');
    }
}

// ==========================================
// 9. SELECTION & BOOKMARK WORKFLOW
// ==========================================
function toggleSelection(checkbox) {
    if (checkbox.checked) selectedPhones.add(checkbox.value);
    else selectedPhones.delete(checkbox.value);
    updateBulkActionBar();
}

function toggleSelectAll() {
    isAllSelected = !isAllSelected;
    const checkboxes = document.querySelectorAll('.contact-checkbox');
    const selectAllBtn = document.getElementById('select-all-btn');

    currentFilteredData.forEach(c => {
        let rawPhone = c["Mobile/Phone No."] || c["फ़ोन नंबर"] || c.Phone || c.Mobile || c.phone || '';
        let waPhone = normalizePhone(rawPhone);
        
        if (waPhone) {
            if (isAllSelected) selectedPhones.add(waPhone);
            else selectedPhones.delete(waPhone);
        }
    });

    checkboxes.forEach(cb => { cb.checked = isAllSelected; });

    if (selectAllBtn) {
        if (isAllSelected) {
            selectAllBtn.innerHTML = '☒ Deselect All';
            selectAllBtn.style.background = '#dc3545';
        } else {
            selectAllBtn.innerHTML = '☑️ Select All';
            selectAllBtn.style.background = '#6c757d';
        }
    }
    updateBulkActionBar();
}

function toggleStar(event, phone) {
    event.stopPropagation();
    if (starredPhones.has(phone)) {
        starredPhones.delete(phone);
    } else {
        starredPhones.add(phone);
    }
    localStorage.setItem('starred_phones', JSON.stringify(Array.from(starredPhones)));
    applyFilters();
}

function updateBulkActionBar() {
    const bar = document.getElementById('bulk-action-bar');
    const countSpan = document.getElementById('selected-count');
    if (!bar || !countSpan) return;
    
    if (selectedPhones.size > 0 && currentView !== 'ai') {
        bar.style.display = 'flex';
        countSpan.innerText = `${selectedPhones.size} Selected`;
    } else {
        bar.style.display = 'none';
    }
}

function sendBulkWhatsApp() {
    if (selectedPhones.size === 0) return;
    const message = encodeURIComponent("Namaskar, yeh ek jaroori suchna hai."); 
    const phoneArray = Array.from(selectedPhones);
    alert(`Aapne ${phoneArray.length} contacts select kiye hain. Naye tabs open honge.`);
    phoneArray.forEach((phone, index) => {
        setTimeout(() => { window.open(`https://wa.me/${phone}?text=${message}`, '_blank'); }, index * 1200); 
    });
}

function sendBulkSMS() {
    if (selectedPhones.size === 0) return;
    const phoneString = Array.from(selectedPhones).join(",");
    const message = "Namaskar, yeh ek jaroori suchna hai.";
    window.location.href = `sms:${phoneString}?body=${encodeURIComponent(message)}`;
}

let activeAttendanceMeeting = null;

function getStoredMeetingReminders() {
    try {
        const raw = localStorage.getItem('meetingReminders');
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list.filter(Boolean) : [];
    } catch (e) {
        return [];
    }
}

function getDefaultAttendanceMeetingContext() {
    const reminders = getStoredMeetingReminders()
        .slice()
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    const upcoming = reminders.filter(rem => new Date(rem.datetime).getTime() >= Date.now());
    const candidate = upcoming[0] || reminders[0];
    if (candidate) {
        const dt = new Date(candidate.datetime);
        return {
            title: candidate.title || 'बैठक',
            date: dt.toISOString().slice(0, 10)
        };
    }

    return {
        title: 'बैठक',
        date: new Date().toISOString().slice(0, 10)
    };
}

function getAttendanceMeetingContext() {
    if (!activeAttendanceMeeting || !activeAttendanceMeeting.title) {
        activeAttendanceMeeting = getDefaultAttendanceMeetingContext();
    }
    return activeAttendanceMeeting;
}

function setAttendanceMeetingContext(title, date) {
    const safeTitle = (title || '').trim() || 'बैठक';
    const safeDate = (date || '').trim() || new Date().toISOString().slice(0, 10);
    activeAttendanceMeeting = { title: safeTitle, date: safeDate };
}

function populateAttendanceMeetingSelector() {
    const select = document.getElementById('attendance-meeting-select');
    const dateInput = document.getElementById('attendance-meeting-date');
    if (!select) return;

    const reminders = getStoredMeetingReminders()
        .slice()
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    const context = getAttendanceMeetingContext();
    select.innerHTML = '';

    if (reminders.length) {
        reminders.forEach(rem => {
            const option = document.createElement('option');
            option.value = rem.title || 'बैठक';
            option.textContent = rem.title || 'बैठक';
            select.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.value = context.title;
        option.textContent = context.title;
        select.appendChild(option);
    }

    const currentTitle = context.title || 'बैठक';
    if ([...select.options].some(opt => opt.value === currentTitle)) {
        select.value = currentTitle;
    } else if (select.options.length) {
        select.value = select.options[0].value;
    }

    if (dateInput) {
        const selectedReminder = reminders.find(rem => (rem.title || 'बैठक') === currentTitle);
        const preferredDate = selectedReminder ? new Date(selectedReminder.datetime).toISOString().slice(0, 10) : context.date;
        dateInput.value = preferredDate || context.date || new Date().toISOString().slice(0, 10);
    }

    select.onchange = () => {
        const selectedTitle = select.value || context.title;
        const selectedReminder = reminders.find(rem => (rem.title || 'बैठक') === selectedTitle);
        const selectedDate = selectedReminder ? new Date(selectedReminder.datetime).toISOString().slice(0, 10) : (dateInput ? dateInput.value : context.date);
        setAttendanceMeetingContext(selectedTitle, selectedDate);
        if (dateInput) dateInput.value = selectedDate;
        openAttendanceModal();
    };

    if (dateInput) {
        dateInput.onchange = () => {
            setAttendanceMeetingContext(select.value || context.title, dateInput.value);
            openAttendanceModal();
        };
    }
}

function getAttendanceStorageKey(contactOrKey, context = getAttendanceMeetingContext()) {
    const rawKey = typeof contactOrKey === 'string' ? contactOrKey : getAttendanceKey(contactOrKey);
    const title = (context?.title || '').trim() || 'बैठक';
    const date = (context?.date || '').trim() || new Date().toISOString().slice(0, 10);
    return `${title}::${date}::${rawKey}`;
}

let selectedAttendanceOfficerKey = null;

function selectAttendanceOfficer(key) {
    selectedAttendanceOfficerKey = key || null;
    openAttendanceModal();
}

function getAttendanceKey(contact) {
    const rawPhone = contact["Mobile/Phone No."] || contact["फ़ोन नंबर"] || contact.Phone || contact.Mobile || contact.phone || '';
    const normalized = normalizePhone(rawPhone, false);
    const name = contact["Officer Name"] || contact["अधिकारी का नाम"] || contact.Name || contact.name || 'Unknown';
    const dept = contact.Department || contact.विभाग || contact.dept || '';
    const desig = contact.Designation || contact.पद || contact.designation || '';
    return normalized || `${name}|${dept}|${desig}`;
}

function saveAttendanceState() {
    localStorage.setItem('attendance_statuses', JSON.stringify(attendanceStatuses));
}

function setAttendanceStatus(contact, status) {
    const context = getAttendanceMeetingContext();
    const key = getAttendanceStorageKey(contact, context);
    attendanceStatuses[key] = { status, updatedAt: new Date().toISOString(), meetingTitle: context.title, meetingDate: context.date };
    saveAttendanceState();
}

function getAttendanceStatus(contact) {
    const context = getAttendanceMeetingContext();
    const key = getAttendanceStorageKey(contact, context);
    return attendanceStatuses[key]?.status || 'pending';
}

function openAttendanceModal() {
    const modal = document.getElementById('attendance-modal');
    const body = document.getElementById('attendance-modal-body');
    if (!modal || !body) return;

    populateAttendanceMeetingSelector();

    const source = Array.isArray(currentFilteredData) && currentFilteredData.length
        ? currentFilteredData
        : (Array.isArray(contacts) ? contacts : []);
    body.innerHTML = '';

    const listWrap = document.createElement('div');
    listWrap.style.cssText = 'display:grid; gap:8px;';

    source.forEach((contact) => {
        const key = getAttendanceKey(contact);
        const name = contact["Officer Name"] || contact["अधिकारी का नाम"] || contact.Name || contact.name || 'Unknown';
        const desig = contact.Designation || contact.पद || contact.designation || '';
        const dept = contact.Department || contact.विभाग || contact.dept || '';
        const status = getAttendanceStatus(contact);

        const row = document.createElement('div');
        row.className = 'attendance-row';
        row.style.cssText = 'background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:12px; display:grid; gap:8px;';

        const header = document.createElement('div');
        header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;';
        header.innerHTML = `
            <div>
                <div class="attendance-row-name">${escapeHtml(name)}</div>
                <div class="attendance-row-meta">${escapeHtml(desig || '—')} • ${escapeHtml(dept || '—')}</div>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
                <button type="button" class="attendance-btn" style="border:1px solid #d1d5db; border-radius:6px; padding:8px 10px; cursor:pointer; background:#fff; font-weight:600;" onclick="event.stopPropagation(); markAttendance('${escapeHtml(key)}', 'present')">✅ Present</button>
                <button type="button" class="attendance-btn" style="border:1px solid #d1d5db; border-radius:6px; padding:8px 10px; cursor:pointer; background:#fff; font-weight:600;" onclick="event.stopPropagation(); markAttendance('${escapeHtml(key)}', 'absent')">❌ Absent</button>
                <button type="button" class="attendance-btn" style="border:1px solid #d1d5db; border-radius:6px; padding:8px 10px; cursor:pointer; background:#fff; font-weight:600;" onclick="event.stopPropagation(); markAttendance('${escapeHtml(key)}', 'pending')">⏳ Pending</button>
            </div>
        `;

        if (status === 'present') {
            header.querySelectorAll('.attendance-btn')[0].disabled = true;
            header.querySelectorAll('.attendance-btn')[0].style.background = '#dbeafe';
            header.querySelectorAll('.attendance-btn')[0].style.borderColor = '#2563eb';
        } else if (status === 'absent') {
            header.querySelectorAll('.attendance-btn')[1].disabled = true;
            header.querySelectorAll('.attendance-btn')[1].style.background = '#dbeafe';
            header.querySelectorAll('.attendance-btn')[1].style.borderColor = '#2563eb';
        } else if (status === 'pending') {
            header.querySelectorAll('.attendance-btn')[2].disabled = true;
            header.querySelectorAll('.attendance-btn')[2].style.background = '#dbeafe';
            header.querySelectorAll('.attendance-btn')[2].style.borderColor = '#2563eb';
        }

        row.appendChild(header);
        listWrap.appendChild(row);
    });

    body.appendChild(listWrap);
    modal.style.display = 'flex';
}

function markAttendance(key, status) {
    const context = getAttendanceMeetingContext();
    const storageKey = getAttendanceStorageKey(key, context);
    const currentStatus = attendanceStatuses[storageKey]?.status || 'pending';

    if (currentStatus === status) {
        showAssistantToast(`Already marked as ${status}.`);
        return;
    }

    attendanceStatuses[storageKey] = { status, updatedAt: new Date().toISOString(), meetingTitle: context.title, meetingDate: context.date };
    saveAttendanceState();
    openAttendanceModal();
    showAssistantToast(`Attendance marked as ${status}.`);
}

function closeAttendanceModal() {
    const modal = document.getElementById('attendance-modal');
    if (modal) modal.style.display = 'none';
}

function exportAttendanceExcel() {
    const source = (currentFilteredData && currentFilteredData.length) ? currentFilteredData : contacts;
    const context = getAttendanceMeetingContext();
    const rows = [];
    const summary = new Map();

    rows.push(['बैठक', context.title]);
    rows.push(['तारीख', context.date]);
    rows.push([]);
    rows.push(['क्र.सं.', 'अधिकारी का नाम', 'पद', 'विभाग', 'स्थिति', 'दिनांक']);
    source.forEach((contact, index) => {
        const name = contact["Officer Name"] || contact["अधिकारी का नाम"] || contact.Name || contact.name || 'Unknown';
        const desig = contact.Designation || contact.पद || contact.designation || '';
        const dept = contact.Department || contact.विभाग || contact.dept || '';
        const status = getAttendanceStatus(contact);
        const statusText = status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'Pending';
        rows.push([index + 1, name, desig, dept, statusText, new Date().toLocaleDateString('hi-IN')]);

        const entry = summary.get(dept || 'Unknown') || { present: 0, absent: 0, pending: 0, total: 0 };
        entry.total += 1;
        if (status === 'present') entry.present += 1;
        else if (status === 'absent') entry.absent += 1;
        else entry.pending += 1;
        summary.set(dept || 'Unknown', entry);
    });

    const summaryRows = [['विभाग', 'Present', 'Absent', 'Pending', 'Total']];
    summary.forEach((value, dept) => {
        summaryRows.push([dept, value.present, value.absent, value.pending, value.total]);
    });

    if (window.XLSX && typeof window.XLSX.utils !== 'undefined') {
        const wb = window.XLSX.utils.book_new();
        const ws = window.XLSX.utils.aoa_to_sheet(rows);
        const ws2 = window.XLSX.utils.aoa_to_sheet(summaryRows);
        window.XLSX.utils.book_append_sheet(wb, ws, 'Attendance_Details');
        window.XLSX.utils.book_append_sheet(wb, ws2, 'Attendance_Summary');
        window.XLSX.writeFile(wb, `Officer_Attendance_${(context.title || 'Meeting').replace(/[^a-zA-Z0-9]+/g, '_')}_${context.date}.xlsx`);
        showAssistantToast('Attendance Excel exported.');
    } else {
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Officer_Attendance_${(context.title || 'Meeting').replace(/[^a-zA-Z0-9]+/g, '_')}_${context.date}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showAssistantToast('Attendance CSV exported (XLSX library unavailable).');
    }
}

// ==========================================
// 10. 🏛️ SAMIKSHA BAITHAK EXCEL & A4 PDF ENGINE
// ==========================================
function generateMeetingReport() {
    const existingMeetingModal = document.getElementById('meeting-modal');
    if (existingMeetingModal) existingMeetingModal.remove();

    if (selectedPhones.size === 0) {
        alert("कृपया बैठक में उपस्थित अधिकारियों को चेकबॉक्स द्वारा चुनें!");
        return;
    }

    const today = new Date();
    const dateString = today.toLocaleDateString('hi-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeString = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let presentList = "";
    let absentList = "";
    let presentCount = 0;
    let absentCount = 0;

    contacts.forEach((contact) => {
        const name = contact["Officer Name"] || contact["अधिकारी का नाम"] || contact.Name || contact.name || 'Unknown';
        const desig = contact.Designation || contact.पद || contact.designation || '';
        const dept = contact.Department || contact.विभाग || contact.dept || '';
        const rawPhone = contact["Mobile/Phone No."] || contact["फ़ोन नंबर"] || contact.Phone || contact.Mobile || contact.phone || '';
        
        let waPhone = normalizePhone(rawPhone);

        if (waPhone && selectedPhones.has(waPhone)) {
            presentCount++;
            presentList += `${presentCount}. ${name} (${desig}, ${dept})\n`;
        } else {
            absentCount++;
            absentList += `${absentCount}. ${name} (${desig}, ${dept})\n`;
        }
    });

    let draftText = `कार्यालय जिला कलक्टर एवं जिला मजिस्ट्रेट, फलौदी\n`;
    draftText += `--- समीक्षा बैठक उपस्थिति रिपोर्ट ---\n\n`;
    draftText += `दिनांक: ${dateString} | समय: ${timeString}\n`;
    draftText += `========================================\n\n`;
    draftText += `🟢 उपस्थित अधिकारी (कुल: ${presentCount}):\n`;
    draftText += presentList ? presentList : `- कोई नहीं -\n`;
    draftText += `\n🔴 अनुपस्थित अधिकारी (कुल: ${absentCount}):\n`;
    draftText += absentList ? absentList : `- सभी उपस्थित हैं -\n`;
    draftText += `\n========================================\n`;
    draftText += `Drafted via Collectorate Officer Portal Engine`;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = 'meeting-modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.innerHTML = `
        <h3 style="margin-top:0; color:#6f42c1; font-size:17px;">📋 समीक्षा बैठक उपस्थिति ड्राफ्ट</h3>
        <p style="font-size:12px; color:#666; margin-bottom:8px;">Report ko WhatsApp par share karein ya perfectly structured A4 forms mein download karein:</p>
        <textarea class="meeting-draft-area" id="meeting-draft-text" readonly>${draftText}</textarea>
        
        <div style="margin:10px 0; padding:10px; background:#f8f9fa; border:1px solid #ddd; border-radius:5px; text-align:left;">
            <label style="font-size: 13px; font-weight: bold; color: #333;">📅 नोटिस जारी करने की दिनांक चुनें:</label>
            <input type="date" id="meeting-notice-date" style="padding: 5px; border: 1px solid #ccc; border-radius: 4px; margin-left: 10px; font-family: inherit;">
            <button onclick="triggerShowCausePDF()" style="margin-top:8px; display:block; width:100%; background:#e67e22; color:white; border:none; padding:8px 12px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:12px;">🖨️ Show-Cause Notices (Generate PDF)</button>
        </div>

        <div style="margin-top:10px; display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
            <button onclick="exportMeetingToExcel('${dateString}', '${timeString}', ${presentCount}, ${absentCount})" style="background:#28a745; color:white; border:none; padding:8px 12px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:12px;">📊 Download Excel</button>
            <button onclick="exportMeetingToPDF('${dateString}', '${timeString}', ${presentCount}, ${absentCount})" style="background:#e74c3c; color:white; border:none; padding:8px 12px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:12px;">📄 Download PDF</button>
            <button onclick="copyMeetingDraft()" style="background:#6f42c1; color:white; border:none; padding:8px 12px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:12px;">📋 Copy Text</button>
            <button onclick="closeMeetingModal()" style="background:#6c757d; color:white; border:none; padding:8px 12px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:12px;">❌ Close</button>
        </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
}

function closeMeetingModal() {
    const modal = document.getElementById('meeting-modal');
    if (modal) modal.remove();
}

function copyMeetingDraft() {
    const draftText = document.getElementById('meeting-draft-text');
    if (draftText) {
        draftText.select();
        document.execCommand('copy');
        alert('Report copied to clipboard!');
    }
}

function exportMeetingToExcel(dateString, timeString, presentCount, absentCount) {
    let aoaData = [
        ["कार्यालय जिला कलक्टर एवं जिला मजिस्ट्रेट, फलौदी"],
        ["समीक्षा बैठक उपस्थिति रिपोर्ट (Samiksha Baithak Attendance Report)"],
        ["दिनांक: " + dateString + " | समय: " + timeString],
        ["उपस्थित अधिकारी: " + presentCount + " | अनुपस्थित अधिकारी: " + absentCount + " | कुल अधिकारी संख्या: " + contacts.length],
        [],
        ["क्र.सं.", "अधिकारी का नाम", "पद", "विभाग", "मोबाइल नंबर", "उपस्थिति स्थिति"]
    ];

    let sNo = 1;
    contacts.forEach((contact) => {
        const name = contact["Officer Name"] || contact["अधिकारी का नाम"] || contact.Name || contact.name || 'Unknown';
        const desig = contact.Designation || contact.पद || contact.designation || '';
        const dept = contact.Department || contact.विभाग || contact.dept || '';
        const rawPhone = contact["Mobile/Phone No."] || contact["फ़ोन नंबर"] || contact.Phone || contact.Mobile || contact.phone || '';
        
        let waPhone = rawPhone ? rawPhone.toString().replace(/\s+/g, '') : '';
        if (waPhone && waPhone.length === 10) waPhone = "91" + waPhone;

        let statusStr = (waPhone && selectedPhones.has(waPhone)) ? "🟢 उपस्थित (Present)" : "🔴 अनुपस्थित (Absent)";
        aoaData.push([sNo++, name, desig, dept, rawPhone, statusStr]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Meeting Attendance Board");
    XLSX.writeFile(workbook, `Samiksha_Baithak_Attendance_Report_${dateString.replace(/\//g, '-')}.xlsx`);
}

function exportMeetingToPDF(dateString, timeString, presentCount, absentCount) {
    const tempDiv = document.createElement('div');
    tempDiv.style.padding = "25px";
    tempDiv.style.fontFamily = "Arial, sans-serif";
    tempDiv.style.color = "#333";

    let presentHTML = "";
    let absentHTML = "";
    let pSr = 1, aSr = 1;

    contacts.forEach((contact) => {
        const name = contact["Officer Name"] || contact["अधिकारी का नाम"] || contact.Name || contact.name || 'Unknown';
        const desig = contact.Designation || contact.पद || contact.designation || '';
        const dept = contact.Department || contact.विभाग || contact.dept || '';
        const rawPhone = contact["Mobile/Phone No."] || contact["फ़ोन नंबर"] || contact.Phone || contact.Mobile || '';
        
        let waPhone = normalizePhone(rawPhone);

        const rowStr = `<tr style="border-bottom: 1px solid #ddd;"><td style="padding: 7px; text-align: center; border:1px solid #ddd;">{SR}</td><td style="padding: 7px; border:1px solid #ddd;"><b>${name}</b></td><td style="padding: 7px; border:1px solid #ddd;">${desig}</td><td style="padding: 7px; border:1px solid #ddd;">${dept}</td><td style="padding: 7px; text-align: center; border:1px solid #ddd;">${rawPhone}</td></tr>`;

        if (waPhone && selectedPhones.has(waPhone)) {
            presentHTML += rowStr.replace("{SR}", pSr++);
        } else {
            absentHTML += rowStr.replace("{SR}", aSr++);
        }
    });

    tempDiv.innerHTML = `
        <div style="text-align: center; border-bottom: 3px double #007bff; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #111; font-size:20px;">कार्यालय जिला कलक्टर, फलौदी</h2>
            <h3 style="margin: 6px 0 0 0; color: #444; font-size:16px;">साप्ताहिक समीक्षा बैठक उपस्थिति रिपोर्ट</h3>
            <p style="margin: 6px 0 0 0; font-size: 12px;"><b>बैठक दिनांक:</b> ${dateString} | <b>समय:</b> ${timeString}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #555;"><b>कुल लक्षित अधिकारी संख्या:</b> ${contacts.length} | <b>उपस्थित:</b> ${presentCount} | <b>अनुपस्थित:</b> ${absentCount}</p>
        </div>
        
        <h4 style="color: #28a745; margin: 15px 0 6px 0; font-size:14px;">🟢 उपस्थित अधिकारी (Present Officers List)</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 25px; border:1px solid #ddd;">
            <thead>
                <tr style="background-color: #28a745; color: white;">
                    <th style="padding: 7px; border: 1px solid #ddd; width: 8%;">क्र.सं.</th>
                    <th style="padding: 7px; border: 1px solid #ddd; text-align: left;">अधिकारी का नाम</th>
                    <th style="padding: 7px; border: 1px solid #ddd; text-align: left;">पद</th>
                    <th style="padding: 7px; border: 1px solid #ddd; text-align: left;">विभाग</th>
                    <th style="padding: 7px; border: 1px solid #ddd; width: 18%;">मोबाइल नंबर</th>
                </tr>
            </thead>
            <tbody>${presentHTML ? presentHTML : '<tr><td colspan="5" style="text-align:center; padding:12px; color:#999; font-style:italic;">कोई अधिकारी उपस्थित नहीं मिला।</td></tr>'}</tbody>
        </table>

        <h4 style="color: #dc3545; margin: 15px 0 6px 0; font-size:14px;">🔴 अनुपस्थित अधिकारी (Absent Officers List)</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border:1px solid #ddd;">
            <thead>
                <tr style="background-color: #dc3545; color: white;">
                    <th style="padding: 7px; border: 1px solid #ddd; width: 8%;">क्र.सं.</th>
                    <th style="padding: 7px; border: 1px solid #ddd; text-align: left;">अधिकारी का नाम</th>
                    <th style="padding: 7px; border: 1px solid #ddd; text-align: left;">पद</th>
                    <th style="padding: 7px; border: 1px solid #ddd; text-align: left;">विभाग</th>
                    <th style="padding: 7px; border: 1px solid #ddd; width: 18%;">मोबाइल नंबर</th>
                </tr>
            </thead>
            <tbody>${absentHTML ? absentHTML : '<tr><td colspan="5" style="text-align:center; padding:12px; color:#28a745; font-weight:bold; font-style:italic;">शत-प्रतिशत उपस्थिति! सभी अधिकारी बैठक में उपस्थित हैं।</td></tr>'}</tbody>
        </table>
    `;

    const opt = {
        margin:       0.4,
        filename:     `Samiksha_Baithak_Attendance_Report_${dateString.replace(/\//g, '-')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2.5, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(tempDiv).save();
}

function triggerShowCausePDF() {
    const dateInput = document.getElementById('meeting-notice-date');
    let printDate = "";
    
    if (dateInput && dateInput.value) {
        const parts = dateInput.value.split('-');
        printDate = `${parts[2]}/${parts[1]}/${parts[0]}`; 
    } else {
        const today = new Date();
        printDate = today.toLocaleDateString('hi-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    let absentOfficers = [];
    contacts.forEach(c => {
        let rawPhone = c["Mobile/Phone No."] || c["फ़ोन नंबर"] || c.Phone || c.Mobile || c.phone || '';
        let waPhone = normalizePhone(rawPhone);

        if (waPhone && !selectedPhones.has(waPhone)) {
            absentOfficers.push(c);
        }
    });

    if (absentOfficers.length === 0) {
        alert("सभी अधिकारी उपस्थित हैं! कोई नोटिस जनरेट नहीं होगा।");
        return;
    }

    showAssistantToast(`Generating ${absentOfficers.length} Notices...`);

    const tempDiv = document.createElement('div');
    let htmlContent = "";

    absentOfficers.forEach((officer, index) => {
        let pageBreakHTML = index > 0 ? '<div class="page-break" style="page-break-before: always;"></div>' : '';
        
        htmlContent += `
            ${pageBreakHTML}
            <div style="padding: 20mm; font-family: Arial, sans-serif; color: #000; background: #fff; box-sizing: border-box;">
                <div style="text-align: center; font-size: 16px;">राजस्थान सरकार</div>
                <div style="text-align: center; font-weight: bold; font-size: 24px; margin-bottom: 12px;">कार्यालय जिला कलक्टर फलौदी (राज.)</div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; border-bottom: 3px double #000; padding-bottom: 4px;">
                    <div>Email: oicestablishmdmphalodi@gmail.com</div>
                    <div>Phone No: 02925-222323</div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 15px; margin: 25px 0;">
                    <div>क्रमांक / संस्थापन / 2026 / <b>__________</b></div>
                    <div>दिनांक– यथा हस्ताक्षर</div>
                </div>
                <div style="font-size: 15px; margin-bottom: 25px;">
                    <b>प्रेषितः-</b><br>
                    ${officer["Officer Name"] || ''}<br>${officer["Designation"] || ''}<br>${officer["Department"] || ''}, फलौदी
                </div>
                <div style="font-size: 16px; margin-bottom: 20px; font-weight: bold;">विषय:– कारण बताओ नोटिस।</div>
                <div style="text-align: justify; margin-bottom: 15px; font-size: 16px; line-height: 1.6;">
                    उपरोक्त विषयान्तर्गत लेख है कि दिनांक <b>${printDate}</b> को आयोजित जिला स्तरीय अधिकारीयों की समीक्षा बैठक में आप उपस्थित नहीं हुए थे। जो उच्चाधिकारियों के आदेशो की अवहेलना एवं राजकार्य के प्रति गंभीर लापरवाही की श्रेणी में आता है। जिसके कारण आपके विभाग से संबंधित बिन्दुओं पर चर्चा नहीं हो पायी।
                </div>
                <div style="text-align: justify; margin-bottom: 40px; font-size: 16px; line-height: 1.6;">
                    अतः आपको यह कारण बताओ नोटिस जारी कर निर्देशित किया जाता हैं आप जिला स्तरीय अधिकारियों की समीक्षा बैठक में बिना पूर्व अनुमति के किस कारण से अनुपस्थित रहे हैं। इस के संदर्भ में आप अपना प्रतिउत्तर लिखित में 3 दिवस में अद्योहस्ताक्षरकर्ता को भिजवाया जाना सुनिश्चित करावें अन्यथा आपके खिलाफ कार्यवाही करने हेतु विभाग को लिख दिया जायेगा। जिसकी सम्पूर्ण जिम्मेदारी आपकी होगी।
                </div>
                
                <div style="text-align: right; font-size: 16px;">
                    <b>(अंकित कुमार सिंह)</b><br>जिला कलक्टर<br><b>फलौदी</b>
                </div>
            </div>
        `;
    });

    tempDiv.innerHTML = htmlContent;

    const opt = { 
        margin:       0, 
        filename:     `Show_Cause_Notices_${printDate.replace(/\//g, '-')}.pdf`, 
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true }, 
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: 'css', before: '.page-break' } 
    };

    html2pdf().set(opt).from(tempDiv).save();
}

function shareContact(name, desig, phone) {
    const shareText = `Officer: ${name}\nDesignation: ${desig}\nMobile: ${phone}`;
    if (navigator.share) {
        navigator.share({ title: 'Contact Detail', text: shareText }).catch(err => console.log(err));
    } else {
        navigator.clipboard.writeText(shareText);
        alert("Contact details copied to clipboard!");
    }
}

// ==========================================
// 11. 🪪 DYNAMIC DIGITAL DUTY PASS ENGINE
// ==========================================
function generateDutyPass(name, desig, dept, phone, photoUrl) {
    const existingPassModal = document.getElementById('duty-pass-modal');
    if (existingPassModal) existingPassModal.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = 'duty-pass-modal';

    let photoHTML = '';
    if (photoUrl === 'https://cdn-icons-png.flaticon.com/512/149/149071.png') {
        const initials = getInitials(name);
        const bgGradient = getAvatarColor(name);
        photoHTML = `<div class="duty-pass-avatar" style="background: ${bgGradient};">${initials}</div>`;
    } else {
        photoHTML = `<img src="${photoUrl}" class="duty-pass-photo" alt="Photo" onerror="this.onerror=null; this.outerHTML='<div class=&quot;duty-pass-avatar&quot; style=&quot;background: linear-gradient(135deg, #ccc, #999);&quot;>${getInitials(name)}</div>'">`;
    }

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    modalContent.innerHTML = `
        <div class="duty-pass-card" id="printable-pass-card">
            <div class="duty-pass-header">
                OFFICIAL DUTY PASS
            </div>
            <div class="duty-pass-photo-container">
                ${photoHTML}
            </div>
            <div class="duty-pass-details">
                <p><b>Name:</b> ${name}</p>
                <p><b>Designation:</b> ${desig}</p>
                <p><b>Department:</b> ${dept}</p>
                <p><b>Mobile:</b> ${phone ? phone.replace('91', '') : 'N/A'}</p>
                <p><b>Pass ID:</b> PLD-${Math.floor(100000 + Math.random() * 900000)}</p>
            </div>
            <div class="duty-pass-footer">
                <div style="text-align: left; line-height: 1.2;">
                    <span>Issued By:</span><br>
                    <b>District Admin</b>
                </div>
                <div style="text-align: right;">
                    <span style="display:inline-block; width:35px; height:35px; background:#f0f0f0; border:1px dashed #999; font-size:7px; line-height:1.2; text-align:center; padding-top:6px; box-sizing:border-box; color:#666;">QR Verified</span>
                </div>
            </div>
        </div>
        <div style="margin-top: 10px;">
            <button class="pass-btn" onclick="downloadPassPDF('${name.replace(/'/g, "\\'")}')" style="background: #28a745; color: white;">📥 Save Pass PDF</button>
            <button class="pass-btn" onclick="closePassModal()" style="background: #6c757d; color: white;">❌ Close</button>
        </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
}

function closePassModal() {
    const modal = document.getElementById('duty-pass-modal');
    if (modal) modal.remove();
}

function downloadPassPDF(name) {
    const element = document.getElementById('printable-pass-card');
    if (!element) return;
    
    const opt = {
        margin:       0.15,
        filename:     `Duty_Pass_${name.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2.5, useCORS: true },
        jsPDF:        { unit: 'in', format: [3.5, 5.2], orientation: 'portrait' } 
    };
    html2pdf().set(opt).from(element).save();
}

// ==========================================
// 12. DROPDOWN EXPORT MATRIX FUNCTIONS
// ==========================================
function toggleExportDropdown(event) {
    event.stopPropagation();
    const dropContent = document.getElementById("export-dropdown-content");
    if(dropContent) dropContent.classList.toggle("show-dropdown");
}

window.addEventListener('click', function() {
    const dropdownContent = document.getElementById("export-dropdown-content");
    if (dropdownContent && dropdownContent.classList.contains('show-dropdown')) {
        dropdownContent.classList.remove('show-dropdown');
    }
});

function exportToExcel() {
    if(currentFilteredData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(currentFilteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Officers Data");
    XLSX.writeFile(workbook, "Officer_Directory_Filtered.xlsx");
}

function exportToPDF() {
    if (currentFilteredData.length === 0) {
        alert("Export karne ke liye koi data nahi hai.");
        return;
    }

    const tempDiv = document.createElement('div');
    tempDiv.style.padding = "20px";
    tempDiv.style.fontFamily = "Arial, sans-serif";

    let htmlContent = `
        <h2 style="text-align: center; color: #007bff; margin-bottom: 20px;">Officer Directory (Filtered List)</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
                <tr style="background-color: #007bff; color: white;">
                    <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">S.No.</th>
                    <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Officer Name</th>
                    <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Designation</th>
                    <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Department</th>
                    <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Mobile No.</th>
                </tr>
            </thead>
            <tbody>
    `;

    currentFilteredData.forEach((contact, index) => {
        const name = contact["Officer Name"] || contact["अधिकारी का नाम"] || contact.Name || contact.name || '-';
        const desig = contact.Designation || contact.पद || contact.designation || '-';
        const dept = contact.Department || contact.विभाग || contact.dept || '-';
        const phone = contact["Mobile/Phone No."] || contact["फ़ोन नंबर"] || contact.Phone || contact.Mobile || '-';

        htmlContent += `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${name}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${desig}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${dept}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${phone}</td>
            </tr>
        `;
    });

    htmlContent += `</tbody></table>`;
    tempDiv.innerHTML = htmlContent;

    const opt = {
        margin:       0.5,
        filename:     'Officer_Directory_Filtered.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(tempDiv).save();
}

function clearFontConverter() {
    const unicodeInput = document.getElementById('unicode-input');
    const legacyOutput = document.getElementById('legacy-output');
    if (unicodeInput) unicodeInput.value = '';
    if (legacyOutput) legacyOutput.value = '';
    showAssistantToast('Font converter cleared.');
}

function clearVCPresentation() {
    const vcInput = document.getElementById('vc-presentation-input');
    if (vcInput) vcInput.value = '';
    showAssistantToast('VC Presentation input cleared.');
}

function generateVCPresentation() {
    const rawText = document.getElementById('vc-presentation-input')?.value.trim();
    if (!rawText) {
        alert('कृपया VC प्रस्तुति के लिए कुछ raw notes या numbers डालें।');
        return;
    }

    const slides = buildVCPresentationSlides(rawText);
    const html = buildVCPresentationHtml(slides);
    window.latestVCPresentationSlides = slides;
    window.latestVCPresentationHtml = html;
    showVCPresentationModal(html);
}

function buildVCPresentationSlides(rawText) {
    const lines = rawText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const title = lines[0] && lines[0].length <= 80 ? lines[0] : 'VC Presentation';
    const points = lines.slice(title === lines[0] && lines.length > 1 ? 1 : 0);
    const agenda = [];
    const metrics = [];
    const notes = [];

    points.forEach(line => {
        const lower = line.toLowerCase();
        if (/\d+\s*%|\d+[.,]?\d*\s*(lakh|crore|₹|rs\.?|percent|%)|target|goal|achieve|completion|status/.test(lower)) {
            metrics.push(line);
        } else if (/agenda|key point|objective|aim|goal|deliverable|action item/.test(lower)) {
            agenda.push(line.replace(/^[-•\*\d\.\s]+/, ''));
        } else if (/\b(budget|timeline|deadline|risk|challenge|progress|update)\b/.test(lower)) {
            notes.push(line);
        } else {
            if (agenda.length < 3) agenda.push(line);
            else notes.push(line);
        }
    });

    const slides = [
        { title: title, subtitle: 'Professional VC-ready overview for block-level meetings', type: 'cover' },
        { title: 'Agenda', items: agenda.length ? agenda : ['Agenda details not provided'], type: 'list' },
        { title: 'Key Metrics', items: metrics.length ? metrics : ['Key figures will appear here'], type: 'metrics' },
        { title: 'Highlights', items: notes.length ? notes : ['Additional meeting notes will appear here'], type: 'list' }
    ];

    return slides;
}

function buildVCPresentationHtml(slides) {
    const slideHtml = slides.map(slide => {
        if (slide.type === 'cover') {
            return `
                <section class="vc-slide cover-slide">
                    <div class="vc-cover-inner">
                        <h1>${escapeHtml(slide.title)}</h1>
                        <p>${escapeHtml(slide.subtitle)}</p>
                    </div>
                </section>
            `;
        }

        const listItems = slide.items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
        const contentClass = slide.type === 'metrics' ? 'vc-metrics-grid' : 'vc-list-slide';

        return `
            <section class="vc-slide ${contentClass}">
                <h2>${escapeHtml(slide.title)}</h2>
                <ul>${listItems}</ul>
            </section>
        `;
    }).join('');

    return `
        <!doctype html>
        <html lang="hi">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>VC Presentation</title>
            <style>
                body { margin:0; font-family: Arial, sans-serif; background:#0f172a; color:#f8fafc; }
                .vc-container { display:grid; gap:18px; padding:24px; max-width:1200px; margin:0 auto; }
                .vc-slide { border-radius: 18px; overflow:hidden; box-shadow: 0 24px 80px rgba(15,23,42,.18); background: linear-gradient(135deg, #1f2937, #111827); padding: 32px; }
                .cover-slide { background: linear-gradient(135deg, #2563eb, #4338ca); color:#fff; text-align:center; padding: 56px 32px; }
                .vc-cover-inner h1 { margin:0; font-size: 3rem; letter-spacing: -0.04em; }
                .vc-cover-inner p { margin: 18px auto 0; max-width: 760px; font-size: 1rem; opacity: .85; }
                .vc-slide h2 { margin:0 0 18px; font-size: 1.75rem; color:#fee2e2; }
                .vc-list-slide ul, .vc-metrics-grid ul { list-style: none; padding:0; margin:0; display:grid; gap:12px; }
                .vc-list-slide li { padding: 14px 18px; border-radius: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); }
                .vc-metrics-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
                .vc-metrics-grid li { padding: 20px; border-radius: 16px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); font-weight: bold; }
                .vc-metrics-grid li::before { content: '•'; margin-right: 8px; color: #38bdf8; }
                @media (max-width: 720px) {
                    .vc-cover-inner h1 { font-size: 2.2rem; }
                    .vc-slide { padding: 24px; }
                }
            </style>
        </head>
        <body>
            <div class="vc-container">
                ${slideHtml}
            </div>
        </body>
        </html>
    `;
}

function showVCPresentationModal(htmlContent) {
    const existing = document.getElementById('vc-presentation-modal');
    if (existing) existing.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = 'vc-presentation-modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.maxWidth = '900px';
    modalContent.innerHTML = `
        <h3 style="margin-top:0; color:#6f42c1; font-size:18px;">📈 VC Presentation Preview</h3>
        <p style="margin:0 0 12px 0; color:#444; font-size:14px;">एक professional presentation preview देखने के बाद इसे नई tab में खोलें या HTML copy करें।</p>
        <div style="margin-bottom:16px; display:flex; gap:10px; flex-wrap:wrap;">
            <button onclick="openVCPresentationTab()" style="background:#10b981; color:white; border:none; padding:9px 14px; border-radius:6px; cursor:pointer;">Open in New Tab</button>
            <button onclick="copyVCPresentationHtml()" style="background:#2563eb; color:white; border:none; padding:9px 14px; border-radius:6px; cursor:pointer;">Copy HTML</button>
            <button onclick="exportVCPresentationPPTX()" style="background:#8b5cf6; color:white; border:none; padding:9px 14px; border-radius:6px; cursor:pointer;">Export PPTX</button>
            <button onclick="exportVCPresentationPDF()" style="background:#ef4444; color:white; border:none; padding:9px 14px; border-radius:6px; cursor:pointer;">Export PDF</button>
            <button onclick="exportVCPresentationDocx()" style="background:#f59e0b; color:white; border:none; padding:9px 14px; border-radius:6px; cursor:pointer;">Export Word (.docx)</button>
            <button onclick="closeVCPresentationModal()" style="background:#6c757d; color:white; border:none; padding:9px 14px; border-radius:6px; cursor:pointer;">Close</button>
        </div>
        <textarea id="vc-presentation-html" readonly style="width:100%; min-height:280px; padding:12px; border:1px solid #ccc; border-radius:10px; font-family: monospace; font-size:12px; white-space: pre-wrap; background:#f7f9fb; color:#111;">${escapeHtml(htmlContent)}</textarea>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) closeVCPresentationModal();
    });
    window.latestVCPresentationHtml = htmlContent;
}

function closeVCPresentationModal() {
    const modal = document.getElementById('vc-presentation-modal');
    if (modal) modal.remove();
}

function openVCPresentationTab() {
    if (!window.latestVCPresentationHtml) return;
    const tab = window.open();
    if (tab) {
        tab.document.open();
        tab.document.write(window.latestVCPresentationHtml);
        tab.document.close();
    }
}

function copyVCPresentationHtml() {
    const htmlText = window.latestVCPresentationHtml;
    if (!htmlText) return;
    navigator.clipboard.writeText(htmlText).then(() => {
        showAssistantToast('Presentation HTML copied to clipboard.');
    }).catch(() => {
        alert('Copy failed. Please try again.');
    });
}

// Handle file upload for presentation input (many types). Auto-builds slides and generates PPTX.
async function handlePresentationUpload(event) {
    const inputEl = document.getElementById('vc-upload-input');
    const file = (event && event.target && event.target.files && event.target.files[0]) || (inputEl && inputEl.files && inputEl.files[0]);
    if (!file) { alert('कृपया एक फ़ाइल चुनें।'); return; }

    const name = (file.name || '').toLowerCase();
    let text = '';

    try {
        if (name.endsWith('.xlsx')) {
            const arrayBuffer = await file.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);
            const wb = XLSX.read(data, { type: 'array' });
            const sheet = wb.SheetNames[0];
            const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: '' });
            text = aoa.map(row => row.join(' | ')).join('\n');
        } else if (name.endsWith('.pdf') || file.type === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer();
            text = await extractTextFromPdfArrayBuffer(arrayBuffer);
        } else if (name.endsWith('.docx')) {
            // Use mammoth to extract raw text from docx
            if (window.mammoth && window.mammoth.extractRawText) {
                const arrayBuffer = await file.arrayBuffer();
                const result = await window.mammoth.extractRawText({ arrayBuffer });
                text = result && result.value ? result.value : '';
            } else {
                text = await file.text();
            }
        } else if (name.endsWith('.pptx')) {
            // PPTX parsing is limited; fallback to filename as title
            text = `Presentation: ${file.name}`;
        } else {
            text = await file.text();
        }
    } catch (err) {
        console.error('Upload parse error:', err);
        alert('फ़ाइल पढ़ने या पार्स करने में समस्या आई।');
        return;
    }

    const vcInput = document.getElementById('vc-presentation-input');
    if (vcInput) vcInput.value = text;

    // auto-generate slides
    const slides = buildVCPresentationSlides(text);
    const html = buildVCPresentationHtml(slides);
    window.latestVCPresentationSlides = slides;
    window.latestVCPresentationHtml = html;
    showVCPresentationModal(html);

    // Automatically generate and download PPTX
    try { exportVCPresentationPPTX(); } catch (e) { console.error('Auto PPTX generation failed', e); }
}

function handleLogoUpload(event) {
    const file = (event && event.target && event.target.files && event.target.files[0]);
    if (!file) return;
    // Auto-resize logo to a sensible max while preserving aspect ratio
    const maxW = 600; const maxH = 200;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            let w = img.naturalWidth || img.width;
            let h = img.naturalHeight || img.height;
            const ratio = Math.min(1, maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/png');
            window.vcLogoDataUrl = dataUrl;
            const preview = document.getElementById('vc-logo-preview');
            if (preview) { preview.src = dataUrl; preview.style.display = 'inline-block'; preview.style.height = '32px'; }
            updateVCLivePreview();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function updateVCLivePreview() {
    const preview = document.getElementById('vc-live-slide');
    if (!preview) return;
    const accent = document.getElementById('vc-color-picker')?.value || '#2563eb';
    const titleColor = document.getElementById('vc-title-color-picker')?.value || '#ffffff';
    const logoData = window.vcLogoDataUrl || null;
    preview.innerHTML = '';
    preview.style.background = accent;
    preview.style.color = titleColor;
    preview.style.display = 'flex';
    preview.style.alignItems = 'center';
    preview.style.justifyContent = 'center';
    preview.style.position = 'relative';

    const title = document.createElement('div');
    title.style.fontSize = '20px';
    title.style.fontWeight = '700';
    title.innerText = (document.getElementById('vc-presentation-input')?.value || 'VC Presentation').split('\n')[0];
    preview.appendChild(title);

    if (logoData) {
        const img = document.createElement('img');
        img.src = logoData;
        const size = parseInt(document.getElementById('vc-logo-size')?.value || '100', 10);
        img.style.height = `${Math.round(size * 0.36)}px`;
        img.style.position = 'absolute';
        img.style.right = '12px';
        img.style.top = '12px';
        img.style.borderRadius = '4px';
        preview.appendChild(img);
    }
}

// Hook color pickers and input changes to update preview
document.addEventListener('DOMContentLoaded', function() {
    const cp = document.getElementById('vc-color-picker');
    const tcp = document.getElementById('vc-title-color-picker');
    const pi = document.getElementById('vc-presentation-input');
    const lp = document.getElementById('vc-logo-placement');
    if (cp) cp.addEventListener('input', updateVCLivePreview);
    if (tcp) tcp.addEventListener('input', updateVCLivePreview);
    if (pi) pi.addEventListener('input', updateVCLivePreview);
    if (lp) lp.addEventListener('change', updateVCLivePreview);
    const lsize = document.getElementById('vc-logo-size');
    const tmpl = document.getElementById('vc-template-select');
    if (lsize) lsize.addEventListener('input', updateVCLivePreview);
    if (tmpl) tmpl.addEventListener('change', updateVCLivePreview);
    updateVCLivePreview();
});

async function extractTextFromPdfArrayBuffer(arrayBuffer) {
    try {
        if (typeof pdfjsLib === 'undefined') throw new Error('pdfjsLib not loaded');
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.131/pdf.worker.min.js';
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += '\n' + pageText;
        }
        const trimmed = fullText.trim();
        if (trimmed) return trimmed;

        // Fallback: if PDF has no extractable text (scanned image), perform OCR per page
        const enableHin = document.getElementById('enable-hindi-ocr')?.checked;
        const autoHinEng = document.getElementById('auto-hin-eng-ocr')?.checked;
        let lang = enableHin ? 'hin' : 'eng';
        if (autoHinEng) lang = 'hin+eng';

        if (window.Tesseract) {
            showOcrProgress('Preparing OCR engine...', 5);
                window._ocrAborted = false;
                let ocrText = '';
                const worker = await getTesseractWorker(lang);
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                canvas.width = Math.ceil(viewport.width);
                canvas.height = Math.ceil(viewport.height);
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport }).promise;
                try {
                        if (window._ocrAborted) {
                            console.log('OCR aborted by user');
                            hideOcrProgress();
                            return ocrText.trim();
                        }
                        showOcrProgress(`Running OCR on page ${pageNum} of ${pdf.numPages}...`, Math.round((pageNum - 1) / pdf.numPages * 80) + 10);
                        const { data: { text } } = await worker.recognize(canvas);
                        ocrText += '\n' + (text || '');
                } catch (ocrErr) {
                    console.error('Tesseract OCR error on PDF page', ocrErr);
                }
            }
            hideOcrProgress();
            return ocrText.trim();
        }

        return trimmed;
    } catch (err) {
        console.error('PDF text extraction error', err);
        return '';
    }
}

// OCR helper for image files (jpg/png) using Tesseract.js
async function performOCROnImageFile(file) {
    try {
        const dataURL = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsDataURL(file);
        });

        const img = document.createElement('img');
        img.src = dataURL;
        await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const enableHin = document.getElementById('enable-hindi-ocr')?.checked;
        const autoHinEng = document.getElementById('auto-hin-eng-ocr')?.checked;
        let lang = enableHin ? 'hin' : 'eng';
        if (autoHinEng) lang = 'hin+eng';
        showOcrProgress('Running OCR on image...', 10);
        const worker = await getTesseractWorker(lang);
        if (window._ocrAborted) { hideOcrProgress(); return ''; }
        const { data: { text } } = await worker.recognize(canvas);
        hideOcrProgress();
        return (text || '').trim();
    } catch (err) {
        console.error('Image OCR error', err);
        return '';
    }
}

// Create or return a cached Tesseract worker for a language
async function getTesseractWorker(lang = 'eng') {
    window._tessWorkers = window._tessWorkers || {};
    if (window._tessWorkers[lang]) return window._tessWorkers[lang];

    const langPath = 'https://cdn.jsdelivr.net/gh/naptha/tessdata@4.0.0';
    const worker = Tesseract.createWorker({
        logger: m => {
            if (m && m.status && (m.progress || m.progress === 0)) {
                const percent = Math.round(m.progress * 100);
                showOcrProgress(m.status, percent);
            } else {
                console.log('Tesseract:', m);
            }
        },
        langPath
    });

    await worker.load();
    try {
        await worker.loadLanguage(lang);
        await worker.initialize(lang);
    } catch (e) {
        console.warn('Failed to load language', lang, e);
        // fallback to English
        if (lang !== 'eng') {
            try {
                await worker.loadLanguage('eng');
                await worker.initialize('eng');
            } catch (ee) {
                console.error('Fallback eng load failed', ee);
            }
        }
    }

    window._tessWorkers[lang] = worker;
    return worker;
}

function showOcrProgress(msg = 'OCR in progress...', percent = 0) {
    const overlay = document.getElementById('ocr-progress-overlay');
    if (!overlay) return;
    const bar = document.getElementById('ocr-progress-bar');
    const txt = document.getElementById('ocr-progress-msg');
    txt.innerText = msg;
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    overlay.style.display = 'flex';
}

function hideOcrProgress() {
    const overlay = document.getElementById('ocr-progress-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    const bar = document.getElementById('ocr-progress-bar');
    if (bar) bar.style.width = '0%';
}

function exportVCPresentationPPTX() {
    const slides = window.latestVCPresentationSlides || [];
    if (!slides.length) { alert('पहले प्रस्तुति जनरेट करें।'); return; }

    try {
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE';
        const accent = (document.getElementById('vc-color-picker')?.value || '#2563eb').replace('#','');
        const titleColor = (document.getElementById('vc-title-color-picker')?.value || '#ffffff').replace('#','');
        const includeFooter = !!document.getElementById('vc-include-footer')?.checked;
        const filenameBase = (document.getElementById('vc-output-filename')?.value || '').trim() || `VC_Presentation_${new Date().toISOString().slice(0,10)}`;
        const logoData = window.vcLogoDataUrl || null;

        slides.forEach((s, idx) => {
            const slide = pptx.addSlide();
                // include logo according to placement
                const logoPlacement = (document.getElementById('vc-logo-placement')?.value || 'cover');
                if (logoData && (logoPlacement === 'all' || (logoPlacement === 'cover' && s.type === 'cover'))) {
                    try {
                        const sizePct = parseInt(document.getElementById('vc-logo-size')?.value || '100', 10);
                        const widthIn = (sizePct / 100) * 1.2; // base width inches
                        const heightIn = Math.max(0.3, widthIn * 0.45);
                        slide.addImage({ data: logoData, x:8.4 - (1.2 - widthIn), y:0.12, w: widthIn, h: heightIn });
                    } catch(e) { console.warn('Logo add failed', e); }
                }

            // cover slide styling
            if (s.type === 'cover') {
                slide.background = { fill: accent };
                slide.addText(s.title || '', { x:0.5, y:0.7, w:9, h:1.6, fontSize:36, bold:true, color: titleColor, align: 'center' });
                if (s.subtitle) slide.addText(s.subtitle, { x:0.8, y:2.2, w:8.4, h:0.8, fontSize:14, color: titleColor, align: 'center' });
            } else {
                        // header bar
                        slide.addShape(pptx.ShapeType.rect, { x:0, y:0, w:'100%', h:0.6, fill:{ color: accent } });
                        slide.addText(s.title || '', { x:0.3, y:0.05, w:9, h:0.5, fontSize:18, bold:true, color: titleColor });

                        // choose template
                        const template = document.getElementById('vc-template-select')?.value || 'title_bullets';
                        if (template === 'title_bullets') {
                            if (s.items && s.items.length) {
                                const bullets = s.items.map(it => ({ text: it }));
                                slide.addText(bullets, { x:0.5, y:1.0, w:9, h:4.5, fontSize:18, color:'222222', bullet:true, bulletChar:'•' });
                            }
                        } else if (template === 'two_column') {
                            const left = s.items.slice(0, Math.ceil((s.items||[]).length/2));
                            const right = s.items.slice(Math.ceil((s.items||[]).length/2));
                            if (left.length) slide.addText(left.map(t=>({text:t})), { x:0.4, y:1.0, w:4.3, h:4.5, fontSize:16, bullet:true });
                            if (right.length) slide.addText(right.map(t=>({text:t})), { x:4.9, y:1.0, w:4.3, h:4.5, fontSize:16, bullet:true });
                        } else if (template === 'metrics') {
                            // place each item in a box grid
                            const cols = 2; const gapY = 0.2; const itemH = 1.5; const startY = 1.0;
                            (s.items||[]).forEach((it,i) => {
                                const col = i % cols; const row = Math.floor(i/cols);
                                const x = 0.5 + col * 4.5;
                                const y = startY + row * (itemH + gapY);
                                slide.addShape(pptx.ShapeType.rect, { x, y, w:4.3, h:itemH, fill:{ color:'FFFFFF' } });
                                slide.addText(it, { x:x+0.2, y:y+0.2, w:4.0, h:itemH-0.4, fontSize:16, color:'222222' });
                            });
                        }

                // footer with page number
                if (includeFooter) slide.addText(`Slide ${idx+1}`, { x:8.2, y:6.4, w:1.5, h:0.3, fontSize:10, color:'#777777', align:'right' });
            }
        });

        const fname = `${filenameBase}.pptx`;
        pptx.writeFile({ fileName: fname });
    } catch (err) {
        console.error('PPTX export error', err);
        alert('PPTX export failed.');
    }
}

function exportVCPresentationPDF() {
    const html = window.latestVCPresentationHtml;
    if (!html) { alert('पहले प्रस्तुति जनरेट करें।'); return; }
    const tempDiv = document.createElement('div');
    tempDiv.style.padding = '12px';
    tempDiv.innerHTML = html;
    const filenameBase = (document.getElementById('vc-output-filename')?.value || '').trim() || `VC_Presentation_${new Date().toISOString().slice(0,10)}`;
    const opt = { margin:0.5, filename: `${filenameBase}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{unit:'in',format:'a4'} };
    html2pdf().set(opt).from(tempDiv).save();
}

function exportVCPresentationWord() {
    const html = window.latestVCPresentationHtml;
    if (!html) { alert('पहले प्रस्तुति जनरेट करें।'); return; }
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VC_Presentation_${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Proper .docx export using the `docx` library (browser UMD at window.docx)
async function exportVCPresentationDocx() {
    const slides = window.latestVCPresentationSlides || [];
    if (!slides.length) { alert('पहले प्रस्तुति जनरेट करें।'); return; }

    try {
        const { Document, Packer, Paragraph, HeadingLevel, TextRun } = window.docx || {};
        if (!Document || !Packer) {
            alert('docx library not loaded.');
            return;
        }

        const doc = new Document({ sections: [] });

        slides.forEach(s => {
            const children = [];
            // Title
            children.push(new Paragraph({ text: s.title || '', heading: HeadingLevel.HEADING_1 }));

            if (s.type === 'cover' && s.subtitle) {
                children.push(new Paragraph({ children: [ new TextRun({ text: s.subtitle, italics: true }) ] }));
            }

            if (s.items && s.items.length) {
                s.items.forEach(item => {
                    children.push(new Paragraph({ text: '\u2022 ' + item }));
                });
            }

            doc.addSection({ properties: {}, children });
        });

        const filenameBase = (document.getElementById('vc-output-filename')?.value || '').trim() || `VC_Presentation_${new Date().toISOString().slice(0,10)}`;
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filenameBase}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('DOCX export error', err);
        alert('DOCX export failed.');
    }
}

function toggleUtilityWidget() {
    const widget = document.getElementById('smart-utility-footer');
    if (!widget) return;
    const isExpanded = widget.classList.contains('expanded');
    widget.classList.toggle('expanded', !isExpanded);
    widget.classList.toggle('collapsed', isExpanded);
    const button = widget.querySelector('.utility-widget-toggle');
    if (button) {
        button.innerText = isExpanded ? 'Open Utility ▼' : 'Hide Utility ▲';
    }
    adjustBodyBottomPadding(!isExpanded);
}

function adjustBodyBottomPadding(expanded) {
    document.body.style.paddingBottom = expanded ? '450px' : '100px';
}

function convertHindiFont() {
    const unicodeText = document.getElementById('unicode-input')?.value || '';
    const selectedFont = document.getElementById('legacy-font-select')?.value || 'kruti';
    const outputEl = document.getElementById('legacy-output');

    if (!unicodeText.trim()) {
        alert('कृपया पहले Unicode हिंदी टेक्स्ट पेस्ट करें।');
        return;
    }

    const mapping = LEGACY_FONT_MAPS[selectedFont] || LEGACY_FONT_MAPS.kruti;
    let converted = '';

    for (let char of unicodeText) {
        if (mapping[char]) {
            converted += mapping[char];
        } else {
            converted += char;
        }
    }

    if (outputEl) outputEl.value = converted;
    showAssistantToast(`Converted to ${selectedFont === 'devlys' ? 'DevLys010' : 'Kruti Dev'} legacy font.`);
}

const OFFICE_DASHBOARD_STORAGE_KEY = 'office_dashboard_state';
const DEFAULT_WEATHER_COORDS = { lat: 27.1353, lon: 72.3848, place: 'Phalodi, Rajasthan' };

function loadOfficeDashboard() {
    const raw = localStorage.getItem(OFFICE_DASHBOARD_STORAGE_KEY);
    let state = { holidays: [], circulars: [], weather: null, weatherCoords: DEFAULT_WEATHER_COORDS };
    try { state = raw ? JSON.parse(raw) : state; } catch (e) { state = { holidays: [], circulars: [], weather: null, weatherCoords: DEFAULT_WEATHER_COORDS }; }
    window.officeDashboardState = state;
    updateOfficeDashboardUI();
}

function saveOfficeDashboard() {
    if (!window.officeDashboardState) return;
    localStorage.setItem(OFFICE_DASHBOARD_STORAGE_KEY, JSON.stringify(window.officeDashboardState));
}

function updateOfficeDashboardUI() {
    const holidaysList = document.getElementById('office-holidays-list');
    const holidaysInput = document.getElementById('office-holidays-input');
    const circularsList = document.getElementById('office-circulars-list');
    const weatherDisplay = document.getElementById('office-weather-display');
    const weatherCoordsInput = document.getElementById('office-weather-coords');
    const state = window.officeDashboardState || { holidays: [], circulars: [], weather: null, weatherCoords: DEFAULT_WEATHER_COORDS };

    if (holidaysInput) holidaysInput.value = state.holidays.join('\n');
    if (holidaysList) {
        holidaysList.innerHTML = '';
        if (state.holidays.length === 0) {
            holidaysList.innerHTML = '<li style="color:#64748b;">No holidays added yet.</li>';
        } else {
            state.holidays.forEach(item => {
                const li = document.createElement('li');
                li.style.marginBottom = '4px';
                li.innerText = item;
                holidaysList.appendChild(li);
            });
        }
    }
    if (weatherCoordsInput) weatherCoordsInput.value = `${state.weatherCoords.lat},${state.weatherCoords.lon}`;
    if (weatherDisplay) {
        if (state.weather) {
            weatherDisplay.innerHTML = `
                <div style="font-weight:700; margin-bottom:6px;">${state.weather.location || DEFAULT_WEATHER_COORDS.place}</div>
                <div>Temperature: <b>${state.weather.temperature}°C</b></div>
                <div>Condition: <b>${state.weather.description}</b></div>
                <div>Wind: <b>${state.weather.windspeed} km/h</b></div>
                <div>Updated: <b>${state.weather.updatedAt}</b></div>
            `;
        } else {
            weatherDisplay.innerText = 'Weather data not loaded. Click Refresh Weather.';
        }
    }
    if (circularsList) {
        circularsList.innerHTML = '';
        if (!state.circulars || state.circulars.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.style.color = '#475569';
            placeholder.style.fontSize = '13px';
            placeholder.innerText = 'No circulars added yet.';
            circularsList.appendChild(placeholder);
        } else {
            state.circulars.forEach(circ => {
                const box = document.createElement('div');
                box.style.border = '1px solid #d1fae5';
                box.style.padding = '10px';
                box.style.borderRadius = '8px';
                box.style.marginBottom = '8px';
                box.style.background = '#ffffff';
                box.innerHTML = `
                    <div style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start;">
                        <div>
                            <div style="font-weight:700; color:#0f766e;">${escapeHtml(circ.title)}</div>
                            <div style="font-size:13px; color:#334155; margin-top:4px; white-space:pre-wrap;">${escapeHtml(circ.text)}</div>
                        </div>
                        <button onclick="removeOfficeCircular('${circ.id}')" style="background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:12px;">Remove</button>
                    </div>
                `;
                circularsList.appendChild(box);
            });
        }
    }
}

function parseCoords(input) {
    if (!input) return { lat: DEFAULT_WEATHER_COORDS.lat, lon: DEFAULT_WEATHER_COORDS.lon, place: DEFAULT_WEATHER_COORDS.place };
    const pieces = input.split(',').map(p => p.trim()).filter(Boolean);
    if (pieces.length === 2 && !isNaN(pieces[0]) && !isNaN(pieces[1])) {
        return { lat: Number(pieces[0]), lon: Number(pieces[1]), place: `Location ${pieces[0]},${pieces[1]}` };
    }
    return { lat: DEFAULT_WEATHER_COORDS.lat, lon: DEFAULT_WEATHER_COORDS.lon, place: DEFAULT_WEATHER_COORDS.place };
}

async function fetchOfficeWeather() {
    const coordsInput = document.getElementById('office-weather-coords')?.value || '';
    const coords = parseCoords(coordsInput);
    if (!window.officeDashboardState) loadOfficeDashboard();
    window.officeDashboardState.weatherCoords = coords;
    saveOfficeDashboard();
    const display = document.getElementById('office-weather-display');
    if (display) display.innerText = 'Loading weather...';

    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&timezone=Asia/Kolkata`);
        const data = await response.json();
        const current = data.current_weather;
        const weather = {
            temperature: current.temperature,
            windspeed: current.windspeed,
            description: mapWeatherCodeToLabel(current.weathercode),
            location: coords.place,
            updatedAt: new Date().toLocaleTimeString('hi-IN', { hour:'2-digit', minute:'2-digit' })
        };
        window.officeDashboardState.weather = weather;
        saveOfficeDashboard();
        updateOfficeDashboardUI();
    } catch (error) {
        console.error('Weather fetch failed:', error);
        if (display) display.innerText = 'Weather fetch failed. Check internet or coordinates.';
        showAssistantToast('Weather update failed.');
    }
}

function setManualWeatherData() {
    const location = prompt('Enter weather location description (e.g. Phalodi, Rajasthan):', DEFAULT_WEATHER_COORDS.place);
    if (!location) return;
    const temp = prompt('Enter temperature (°C):', '35');
    const wind = prompt('Enter wind speed (km/h):', '12');
    const desc = prompt('Enter weather description:', 'Clear skies');
    if (!temp || !wind || !desc) return;
    if (!window.officeDashboardState) loadOfficeDashboard();
    window.officeDashboardState.weather = {
        temperature: Number(temp),
        windspeed: Number(wind),
        description: desc,
        location: location,
        updatedAt: new Date().toLocaleTimeString('hi-IN', { hour:'2-digit', minute:'2-digit' })
    };
    saveOfficeDashboard();
    updateOfficeDashboardUI();
    showAssistantToast('Manual weather data updated.');
}

function mapWeatherCodeToLabel(code) {
    const map = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        56: 'Light freezing drizzle',
        57: 'Dense freezing drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        66: 'Light freezing rain',
        67: 'Heavy freezing rain',
        71: 'Slight snow fall',
        73: 'Moderate snow fall',
        75: 'Heavy snow fall',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
    };
    return map[code] || 'Unknown';
}

function saveOfficeHolidays() {
    const raw = document.getElementById('office-holidays-input')?.value || '';
    const holidays = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!window.officeDashboardState) loadOfficeDashboard();
    window.officeDashboardState.holidays = holidays;
    saveOfficeDashboard();
    updateOfficeDashboardUI();
    showAssistantToast('Govt holidays saved.');
}

function addOfficeCircular() {
    const title = (document.getElementById('office-circular-title')?.value || '').trim();
    const text = (document.getElementById('office-circular-text')?.value || '').trim();
    if (!title || !text) { alert('Please provide both title and circular details.'); return; }
    if (!window.officeDashboardState) loadOfficeDashboard();
    window.officeDashboardState.circulars = window.officeDashboardState.circulars || [];
    window.officeDashboardState.circulars.unshift({ id: 'circ-' + Date.now(), title, text });
    saveOfficeDashboard();
    document.getElementById('office-circular-title').value = '';
    document.getElementById('office-circular-text').value = '';
    updateOfficeDashboardUI();
    showAssistantToast('Important circular added.');
}

function removeOfficeCircular(id) {
    if (!window.officeDashboardState) loadOfficeDashboard();
    window.officeDashboardState.circulars = (window.officeDashboardState.circulars || []).filter(item => item.id !== id);
    saveOfficeDashboard();
    updateOfficeDashboardUI();
    showAssistantToast('Circular removed.');
}

async function startPdfExtraction() {
    const fileInput = document.getElementById('pdf-extract-input');
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        alert('कृपया पहले एक PDF फ़ाइल चुनें।');
        return;
    }

    const file = fileInput.files[0];
    if (typeof pdfjsLib === 'undefined') {
        alert('PDF.js लोड नहीं हुआ। कृपया पेज को रीफ्रेश करें।');
        return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.131/pdf.worker.min.js';
    const reader = new FileReader();

    reader.onload = async function(event) {
        try {
            const arrayBuffer = event.target.result;
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let allRows = [];

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const content = await page.getTextContent();
                const pageText = content.items.map(item => item.str).join(' ');
                const lines = pageText.split(/\r?\n|\u2028|\u2029/).map(line => line.trim()).filter(Boolean);

                lines.forEach(line => {
                    const columns = line.split(/\s{2,}|\t/).map(cell => cell.trim()).filter(Boolean);
                    if (columns.length > 1) {
                        allRows.push(columns);
                    } else {
                        allRows.push([line]);
                    }
                });
            }

            if (allRows.length === 0) {
                alert('PDF से कोई टेक्स्ट extract नहीं हुआ।');
                return;
            }

            const worksheet = XLSX.utils.aoa_to_sheet(allRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Extracted PDF Data');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            XLSX.writeFile(workbook, `PDF_Extracted_Data_${timestamp}.xlsx`);
            showAssistantToast('PDF extraction complete, Excel file generated.');
        } catch (error) {
            console.error('PDF extraction error:', error);
            alert('PDF extraction में समस्या आई। कृपया फ़ाइल सही है या नहीं चेक करें।');
        }
    };

    reader.readAsArrayBuffer(file);
}

// ==========================================
// 13. WINDOW SCROLL MANAGEMENT (BACK TO TOP)
// ==========================================
window.addEventListener('scroll', function() {
    const topBtn = document.getElementById("back-to-top");
    if(!topBtn) return;
    if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
        topBtn.style.display = "block";
    } else {
        topBtn.style.display = "none";
    }
});

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// 14. INITIALIZATION WINDOW LOAD
// ==========================================
window.onload = function() {
    loadTheme();
    changeLanguage();
    applySheetUrlInputs();
    ensureMeetingModalDom();
    fetchGoogleSheet();
    loadMeetingReminders();
    scheduleAllReminders();
    loadOfficeDashboard();
    // Ensure Add Reminder button is reliably bound (some browsers may block inline handlers)
    try {
        const addBtn = document.getElementById('meeting-add-btn');
        if (addBtn && !addBtn._bound) {
            addBtn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); addMeetingReminder(); });
            addBtn._bound = true;
        }
        // modal buttons
        const modalSave = document.getElementById('modal-save-btn');
        const modalCancel = document.getElementById('modal-cancel-btn');
        if (modalSave && !modalSave._bound) {
            modalSave.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); saveMeetingFromModal(); });
            modalSave._bound = true;
        }
        if (modalCancel && !modalCancel._bound) {
            modalCancel.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); closeMeetingModal(); });
            modalCancel._bound = true;
        }
    } catch (e) { console.warn('Binding add reminder button failed', e); }
    // Prefill meeting date/time with sensible defaults if empty
    try {
        const dateEl = document.getElementById('meeting-date');
        const timeEl = document.getElementById('meeting-time');
        const now = new Date();
        if (dateEl && !dateEl.value) dateEl.value = now.toISOString().slice(0,10);
        if (timeEl && !timeEl.value) {
            const mins = Math.ceil(now.getMinutes()/5)*5;
            const hh = String(now.getHours()).padStart(2,'0');
            const mm = String(mins%60).padStart(2,'0');
            timeEl.value = `${hh}:${mm}`;
        }
    } catch (e) { console.warn('Prefill meeting date/time failed', e); }
};

// ==========================================
// 15. PWA & SERVICE WORKER ENGINE
// ==========================================
let deferredPrompt;

// -------- Meeting Reminders (local scheduling + Notifications API) --------
window._meetingTimers = window._meetingTimers || {};

function requestNotificationPermission() {
    if (!('Notification' in window)) { alert('Notifications not supported in this browser.'); return; }
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') showAssistantToast('Notifications enabled.');
        else showAssistantToast('Notifications permission denied.');
    });
}

function addMeetingReminder() {
    openMeetingModal();
}

function ensureMeetingModalDom() {
    let modal = document.getElementById('meeting-modal');
    const needsModal = !modal || !document.getElementById('modal-meeting-title') || !document.getElementById('modal-meeting-venue') || !document.getElementById('modal-meeting-date') || !document.getElementById('modal-meeting-time') || !document.getElementById('modal-meeting-notify') || !document.getElementById('modal-save-btn') || !document.getElementById('modal-cancel-btn');

    if (needsModal) {
        if (modal) modal.remove();
        modal = document.createElement('div');
        modal.id = 'meeting-modal';
        modal.style.cssText = 'display:none; position:fixed; inset:0; z-index:3000; align-items:center; justify-content:center; background:rgba(0,0,0,0.35);';
        modal.innerHTML = `
            <div style="background:#fff; padding:18px; border-radius:10px; width:420px; max-width:94%; box-shadow:0 10px 30px rgba(0,0,0,0.25);">
                <h3 id="meeting-modal-title" style="margin:0 0 10px 0; font-size:18px;">Add Meeting Reminder</h3>
                <input id="modal-meeting-id" type="hidden" />
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <label style="font-size:13px; color:#333;">Title</label>
                    <input id="modal-meeting-title" type="text" placeholder="उदाहरण: साप्ताहिक समीक्षा बैठक" style="padding:8px; border:1px solid #ccc; border-radius:6px;" />
                    <label style="font-size:13px; color:#333;">Venue</label>
                    <input id="modal-meeting-venue" type="text" placeholder="जिला कलक्टर सभाकक्ष / VC हॉल" style="padding:8px; border:1px solid #ccc; border-radius:6px;" />
                    <div style="display:flex; gap:8px;">
                        <div style="flex:1;">
                            <label style="font-size:13px; color:#333;">Date</label>
                            <input id="modal-meeting-date" type="date" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;" />
                        </div>
                        <div style="width:140px;">
                            <label style="font-size:13px; color:#333;">Time</label>
                            <input id="modal-meeting-time" type="time" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;" />
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <label style="font-size:13px; color:#333; min-width:110px;">Notify before (min)</label>
                        <input id="modal-meeting-notify" type="number" value="15" style="width:90px; padding:8px; border:1px solid #ccc; border-radius:6px;" />
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:6px;">
                        <button id="modal-cancel-btn" type="button" style="background:#6c757d; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">Cancel</button>
                        <button id="modal-save-btn" type="button" style="background:#2563eb; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">Save Reminder</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }

    const saveBtn = document.getElementById('modal-save-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    if (saveBtn && !saveBtn._bound) {
        saveBtn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); saveMeetingFromModal(); });
        saveBtn._bound = true;
    }
    if (cancelBtn && !cancelBtn._bound) {
        cancelBtn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); closeMeetingModal(); });
        cancelBtn._bound = true;
    }

    return modal;
}

function openMeetingModal(reminder) {
    try {
        const modal = ensureMeetingModalDom();
        const mid = document.getElementById('modal-meeting-id');
        const title = document.getElementById('modal-meeting-title');
        const venue = document.getElementById('modal-meeting-venue');
        const date = document.getElementById('modal-meeting-date');
        const time = document.getElementById('modal-meeting-time');
        const notify = document.getElementById('modal-meeting-notify');
        const now = new Date();

        if (!modal || !title || !venue || !date || !time || !notify) return;

        if (reminder) {
            mid.value = reminder.id || '';
            title.value = reminder.title || '';
            venue.value = reminder.venue || '';
            const dt = new Date(reminder.datetime);
            date.value = dt.toISOString().slice(0,10);
            time.value = dt.toTimeString().slice(0,5);
            notify.value = reminder.notifyBefore || 15;
            document.getElementById('meeting-modal-title').innerText = 'Edit Meeting Reminder';
        } else {
            mid.value = '';
            title.value = document.getElementById('meeting-title')?.value || '';
            venue.value = '';
            date.value = document.getElementById('meeting-date')?.value || now.toISOString().slice(0,10);
            time.value = document.getElementById('meeting-time')?.value || (String(now.getHours()).padStart(2,'0') + ':' + String(Math.ceil(now.getMinutes()/5)*5).padStart(2,'0'));
            notify.value = document.getElementById('meeting-notify-minutes')?.value || 15;
            document.getElementById('meeting-modal-title').innerText = 'Add Meeting Reminder';
        }

        modal.style.display = 'flex';
        title.focus();
    } catch (e) { console.error('openMeetingModal error', e); }
}

function closeMeetingModal() {
    try {
        const modal = document.getElementById('meeting-modal');
        if (modal) modal.style.display = 'none';
    } catch (e) { console.warn('closeMeetingModal failed', e); }
}

function saveMeetingFromModal() {
    try {
        const mid = document.getElementById('modal-meeting-id');
        const titleEl = document.getElementById('modal-meeting-title');
        const venueEl = document.getElementById('modal-meeting-venue');
        const dateEl = document.getElementById('modal-meeting-date');
        const timeEl = document.getElementById('modal-meeting-time');
        const notifyEl = document.getElementById('modal-meeting-notify');

        const title = (titleEl?.value || '').trim();
        const venue = (venueEl?.value || '').trim();
        const date = dateEl?.value;
        const time = timeEl?.value;
        const notify = parseInt(notifyEl?.value || '15',10) || 15;

        if (!title) { alert('Please enter meeting title.'); titleEl?.focus(); return; }
        if (!date) { alert('Please select meeting date.'); dateEl?.focus(); return; }
        if (!time) { alert('Please enter meeting time.'); timeEl?.focus(); return; }

        const dt = new Date(date + 'T' + time);
        let list = loadMeetingReminders();

        if (mid && mid.value) {
            // edit existing
            const idx = list.findIndex(r => r.id === mid.value);
            if (idx !== -1) {
                list[idx].title = title;
                list[idx].datetime = dt.toISOString();
                list[idx].notifyBefore = notify;
                list[idx].venue = venue;
                localStorage.setItem('meetingReminders', JSON.stringify(list));
                renderMeetingReminders(list);
                scheduleReminder(list[idx]);
                showAssistantToast('Reminder updated.');
            }
        } else {
            const id = 'mr-' + Date.now();
            const createdAt = new Date().toISOString();
            const reminder = { id, title, datetime: dt.toISOString(), notifyBefore: notify, venue, createdAt, isNew: true };
            list.push(reminder);
            localStorage.setItem('meetingReminders', JSON.stringify(list));
            renderMeetingReminders(list);
            scheduleReminder(reminder);
            showAssistantToast('Meeting reminder added.');
        }

        // keep main inputs in sync
        try { document.getElementById('meeting-date').value = date; document.getElementById('meeting-time').value = time; document.getElementById('meeting-notify-minutes').value = notify; } catch(e){}

        closeMeetingModal();
    } catch (e) { console.error('saveMeetingFromModal error', e); }
}

function loadMeetingReminders() {
    const raw = localStorage.getItem('meetingReminders');
    let list = [];
    try { list = raw ? JSON.parse(raw) : []; } catch(e) { list = []; }
    renderMeetingReminders(list);
    return list;
}

function openVenueDirections(venue) {
    const destination = (venue || '').trim();
    if (!destination) {
        showAssistantToast('Venue जानकारी नहीं मिली।');
        return;
    }

    const destinationEncoded = encodeURIComponent(destination);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationEncoded}`;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
                const url = `${mapsUrl}&origin=${encodeURIComponent(origin)}`;
                window.open(url, '_blank', 'noopener,noreferrer');
                showAssistantToast('Directions opening...');
            },
            () => {
                window.open(`https://www.google.com/maps/search/?api=1&query=${destinationEncoded}`, '_blank', 'noopener,noreferrer');
                showAssistantToast('Opening map search for venue.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        window.open(`https://www.google.com/maps/search/?api=1&query=${destinationEncoded}`, '_blank', 'noopener,noreferrer');
        showAssistantToast('Opening map search for venue.');
    }
}

function renderMeetingNotice(list) {
    const noticeContent = document.getElementById('meeting-notice-content');
    if (!noticeContent) return;

    const upcoming = (list || [])
        .filter(rem => {
            const ts = new Date(rem.datetime).getTime();
            return !Number.isNaN(ts) && ts >= Date.now();
        })
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    if (!upcoming.length) {
        noticeContent.innerHTML = '<div class="notice-empty">कोई आगामी बैठक निर्धारित नहीं है</div>';
        return;
    }

    const noticeItems = upcoming.map(rem => {
        const dt = new Date(rem.datetime);
        const dateOnly = dt.toLocaleDateString('hi-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeOnly = dt.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
        const venue = rem.venue ? rem.venue : 'वेने्यू जोड़ें';
        let createdTs = NaN;
        if (rem.createdAt) createdTs = new Date(rem.createdAt).getTime();
        else if (rem.id && rem.id.startsWith('mr-')) {
            const parts = rem.id.split('-');
            const t = parseInt(parts[1], 10);
            if (!Number.isNaN(t)) createdTs = t;
        }
        const isNew = !!rem.isNew || (!Number.isNaN(createdTs) && (Date.now() - createdTs <= 7 * 24 * 60 * 60 * 1000));
        const titleText = (rem.title || '').trim();
        const titleIsWeekly = titleText.toLowerCase().includes('साप्ताहिक विभागीय समीक्षा बैठक'.toLowerCase());
        const showNew = isNew || titleIsWeekly;

        // debug: log title and NEW flag
        try { console.debug('renderMeetingNotice:', { id: rem.id, title: titleText, isNew, titleIsWeekly, showNew }); } catch(e){}

        return `
            <div class="notice-item ${titleIsWeekly ? 'weekly' : ''}">
                ${showNew ? '<span class="new-burst">NEW</span>' : ''}
                <div class="notice-title">${escapeHtml(rem.title || 'बैठक')}</div>
                <div class="notice-meta">
                    <span>📅 ${dateOnly}</span>
                    <span>🕒 ${timeOnly}</span>
                </div>
                <div class="notice-meta">
                    <span class="venue-link" onclick="openVenueDirections(${JSON.stringify(venue)})">📍 ${escapeHtml(venue)}</span>
                </div>
            </div>
        `;
    }).join('');

    noticeContent.innerHTML = `
        <div class="important-badge">⚠️ IMPORTANT</div>
        <div class="notice-list">${noticeItems}</div>
    `;
}

function renderMeetingReminders(list) {
    const ul = document.getElementById('meeting-reminder-list');
    if (!ul) return;
    ul.innerHTML = '';
    const sorted = (list || []).sort((a,b)=> new Date(a.datetime)-new Date(b.datetime));
    sorted.forEach(rem => {
        const li = document.createElement('li');
        li.style.padding = '10px';
        li.style.borderBottom = '1px solid #eef2f7';
        const dt = new Date(rem.datetime);
        const dateOnly = dt.toLocaleDateString('hi-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeOnly = dt.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
        li.innerHTML = `
            <div style="display:flex; gap:10px; align-items:center;">
                <div style="flex:1">
                    <div style="font-weight:700; color:#1f2937;">${escapeHtml(rem.title)}</div>
                    <div style="font-size:13px; color:#374151; margin-top:6px; display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                        <span style="background:#eef2ff; padding:6px 8px; border-radius:6px; font-weight:600;">Date: ${dateOnly}</span>
                        <span style="background:#fff4e6; padding:6px 8px; border-radius:6px; font-weight:600;">Time: ${timeOnly}</span>
                        ${rem.venue ? `<span class="meeting-reminder-venue-link" onclick="openVenueDirections(${JSON.stringify(rem.venue)})">📍 ${escapeHtml(rem.venue)}</span>` : ''}
                        <span style="color:#6b7280; font-size:12px; margin-left:8px;">Notify ${rem.notifyBefore} min before</span>
                    </div>
                </div>
                <div style="display:flex; gap:6px;">
                    <button onclick="editMeetingReminder('${rem.id}')" title="Edit" style="background:#f3f4f6;border:1px solid #d1d5db;padding:6px 8px;border-radius:6px;">Edit</button>
                    <button onclick="snoozeMeetingReminder('${rem.id}',10)" title="Snooze 10min" style="background:#fff7ed;border:1px solid #fbbf24;padding:6px 8px;border-radius:6px;">Snooze</button>
                    <button onclick="removeMeetingReminder('${rem.id}')" title="Remove" style="background:#ef4444;color:#fff;border:none;padding:6px 8px;border-radius:6px;">Remove</button>
                </div>
            </div>
        `;
        ul.appendChild(li);
    });
    // update upcoming count
    renderMeetingNotice(sorted);

    const countEl = document.getElementById('meeting-upcoming-count');
    if (countEl) {
        let txt = `(${sorted.length} upcoming)`;
        if (sorted.length > 0) {
            const next = sorted[0];
            const ndt = new Date(next.datetime);
            const nd = ndt.toLocaleDateString('hi-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const nt = ndt.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
            txt += ` · Next: ${nd} @ ${nt}`;
        }
        countEl.innerText = txt;
    }
}

function editMeetingReminder(id) {
    const list = loadMeetingReminders();
    const rem = (list||[]).find(r=>r.id===id);
    if (!rem) return;
    openMeetingModal(rem);
}

function snoozeMeetingReminder(id, minutes=10) {
    const list = loadMeetingReminders();
    const rem = (list||[]).find(r=>r.id===id);
    if (!rem) return;
    const dt = new Date(rem.datetime);
    dt.setMinutes(dt.getMinutes() + minutes);
    rem.datetime = dt.toISOString();
    localStorage.setItem('meetingReminders', JSON.stringify(list));
    renderMeetingReminders(list);
    scheduleReminder(rem);
    showAssistantToast(`Snoozed ${rem.title} by ${minutes} minutes.`);
}

function clearAllReminders() {
    if (!confirm('Are you sure you want to remove all meeting reminders?')) return;
    // clear timers
    Object.keys(window._meetingTimers||{}).forEach(k => { clearTimeout(window._meetingTimers[k]); });
    window._meetingTimers = {};
    localStorage.removeItem('meetingReminders');
    renderMeetingReminders([]);
    showAssistantToast('All reminders cleared.');
}

function removeMeetingReminder(id) {
    let list = loadMeetingReminders();
    list = list.filter(r => r.id !== id);
    localStorage.setItem('meetingReminders', JSON.stringify(list));
    // clear timer
    if (window._meetingTimers[id]) { clearTimeout(window._meetingTimers[id]); delete window._meetingTimers[id]; }
    renderMeetingReminders(list);
    showAssistantToast('Reminder removed.');
}

function scheduleReminder(reminder) {
    try {
        const id = reminder.id;
        if (window._meetingTimers[id]) { clearTimeout(window._meetingTimers[id]); }
        const when = new Date(reminder.datetime).getTime() - (reminder.notifyBefore||0)*60000;
        const now = Date.now();
        if (when <= now) {
            // if in the past, skip or fire immediately
            showMeetingNotification(reminder);
            return;
        }
        const delay = when - now;
        window._meetingTimers[id] = setTimeout(() => {
            showMeetingNotification(reminder);
            delete window._meetingTimers[id];
        }, delay);
    } catch (e) { console.error('scheduleReminder error', e); }
}

function scheduleAllReminders() {
    const list = loadMeetingReminders();
    (list||[]).forEach(r => scheduleReminder(r));
    // schedule daily summary at 08:00 local time
    scheduleDailySummary();
}

function scheduleDailySummary() {
    try {
        const now = new Date();
        const next = new Date();
        next.setHours(8,0,0,0);
        if (next.getTime() <= now.getTime()) next.setDate(next.getDate()+1);
        const delay = next.getTime() - now.getTime();
        if (window._dailySummaryTimer) clearTimeout(window._dailySummaryTimer);
        window._dailySummaryTimer = setTimeout(() => { sendDailyMeetingSummary(); scheduleDailySummary(); }, delay);
    } catch (e) { console.error('scheduleDailySummary', e); }
}

function sendDailyMeetingSummary() {
    const list = loadMeetingReminders();
    const today = new Date();
    const todays = (list||[]).filter(r => {
        const d = new Date(r.datetime);
        return d.getFullYear()===today.getFullYear() && d.getMonth()===today.getMonth() && d.getDate()===today.getDate();
    });
    if (!todays.length) return;
    const title = `आपके आज के ${todays.length} मीटिंग्स`; 
    const body = todays.map(r=> `${new Date(r.datetime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${r.title}`).join('\n');
    const notification = { title, body };
    showNotification(notification.title, notification.body);
    playBeepSound();
}

function showMeetingNotification(rem) {
    const title = `Meeting: ${rem.title}`;
    const body = `Scheduled at ${new Date(rem.datetime).toLocaleString()}`;
    showNotification(title, body);
    showAssistantToast(`Reminder: ${rem.title}`);
    playBeepSound();
}

function playBeepSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800; // Hz
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) { console.warn('Beep sound failed (may be blocked by browser)', e); }
}

function showNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        // prefer service worker if available
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg && reg.showNotification) {
                    reg.showNotification(title, { body, tag: 'meeting-reminder', renotify:true });
                } else {
                    new Notification(title, { body });
                }
            });
        } else {
            new Notification(title, { body });
        }
    } else {
        Notification.requestPermission().then(p => { if (p==='granted') showNotification(title, body); });
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered Successfully!', reg.scope))
            .catch(err => console.error('Service Worker Registration Failed!', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

function installPWA() {
    if (!deferredPrompt) {
        showAssistantToast("⚠️ Install option sirf live server (https) ya mobile browser par kaam karta hai.");
        return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            showAssistantToast("📲 App installing on your device...");
        }
        deferredPrompt = null;
    });
}

window.addEventListener('appinstalled', (evt) => {
    showAssistantToast("✅ App Successfully Installed!");
});


// ==========================================
// 16. 🤖 HIGH-LEVEL AI BILINGUAL DRAFTER LOGIC
// ==========================================
function injectSamplePrompt(type) {
    const promptInput = document.getElementById('ai-prompt-input');
    if(!promptInput) return;
    
    if(type === 1) {
        promptInput.value = "तहसील कार्यालय के औचक निरीक्षण में रमेश कुमार कनिष्ठ सहायक अनुपस्थित मिले, उन्हें 3 दिवस का कारण बताओ नोटिस जारी करो।";
    } else if(type === 2) {
        promptInput.value = "आगामी साप्ताहिक समीक्षा बैठक (VC) दिनांक 15 जून को दोपहर 12 बजे कलक्टर कक्ष में आयोजित होगी। समस्त ब्लॉक स्तरीय अधिकारियों को उपस्थिति सुनिश्चित करने हेतु आदेश जारी करें।";
    }
}

function startAIDrafterVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Aapka browser Voice Recognition support nahi karta. Google Chrome use karein.");
        return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    
    const micBtn = document.getElementById('ai-mic-btn');
    recognition.onstart = function() {
        if(micBtn) micBtn.style.color = '#dc3545';
        showAssistantToast("🤖 AI Draft Engine listening, say your criteria...");
    };
    recognition.onend = function() {
        if(micBtn) micBtn.style.color = '#6f42c1';
    };
    recognition.onresult = function(event) {
        const text = event.results[0][0].transcript;
        document.getElementById('ai-prompt-input').value = text;
    };
    recognition.start();
}

function processAIDraftingEngine() {
    const promptText = document.getElementById('ai-prompt-input').value.trim();
    if(!promptText) {
        alert("कृपया AI को ड्राफ्ट करने के लिए कुछ निर्देश लिखें या बोलें!");
        return;
    }

    showAssistantToast("⚡ NLP Performa Parser mapping structural bounds...");
    
    setTimeout(() => {
      const dateInput = document.getElementById('ai-notice-date');
        let dateStr = "";
        if (dateInput && dateInput.value) {
            const parts = dateInput.value.split('-');
            dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`; 
        } else {
            const today = new Date();
            dateStr = today.toLocaleDateString('hi-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        
        let extractedName = "...........................";
        let extractedDesig = "संबंधित कर्मचारी";
        let extractedLocation = "जिला कार्यालय, फलौदी";
        let extractedDays = "3";

        const nameMatch = promptText.match(/(?:श्री|श्रीमती|अधिकारी|कर्मचारी)\s+([अ-हौैाीूिेो्\s]+?)(?:\s+(?:कनिष्ठ|सहायक|Tehsildar|SDM|कलरूक|$))/i) || promptText.match(/में\s+([अ-हौैाीूिेो्\s]+?)\s+(?:अनुपस्थित|गैर)/);
        if(nameMatch && nameMatch[1]) extractedName = nameMatch[1].trim();

        if(promptText.includes("रमेश")) extractedName = "श्री रमेश कुमार";
        if(promptText.includes("कनिष्ठ सहायक")) extractedDesig = "कनिष्ठ सहायक";
        if(promptText.includes("तहसील")) extractedLocation = "तहसील कार्यालय, फलौदी";
        
        const daysMatch = promptText.match(/(\d+)\s*(?:दिवस|दिन|days)/);
        if(daysMatch && daysMatch[1]) extractedDays = daysMatch[1];

        let htmlDraftContent = "";

        if (promptText.includes("notice") || promptText.includes("नोटिस") || promptText.includes("अनुपस्थित") || promptText.includes("absent")) {
            htmlDraftContent = `
                <div style="font-family: Arial, sans-serif; color: #000; line-height: 1.8; font-size: 15px; box-sizing: border-box;">
                    <div style="text-align: center; font-size: 16px; margin-bottom: 2px;">राजस्थान सरकार</div>
                    <div style="text-align: center; font-weight: bold; font-size: 24px; margin-bottom: 12px;">कार्यालय जिला कलक्टर फलौदी (राज.)</div>
                    
                    <div style="display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 4px;">
                        <div>Email:- <span style="color: blue; text-decoration: underline;">oicestablishmdmphalodi@gmail.com</span></div>
                        <div>Phone No:- 02925-222323</div>
                    </div>
                    
                    <div style="border-bottom: 4px double #4a1515; margin-bottom: 12px;"></div>
                    
                    <div style="display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 25px;">
                        <div>क्रमांक / संस्थापन / 2026 / <span style="display:inline-block; width:60px; border-bottom:1px solid #000;"></span></div>
                        <div>दिनांक– यथा हस्ताक्षर</div>
                    </div>

                    <div style="font-size: 16px; margin-bottom: 30px; text-align: left;">
                        <b style="font-size: 17px;"><u>प्रेषित</u>ः-</b>
                        <div style="padding-left: 80px; margin-top: -22px; line-height: 1.6; font-weight: bold;">
                            ${extractedName}<br>
                            ${extractedDesig}<br>
                            ${extractedLocation}
                        </div>
                    </div>

                    <div style="font-size: 16px; margin-bottom: 25px; text-align: left; font-weight: bold;">
                        विषय:– कारण बताओ नोटिस।
                    </div>

                    <div style="text-align: justify; text-indent: 60px; margin-bottom: 15px; font-size: 16px;">
                        उपरोक्त विषयान्तर्गत लेख है कि दिनांक <span style="font-weight: bold;">${dateStr}</span> को आयोजित जिला स्तरीय अधिकारीयों की समीक्षा बैठक में आप उपस्थित नही हुए थे। जो उच्चाधिकारियों के आदेशो की अवहेलना एवं राजकार्य के प्रति गंभीर लापरवाही की श्रेणी में आता है। जिसके कारण आपके विभाग से संबंधित बिन्दुओं पर चर्चा नही हो पायी।
                    </div>
                    
                    <div style="text-align: justify; text-indent: 60px; margin-bottom: 0px; font-size: 16px;">
                        अत: आपको यह कारण बताओ नोटिस जारी कर निर्देशित किया जाता हैं आप जिला स्तरीय अधिकारियों की समीक्षा बैठक में बिना पूर्व अनुमति के किस कारण से अनुपस्थित रहे हैं। इस के संदर्भ में आप अपना प्रतिउत्तर लिखित में <span style="font-weight: bold;">${extractedDays} दिवस</span> में अद्योहस्ताक्षरकर्ता को भिजवाया जाना सुनिश्चित करावें अन्यथा आपके खिलाफ कार्यवाही करने हेतु विभाग को लिख दिया जायेगा। जिसकी सम्पूर्ण जिम्मेदारी आपकी होगी।
                    </div>
                    
                    <br><br><br>

                    <div style="text-align: right; font-size: 16px;">
                        <b>(अंकित कुमार सिंह)</b><br>
                        जिला कलक्टर<br>
                        <b>फलौदी</b>
                    </div>
                </div>
            `;
        } else {
            let dateMeeting = dateStr || "आगामी दिनांक";
            let timeMeeting = "12:00 दोपहर";
            htmlDraftContent = `
                <div style="font-family: Arial, sans-serif; color: #000; line-height: 1.8; font-size: 15px; box-sizing: border-box;">
                    <div style="text-align: center; font-size: 16px; margin-bottom: 2px;">राजस्थान सरकार</div>
                    <div style="text-align: center; font-weight: bold; font-size: 24px; margin-bottom: 12px;">कार्यालय जिला कलक्टर फलौदी (राज.)</div>
                    
                    <div style="display: flex; justify-content: space-between; font-size: 13px; padding-bottom: 4px;">
                        <div>Email:- <span style="color: blue; text-decoration: underline;">oicestablishmdmphalodi@gmail.com</span></div>
                        <div>Phone No:- 02925-222323</div>
                    </div>
                    
                    <div style="border-bottom: 4px double #4a1515; margin-bottom: 12px;"></div>
                    
                    <div style="display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 25px;">
                        <div>क्रमांक / जनसुनवाई-वीसी / 2026 / <b></b></div>
                        <div>दिनांक– यथा हस्ताक्षर</div>
                    </div>

                    <div style="font-size: 16px; margin-top: 30px; margin-bottom: 25px; font-weight: bold; text-align: center; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; background-color:#f9f9f9; letter-spacing:1px;">
                        कार्यालय आदेश / OFFICE ORDER
                    </div>

                    <div style="text-align: justify; text-indent: 60px; margin-bottom: 20px; font-size: 16px;">
                        राज्य सरकार के दिशा-निर्देशों की अनुपालना एवं जनसमस्याओं के त्वरित निस्तारण हेतु आगामी जिला स्तरीय साप्ताहिक समीक्षा बैठक (Video Conferencing) का आयोजन दिनांक <b>${dateMeeting}</b> को <b>${timeMeeting}</b> बजे जिला कलक्टर महोदय की अध्यक्षता में 'कलक्टर सभाकक्ष' में किया जाना सुनिश्चित हुआ है।
                    </div>
                    
                    <div style="text-align: justify; text-indent: 60px; margin-bottom: 0px; font-size: 16px;">
                        अतः फलौदी जिले के समस्त उपखंड अधिकारी (SDM), तहसीलदार, विकास अधिकारी (BDO) एवं संबंधित ब्लॉक स्तरीय अधिकारी अपने-अपने विभाग की अद्यतन प्रगति रिपोर्ट (Pendency Data Sheet) के साथ नियत समय पर बैठक में उपस्थिति सुनिश्चित करेंगे। किसी भी स्तर पर कोताही पाए जाने पर नियमानुसार सख्त कार्रवाई की जाएगी।
                    </div>
                    
                    <br><br><br>

                    <div style="text-align: right; font-size: 16px;">
                        <b>(अंकित कुमार सिंह)</b><br>
                        जिला कलक्टर<br>
                        <b>फलौदी, राजस्थान</b>
                    </div>
                </div>
            `;
        }

        document.getElementById('ai-parchment-document-canvas').innerHTML = htmlDraftContent;
        document.getElementById('ai-preview-card-frame').style.display = 'block';
        showAssistantToast("✔ Layout Grid margins fixed exactly to Word bounds.");
    }, 1200);
}

function downloadAIDraftedPDF() {
    const element = document.getElementById('ai-parchment-document-canvas');
    if (!element) return;
    
    showAssistantToast("Rendering clean PDF layout...");

    // FIX: Temporarily remove strict heights to prevent overflow blank page
    const originalMinHeight = element.style.minHeight;
    const originalMaxHeight = element.style.maxHeight;
    element.style.minHeight = 'auto';
    element.style.maxHeight = 'auto';
    
    const opt = {
        margin:       0, 
        filename:     `AI_Govt_Draft_Notice_Phalodi.pdf`,
        image:        { type: 'jpeg', quality: 0.99 },
        html2canvas:  { scale: 2.5, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        // Restore height after print
        element.style.minHeight = originalMinHeight;
        element.style.maxHeight = originalMaxHeight;
    });
}

// ==========================================
// 17. SMART OUT OF OFFICE (OOO) GENERATOR
// ==========================================
// ==========================================
// 17. SMART OUT OF OFFICE (OOO) GENERATOR (With Dates)
// ==========================================
function generateOOOMessage(name, desig, phone, chargeWith) {
    // 📅 User se Dates input lena
    const startDate = prompt("अवकाश शुरू होने की दिनांक दर्ज करें (जैसे: 15 June या 'आज से'):", "आज से");
    if (startDate === null) return; // Agar user ne Cancel kar diya toh function rok do

    const endDate = prompt("अवकाश समाप्त होने या वापस लौटने की दिनांक दर्ज करें (जैसे: 20 June):", "");
    if (endDate === null) return; // Agar user ne Cancel kar diya toh function rok do

    // Date ko message ke format mein set karna
    let dateString = "";
    if (startDate && endDate) {
        dateString = ` दिनांक ${startDate} से ${endDate} तक `;
    } else if (startDate) {
        dateString = ` दिनांक ${startDate} से `;
    } else if (endDate) {
        dateString = ` दिनांक ${endDate} तक `;
    } else {
        dateString = " ";
    }

    // 🏛️ Sarkari standard ka formal Hindi draft
    let message = `*Out of Office (OOO) - Auto Reply*\n\n`;
    message += `नमस्कार,\nमैं (${name}, ${desig})${dateString}आधिकारिक प्रवास/अवकाश पर हूँ और कार्यालय में उपलब्ध नहीं हूँ।\n`;

    // Agar sheet mein kisi ke paas charge hai, toh uska naam automatic aayega
    if (chargeWith && chargeWith.trim() !== '') {
        message += `\nमेरी अनुपस्थिति में मेरे पद का अतिरिक्त कार्यभार ${chargeWith} के पास है। किसी भी अति आवश्यक शासकीय कार्य के लिए आप उनसे या कार्यालय में संपर्क कर सकते हैं।\n`;
    } else {
        message += `\nअति आवश्यक शासकीय कार्य के लिए कृपया कार्यालय में संपर्क करें।\n`;
    }

    message += `\nसंदेश के लिए धन्यवाद।`;

    const encodedMessage = encodeURIComponent(message);

    // WhatsApp logic ya Clipboard fallback
    if (phone && phone !== 'null' && phone !== '') {
        const confirmMsg = "क्या आप यह OOO ड्राफ्ट सीधे इस अधिकारी के WhatsApp पर भेजना चाहते हैं ताकि वे इसे अपना Auto-Reply सेट कर सकें?";
        if (confirm(confirmMsg)) {
            // Direct officer ka chat open hoga text pre-filled ke sath
            window.open(`https://wa.me/${phone.replace('91', '')}?text=${encodedMessage}`, '_blank');
        } else {
            navigator.clipboard.writeText(message);
            showAssistantToast("📋 Draft copied to clipboard!");
        }
    } else {
        navigator.clipboard.writeText(message);
        showAssistantToast("📋 Number nahi hai, Draft copied to clipboard!");
    }
}

// ==========================================
// ==========================================
// 11.5 VIEW DUTIES DETAILS MODAL
// ==========================================
function escapeHtml(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderDutyHtml(dutyText) {
    let normalized = dutyText.toString().replace(/\r/g, '').replace(/\\n/g, '\n').replace(/<br\s*\/?>/gi, '\n').trim();
    if (!normalized) {
        return '<div>Duty information not available for this officer.</div>';
    }

    const items = normalized.split(/\r?\n|;|•|▪|⁃|·|\u2022|\u2023/).map(item => item.trim()).filter(Boolean);
    if (items.length <= 1) {
        return `<div style="text-align:left; white-space: pre-wrap;">${escapeHtml(normalized)}</div>`;
    }

    // Limit removed: Ab ye 100+ duties bina kisi error ke list me show karega
    return `<div style="text-align:left;">
                <ol style="margin:0 0 10px 18px; padding-left:18px; line-height:1.6;">
                    ${items.map(i => `<li style="margin-bottom: 6px;">${escapeHtml(i)}</li>`).join('')}
                </ol>
            </div>`;
}

function showDutyDetails(name, desig, dept, duty) {
    const existing = document.getElementById('duty-details-modal');
    if (existing) existing.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = 'duty-details-modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    const dutyText = duty && duty.toString().trim() ? duty.toString() : '';
    const dutiesHtml = renderDutyHtml(dutyText);

    modalContent.innerHTML = `
        <h3 style="margin-top:0; color:#007bff; font-size:17px;">📋 Officer Duties</h3>
        <div style="text-align:left; margin-bottom:10px; font-size:14px;"><b>Name:</b> ${escapeHtml(name)}<br><b>Designation:</b> ${escapeHtml(desig)}<br><b>Department:</b> ${escapeHtml(dept || '-')}</div>
        <div style="text-align:left; background:#f8f9fa; padding:12px; border-radius:8px; border:1px solid #e9ecef; margin-bottom:12px; font-size:14px; max-height:70vh; overflow-y:auto;">${dutiesHtml}</div>
        <div style="display:flex; gap:8px; justify-content:center;">
            <button onclick="closeDutyDetails()" style="background:#6c757d; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">Close</button>
        </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) closeDutyDetails();
    });
}

function closeDutyDetails() {
    const modal = document.getElementById('duty-details-modal');
    if (modal) modal.remove();
}

function cancelOcrOperations() {
    // terminate all active workers
    if (!window._tessWorkers) return;
    Object.keys(window._tessWorkers).forEach(async k => {
        try {
            const w = window._tessWorkers[k];
            if (w && typeof w.terminate === 'function') {
                await w.terminate();
            }
        } catch (e) {
            console.warn('Worker terminate failed', e);
        }
        delete window._tessWorkers[k];
    });
    window._tessWorkers = {};
    window._ocrAborted = true;
    hideOcrProgress();
}
// Add to script.js
async function handleChat() {
    const input = document.getElementById('ai-chat-input').value.toLowerCase();
    const output = document.getElementById('ai-chat-output');
    
    if (!input) return;
    output.innerText = "Searching in data...";

    // Simple local search logic (Context-based)
    const result = contacts.find(c => 
        (c["Officer Name"] || "").toLowerCase().includes(input) || 
        (c["Designation"] || "").toLowerCase().includes(input) ||
        (c["Department"] || "").toLowerCase().includes(input)
    );

    if (result) {
        output.innerHTML = `<b>Found:</b> ${result["Officer Name"]}<br>
                            <b>Desig:</b> ${result["Designation"]}<br>
                            <b>Phone:</b> ${result["Mobile/Phone No."]}`;
    } else {
        output.innerText = "Sorry, koi match nahi mila. Try different keywords.";
    }
}
