document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    // 默认收起侧边栏
    sidebar.classList.add('collapsed');
    
    const toggleBtn = document.getElementById('toggleBtn');

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    const minBtn = document.getElementById('min-btn');
    const maxBtn = document.getElementById('max-btn');
    const closeBtn = document.getElementById('close-btn');

    if (minBtn && maxBtn && closeBtn) {
        const maxIcon = maxBtn.querySelector('i');
        
        minBtn.onclick = () => window.electronAPI.minimizeWindow();
        maxBtn.onclick = () => {
            window.electronAPI.maximizeWindow();
            // 切换最大化图标
            maxIcon.classList.toggle('fa-square');
            maxIcon.classList.toggle('fa-clone');  // 使用 far fa-clone
            maxIcon.classList.toggle('restore');
        };
        closeBtn.onclick = () => window.electronAPI.closeWindow();

        // 监听窗口最大化状态变化
        window.electronAPI.onMaximizeChange((isMaximized) => {
            if (isMaximized) {
                maxIcon.classList.remove('fa-square');
                maxIcon.classList.add('fa-clone', 'restore');
            } else {
                maxIcon.classList.add('fa-square');
                maxIcon.classList.remove('fa-clone', 'restore');
            }
        });
    }

    const tabs = document.getElementById('tabs');
    let tabCounter = 0; // 从 0 开始计数

    function createNewTab(url = 'newtab.html') {
        const tabId = `tab-${tabCounter++}`;
        const tab = document.createElement('div');
        tab.className = 'tab active';
        tab.setAttribute('data-tab-id', tabId);
        tab.setAttribute('data-url', url);
        tab.innerHTML = `
            <img class="tab-icon" src="" style="display: none"/>
            <span class="tab-title">新标签页</span>
            <div class="close-tab"><i class="fas fa-times"></i></div>
        `;

        // 创建对应的 webview
        const webview = document.createElement('webview');
        webview.setAttribute('src', url);
        webview.setAttribute('id', `webview-${tabId}`);
        webview.setAttribute('nodeintegration', 'true');
        webview.setAttribute('preload', './preload.js');
        webview.setAttribute('allowpopups', '');
        webview.className = 'active';

        webview.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            display: inline-flex !important;
        `;

        // 隐藏其他 webview
        document.querySelectorAll('webview').forEach(w => w.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

        const browserView = document.getElementById('browser-view');
        browserView.appendChild(webview);
        
        const addTab = tabs.querySelector('.add-tab');
        tabs.insertBefore(tab, addTab);
        
        setupTabEvents(tab, webview);
        setupWebviewEvents(webview, tab);
        
        return tabId;
    }

    function activateTab(tabId) {
        // 隐藏所有 webview
        document.querySelectorAll('webview').forEach(w => {
            w.classList.remove('active');
            w.style.display = 'none'; // 确保隐藏
        });
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

        // 激活选中的标签和 webview
        const tab = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
        const webview = document.querySelector(`#webview-${tabId}`);
        
        if (tab && webview) {
            tab.classList.add('active');
            webview.classList.add('active');
            webview.style.display = 'block'; // 确保显示
            webview.style.cssText = `
                position: absolute;
                width: 100%;
                height: 100%;
                display: inline-flex !important;
            `;
        }
    }

    function setupWebviewEvents(webview, tab) {
        webview.addEventListener('page-title-updated', (e) => {
            const titleSpan = tab.querySelector('.tab-title');
            titleSpan.textContent = e.title;
            if (tab.classList.contains('active')) {
                document.title = e.title;
            }
        });

        webview.addEventListener('page-favicon-updated', (e) => {
            if (e.favicons && e.favicons.length > 0) {
                const iconImg = tab.querySelector('.tab-icon');
                iconImg.src = e.favicons[0];
                iconImg.style.display = 'block';
            }
        });

        webview.addEventListener('did-navigate', (e) => {
            tab.setAttribute('data-url', e.url);
        });

        // 添加导航事件监听
        const backBtn = document.getElementById('backBtn');
        const forwardBtn = document.getElementById('forwardBtn');
        const reloadBtn = document.getElementById('reloadBtn');

        webview.addEventListener('did-start-loading', () => {
            if (tab.classList.contains('active')) {
                reloadBtn.querySelector('i').className = 'fas fa-times';
            }
        });

        webview.addEventListener('did-stop-loading', () => {
            if (tab.classList.contains('active')) {
                reloadBtn.querySelector('i').className = 'fas fa-redo';
                updateNavButtons(webview);
                
                // 记录历史 - 修复重复添加的bug
                const url = webview.getURL();
                if (url !== 'newtab.html' && url !== 'history-tab.html' && !url.startsWith('file://')) {
                    // 检查最近的历史记录，避免重复添加
                    window.electronAPI.getHistory().then(history => {
                        const lastRecord = history.length > 0 ? history[history.length - 1] : null;
                        // 如果最后一条记录不是同一个URL或者时间间隔超过5分钟，才添加新记录
                        if (!lastRecord || 
                            lastRecord.url !== url || 
                            (Date.now() - lastRecord.timestamp > 300000)) {
                            window.electronAPI.addHistory({
                                url: url,
                                title: tab.querySelector('.tab-title').textContent,
                                favicon: tab.querySelector('.tab-icon').src || '',
                                timestamp: Date.now()
                            });
                        }
                    });
                }
            }
        });

        // 更新导航按钮状态
        function updateNavButtons(webview) {
            if (tab.classList.contains('active')) {
                backBtn.disabled = !webview.canGoBack();
                forwardBtn.disabled = !webview.canGoForward();
            }
        }
    }

    function setupTabEvents(tab, webview) {
        const closeBtn = tab.querySelector('.close-tab');
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            const isActive = tab.classList.contains('active');
            const currentTabs = Array.from(document.querySelectorAll('.tab:not(.add-tab)'));
            const currentIndex = currentTabs.indexOf(tab);
            
            if (isActive && currentTabs.length > 1) {
                const nextTab = currentTabs[currentIndex + 1] || currentTabs[currentIndex - 1];
                activateTab(nextTab.dataset.tabId);
            }
            
            // 移除标签和对应的 webview
            tab.remove();
            webview.remove();
            
            if (document.querySelectorAll('.tab:not(.add-tab)').length === 0) {
                createNewTab();
            }
        };

        tab.onclick = () => {
            if (!tab.classList.contains('active')) {
                activateTab(tab.dataset.tabId);
            }
        };
    }

    // 为添加按钮绑定事件
    tabs.querySelector('.add-tab').onclick = () => createNewTab();

    // 默认创建一个新标签页
    createNewTab();

    tabs.addEventListener('wheel', (event) => {
        event.preventDefault();
        tabs.scrollLeft += event.deltaY;
    });

    // 添加书签功能
    const bookmarkList = document.getElementById('bookmarkList');

    // 修改加载书签函数
    async function loadBookmarks() {
        const bookmarks = await window.electronAPI.getBookmarks();
        bookmarkList.innerHTML = bookmarks.map((bookmark, index) => `
            <div class="menu-item bookmark-item" data-url="${bookmark.url}" data-index="${index}">
                <img src="${bookmark.icon || 'https://www.google.com/favicon.ico'}" class="bookmark-icon" onerror="this.src='https://www.google.com/favicon.ico'"/>
                <span class="item-text">${bookmark.title}</span>
            </div>
        `).join('');

        // 添加点击和右键事件
        document.querySelectorAll('.bookmark-item').forEach(item => {
            // 左键点击打开链接
            item.onclick = () => {
                createNewTab(item.dataset.url);
            };

            // 右键菜单
            item.oncontextmenu = (e) => {
                e.preventDefault();
                const index = parseInt(item.dataset.index);
                const bookmark = bookmarks[index];
                
                const menu = document.createElement('div');
                menu.className = 'context-menu';
                menu.innerHTML = `
                    <div class="menu-option edit">编辑书签</div>
                    <div class="menu-option delete">删除书签</div>
                `;
                menu.style.left = `${e.pageX}px`;
                menu.style.top = `${e.pageY}px`;
                document.body.appendChild(menu);

                // 点击其他地方关闭菜单
                const closeMenu = () => {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                };
                setTimeout(() => document.addEventListener('click', closeMenu), 0);

                // 编辑书签
                menu.querySelector('.edit').onclick = async () => {
                    await window.electronAPI.createBookmarkWindow({
                        ...bookmark,
                        index
                    });
                };

                // 删除书签
                menu.querySelector('.delete').onclick = async () => {
                    if (confirm('确定要删除这个书签吗？')) {
                        await window.electronAPI.deleteBookmark(index);
                    }
                };
            };
        });
    }

    // 修改监听书签变化的代码
    window.electronAPI.onBookmarksUpdated(() => {
        loadBookmarks();
    });

    // 初始加载书签
    loadBookmarks();

    // 添加书签按钮点击事件
    document.querySelector('.add-btn').onclick = async () => {
        // 获取当前活动标签页的 URL 和标题
        const activeWebview = document.querySelector('webview.active');
        const activeTab = document.querySelector('.tab.active');

        await window.electronAPI.createBookmarkWindow({
            url: activeWebview ? activeWebview.getAttribute('src') : '',
            title: activeTab ? activeTab.querySelector('.tab-title').textContent : '',
            icon: activeTab ? activeTab.querySelector('.tab-icon').src : ''
        });
    };

    // 添加导航按钮事件监听
    const backBtn = document.getElementById('backBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    const reloadBtn = document.getElementById('reloadBtn');

    backBtn.onclick = () => {
        const activeWebview = document.querySelector('webview.active');
        if (activeWebview && activeWebview.canGoBack()) {
            activeWebview.goBack();
        }
    };

    forwardBtn.onclick = () => {
        const activeWebview = document.querySelector('webview.active');
        if (activeWebview && activeWebview.canGoForward()) {
            activeWebview.goForward();
        }
    };

    reloadBtn.onclick = () => {
        const activeWebview = document.querySelector('webview.active');
        if (activeWebview) {
            if (activeWebview.isLoading()) {
                activeWebview.stop();
                reloadBtn.querySelector('i').className = 'fas fa-redo';
            } else {
                activeWebview.reload();
            }
        }
    };

    // 修改搜索功能
    const searchBtn = document.getElementById('searchBtn');
    const searchOverlay = document.getElementById('searchOverlay');
    const searchInput = document.getElementById('searchInput');
    const searchGoBtn = document.getElementById('searchGoBtn');

    let isSearching = false;

    searchBtn.onclick = () => {
        isSearching = !isSearching;
        if (isSearching) {
            searchOverlay.classList.add('active');
            const activeWebview = document.querySelector('webview.active');
            if (activeWebview) {
                searchInput.value = activeWebview.getAttribute('src');
                searchInput.select();
            }
            searchInput.focus();
        } else {
            searchOverlay.classList.remove('active');
        }
    };

    // 点击搜索框内部不关闭
    searchOverlay.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // 处理搜索
    function handleSearch() {
        const query = searchInput.value.trim();
        if (query) {
            let url;
            if (query.startsWith('http://') || query.startsWith('https://') || query.includes('.')) {
                url = query.startsWith('http') ? query : `https://${query}`;
            } else {
                url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
            }
            const activeWebview = document.querySelector('webview.active');
            if (activeWebview) {
                activeWebview.src = url;
                isSearching = false;
                searchOverlay.classList.remove('active');
            }
        }
    }

    searchGoBtn.onclick = handleSearch;
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        } else if (e.key === 'Escape') {
            isSearching = false;
            searchOverlay.classList.remove('active');
        }
    });

    // 添加历史记录按钮事件监听
    const historyBtn = document.getElementById('historyBtn');
    historyBtn.onclick = () => {
        window.electronAPI.openHistoryWindow();
    };

    // 添加从历史记录打开URL的监听
    window.electronAPI.onOpenUrlInNewTab((url) => {
        createNewTab(url);
    });

    // 监听在新标签页打开历史记录
    window.electronAPI.onOpenHistoryInTab(() => {
        createNewTab('history-tab.html');
    });

    // 监听打开下载标签页
    const downloadsBtn = document.getElementById('downloadsBtn');
    if (downloadsBtn) {
        downloadsBtn.onclick = () => {
            window.electronAPI.openDownloadsTab();
            // 如果按钮在闪烁，点击后应该停止闪烁
            if (downloadsBtn.classList.contains('blinking')) {
                downloadsBtn.classList.remove('blinking');
            }
        };
    }

    if (window.electronAPI && typeof window.electronAPI.onOpenDownloadsTab === 'function') {
        window.electronAPI.onOpenDownloadsTab(() => {
            createNewTab('downloads-tab.html');
        });
    } else {
        console.error('[Renderer] window.electronAPI.onOpenDownloadsTab is not available or not a function.');
    }

    // 监听下载开始信号，使下载按钮闪烁
    if (window.electronAPI && typeof window.electronAPI.onDownloadStarted === 'function') {
        window.electronAPI.onDownloadStarted((downloadId) => {
            if (downloadsBtn) {
                downloadsBtn.classList.add('blinking');
            }
        });
    } else {
        console.error('[Renderer] window.electronAPI.onDownloadStarted is not available or not a function.');
    }
});
