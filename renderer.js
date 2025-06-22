// renderer.js - Now with super-smart compatibility checking and a selfie camera!

document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    const packageJsonState = {
        name: "my-awesome-project",
        version: "1.0.0",
        description: "A fantastic new project.",
        main: "index.js",
        scripts: { "test": "echo \"Error: no test specified\" && exit 1" },
        keywords: [],
        author: "",
        license: "ISC",
        dependencies: {},
        devDependencies: {}
    };
    let selectedFolderPath = null;
    const packageDetailsCache = new Map(); // Cache for storing fetched package details!

    // --- UI Elements ---
    const projectNameInput = document.getElementById('projectName');
    const projectVersionInput = document.getElementById('projectVersion');
    const projectDescriptionInput = document.getElementById('projectDescription');
    const npmUsernameInput = document.getElementById('npmUsername');
    const fetchUserPackagesBtn = document.getElementById('fetchUserPackagesBtn');
    const userPackagesContainer = document.getElementById('userPackagesContainer');
    const npmSearchInput = document.getElementById('npmSearch');
    const searchBtn = document.getElementById('searchBtn');
    const searchResultsContainer = document.getElementById('searchResultsContainer');
    const outputPre = document.getElementById('output');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const screenshotBtn = document.getElementById('screenshotBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const selectFolderBtn = document.getElementById('selectFolderBtn');
    const selectedFolderP = document.getElementById('selectedFolder');
    const publishBtn = document.getElementById('publishBtn');
    const publishOutputPre = document.getElementById('publishOutput');
    const warningsContainer = document.getElementById('compatibilityWarnings');
    const warningList = document.getElementById('warningList');

    // --- Core Functions ---

    const renderOutput = () => {
        const sortedDeps = Object.keys(packageJsonState.dependencies).sort().reduce((obj, key) => { obj[key] = packageJsonState.dependencies[key]; return obj; }, {});
        const sortedDevDeps = Object.keys(packageJsonState.devDependencies).sort().reduce((obj, key) => { obj[key] = packageJsonState.devDependencies[key]; return obj; }, {});

        const displayState = {
            ...packageJsonState,
            dependencies: sortedDeps,
            devDependencies: sortedDevDeps
        };
        outputPre.textContent = JSON.stringify(displayState, null, 2);
    };

    const updateProjectDetails = () => {
        packageJsonState.name = projectNameInput.value;
        packageJsonState.version = projectVersionInput.value;
        packageJsonState.description = projectDescriptionInput.value;
        renderOutput();
    };

    // --- Compatibility Checker Logic ---
    const checkCompatibility = async () => {
        const allDeps = { ...packageJsonState.dependencies, ...packageJsonState.devDependencies };
        const peerRequirements = {}; 
        
        warningsContainer.classList.add('hidden');
        warningList.innerHTML = '';

        for (const name of Object.keys(allDeps)) {
            let details = packageDetailsCache.get(name);
            if (!details) {
                details = await window.electronAPI.getPackageDetails(name);
                packageDetailsCache.set(name, details);
            }

            if (details && details.peerDependencies) {
                for (const peerDepName in details.peerDependencies) {
                    if (!peerRequirements[peerDepName]) {
                        peerRequirements[peerDepName] = [];
                    }
                    peerRequirements[peerDepName].push({
                        version: details.peerDependencies[peerDepName],
                        requiredBy: name
                    });
                }
            }
        }
        
        let hasConflicts = false;
        for (const peerDepName in peerRequirements) {
            const versions = peerRequirements[peerDepName];
            const uniqueVersions = [...new Set(versions.map(v => v.version))];
            if (uniqueVersions.length > 1) {
                hasConflicts = true;
                const li = document.createElement('li');
                let requirementText = `<strong>${peerDepName}</strong> has conflicting requirements: `;
                requirementText += versions.map(v => `<code>${v.version}</code> (from ${v.requiredBy})`).join(', ');
                li.innerHTML = requirementText;
                warningList.appendChild(li);
            }
        }

        if (hasConflicts) {
            warningsContainer.classList.remove('hidden');
        }
    };
    
    // --- Helper function for adding dependencies ---
    const addDependency = (name, version, isDev = false) => {
        const depType = isDev ? 'devDependencies' : 'dependencies';
        const otherDepType = isDev ? 'dependencies' : 'devDependencies';
        if (packageJsonState[otherDepType][name]) {
            delete packageJsonState[otherDepType][name];
        }
        packageJsonState[depType][name] = `^${version}`;
        renderOutput();
        checkCompatibility();
    };
    
    const renderPackageList = (packages, container) => {
        container.innerHTML = '';
        if (!packages || packages.length === 0) {
            container.innerHTML = `<p style="color: #6b7280; font-style: italic;">No packages found.</p>`;
            return;
        }
        const list = document.createElement('div');
        list.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';
        
        packages.forEach(pkg => {
            const pkgDiv = document.createElement('div');
            pkgDiv.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background-color: #f3f4f6; padding: 0.5rem; border-radius: 0.375rem;';
            
            const nameSpan = document.createElement('span');
            nameSpan.style.cssText = 'font-family: monospace; font-size: 0.875rem;';
            nameSpan.textContent = `${pkg.name}@${pkg.version}`;
            pkgDiv.appendChild(nameSpan);

            const btnGroup = document.createElement('div');
            btnGroup.style.cssText = 'display: flex; gap: 0.25rem;';
            
            const addDepBtn = document.createElement('button');
            addDepBtn.textContent = '+Dep';
            addDepBtn.title = "Add to dependencies";
            addDepBtn.style.cssText = 'padding: 0.25rem 0.5rem; font-size: 0.75rem; font-weight: 600; color: white; background-color: #3b82f6; border-radius: 0.25rem;';
            addDepBtn.onclick = () => addDependency(pkg.name, pkg.version, false);
            
            const addDevDepBtn = document.createElement('button');
            addDevDepBtn.textContent = '+Dev';
            addDevDepBtn.title = "Add to devDependencies";
            addDevDepBtn.style.cssText = 'padding: 0.25rem 0.5rem; font-size: 0.75rem; font-weight: 600; color: white; background-color: #f97316; border-radius: 0.25rem;';
            addDevDepBtn.onclick = () => addDependency(pkg.name, pkg.version, true);
            
            btnGroup.appendChild(addDepBtn);
            btnGroup.appendChild(addDevDepBtn);
            pkgDiv.appendChild(btnGroup);
            list.appendChild(pkgDiv);
        });
        container.appendChild(list);
    };

    const fetchFromNPM = async (url) => {
        loadingIndicator.classList.remove('hidden');
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`NPM API Error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error("Failed to fetch from NPM:", error);
            alert("Could not fetch packages. Please check the console for details.");
            return null;
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    };
    
    const handleFetchUserPackages = async () => {
        const username = npmUsernameInput.value.trim();
        if (!username) return;
        const data = await fetchFromNPM(`https://registry.npmjs.org/-/v1/search?text=maintainer:${username}&size=100`);
        if (data && data.objects) renderPackageList(data.objects.map(obj => obj.package), userPackagesContainer);
    };
    
    const handleSearchNPM = async () => {
        const query = npmSearchInput.value.trim();
        if (!query) return;
        const data = await fetchFromNPM(`https://registry.npmjs.org/-/v1/search?text=${query}&size=20`);
        if (data && data.objects) renderPackageList(data.objects.map(obj => obj.package), searchResultsContainer);
    };

    const showToast = (message) => {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(2.5rem)';
        }, 2000);
    };

    const handleCopy = () => {
        const textToCopy = outputPre.textContent;
        const clipboardHelper = document.getElementById('clipboard-helper');
        clipboardHelper.value = textToCopy;
        clipboardHelper.select();
        document.execCommand('copy');
        showToast('Copied to clipboard!');
    };
    
    const handleDownload = () => {
        const text = outputPre.textContent;
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'package.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const handleSelectFolder = async () => {
        const folderPath = await window.electronAPI.selectFolder();
        if (folderPath) {
            selectedFolderPath = folderPath;
            selectedFolderP.textContent = folderPath;
            publishOutputPre.textContent = ''; // Clear previous output
        }
    };

    const handlePublish = () => {
        if (!selectedFolderPath) {
            alert("Oopsie! Please select a folder first! >.<");
            return;
        }
        publishOutputPre.textContent = `Starting publish process for ${selectedFolderPath}...\n\n`;
        window.electronAPI.publishPackage(selectedFolderPath);
    };
    
    const handleScreenshot = async () => {
        // This is the magic! Get the full height of the page, not just the window.
        const pageRect = { height: document.body.scrollHeight };
        const result = await window.electronAPI.takeScreenshot(pageRect);
        
        if (result.success) {
            showToast(`Screenshot saved to ${result.path}`);
        } else if(result.error) {
            alert(`Oopsie! Couldn't take screenshot: ${result.error}`);
        }
    };

    // --- Event Listeners ---
    projectNameInput.addEventListener('input', updateProjectDetails);
    projectVersionInput.addEventListener('input', updateProjectDetails);
    projectDescriptionInput.addEventListener('input', updateProjectDetails);
    fetchUserPackagesBtn.addEventListener('click', handleFetchUserPackages);
    npmUsernameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleFetchUserPackages(); });
    searchBtn.addEventListener('click', handleSearchNPM);
    npmSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearchNPM(); });
    copyBtn.addEventListener('click', handleCopy);
    downloadBtn.addEventListener('click', handleDownload);
    screenshotBtn.addEventListener('click', handleScreenshot);
    selectFolderBtn.addEventListener('click', handleSelectFolder);
    publishBtn.addEventListener('click', handlePublish);
    window.electronAPI.onPublishOutput((output) => {
        publishOutputPre.textContent += output;
        publishOutputPre.scrollTop = publishOutputPre.scrollHeight;
    });

    // --- Initial Render ---
    renderOutput();
    handleFetchUserPackages();
});
