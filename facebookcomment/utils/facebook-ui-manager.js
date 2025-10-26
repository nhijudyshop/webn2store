// facebookcomment/utils/facebook-ui-manager.js

/**
 * Loads Facebook accounts/pages from the TPOS API and populates the selector.
 * @param {object} appState - The global application state object.
 */
export async function loadAccounts(appState) {
    const selector = document.getElementById("selectedPageId");
    selector.innerHTML =
        '<option value="">Đang tải danh sách pages...</option>';

    try {
        const data = await window.TPOS_API.tposRequest("CRMTeam/ODataService.GetAllFacebook?$expand=Childs");
        appState.accountsData = data.value || [];

        if (appState.accountsData.length === 0) {
            selector.innerHTML = '<option value="">Không có page nào</option>';
            return;
        }

        populatePageSelector(appState);
        console.log(`✅ Loaded ${appState.accountsData.length} accounts`);
    }
    catch (error) {
        console.error("Error loading accounts:", error);
        selector.innerHTML = '<option value="">Lỗi tải pages</option>';
        window.showNotification(`Lỗi tải pages: ${error.message}`, "error");
    }
}

/**
 * Populates the page selector with loaded Facebook accounts.
 * @param {object} appState - The global application state object.
 */
export function populatePageSelector(appState) {
    const selector = document.getElementById("selectedPageId");
    const currentValue = selector.value; // Remember current value

    selector.innerHTML = '<option value="">-- Chọn Page --</option>';

    appState.accountsData.forEach((account) => {
        const pages = account.Childs || [];
        pages.forEach((page) => {
            const option = document.createElement("option");
            option.value = page.Facebook_PageId;
            option.textContent = `${page.Facebook_PageName} (${page.Facebook_PageId})`;
            option.dataset.pageName = page.Facebook_PageName;
            selector.appendChild(option);
        });
    });

    // Re-apply the remembered value if it's still valid
    if (currentValue) {
        selector.value = currentValue;
    }
}

/**
 * Loads videos/posts for a selected Facebook page from the TPOS API.
 * @param {Event} event - The event object (optional, to prevent default form submission).
 * @param {object} appState - The global application state object.
 */
export async function loadVideos(event, appState) {
    if (event) {
        event.preventDefault(); // Prevent default form submission if any
    }

    const pageSelector = document.getElementById("selectedPageId");
    const limitInput = document.getElementById("videoLimit");
    const videoSelector = document.getElementById("selectedVideoId");

    if (!pageSelector || !limitInput || !videoSelector) {
        console.error("Missing one or more required DOM elements for loading videos.");
        window.showNotification("Lỗi: Không tìm thấy các phần tử UI cần thiết.", "error");
        return;
    }

    const pageId = pageSelector.value;
    const limit = limitInput.value;

    if (!pageId) {
        window.showNotification("Vui lòng chọn page trước!", "error");
        return;
    }

    videoSelector.innerHTML = '<option value="">Đang tải videos...</option>';

    try {
        const data = await window.TPOS_API.tposRequest(
            `/api/videos?pageid=${pageId}&limit=${limit}`,
        );
        appState.videosData = data.data || [];

        if (appState.videosData.length === 0) {
            videoSelector.innerHTML =
                '<option value="">Không có video nào</option>';
            window.showNotification("Không có video nào được tìm thấy.", "info");
            return;
        }

        populateVideoSelector(appState);
        console.log(`✅ Loaded ${appState.videosData.length} videos`);
        window.showNotification(`Đã tải ${appState.videosData.length} video thành công!`, "success");
    } catch (error) {
        console.error("Error loading videos:", error);
        videoSelector.innerHTML = `<option value="">Lỗi tải videos</option>`;
        window.showNotification(`Lỗi tải videos: ${error.message}`, "error");
    }
}

/**
 * Populates the video selector with loaded videos/posts.
 * @param {object} appState - The global application state object.
 */
export function populateVideoSelector(appState) {
    const selector = document.getElementById("selectedVideoId");
    selector.innerHTML = '<option value="">-- Chọn Video/Post --</option>';

    appState.videosData.forEach((video) => {
        const isLive = video.statusLive === 1;
        const statusIcon = isLive ? "🔴 LIVE" : "⏹️";
        const option = document.createElement("option");
        option.value = video.objectId;
        option.textContent = `${statusIcon} ${video.title} (💬 ${video.countComment || 0})`;
        option.dataset.pageId = video.objectId.split("_")[0];
        selector.appendChild(option);
    });
}