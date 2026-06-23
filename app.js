document.addEventListener("DOMContentLoaded", () => {
    // データ初期化 (properties.jsから読み込まれたbukkenDataを使用)
    let properties = typeof bukkenData !== 'undefined' ? bukkenData : [];
    let selectedProperties = [];

    // 要素取得
    const bukkenGrid = document.getElementById("bukkenGrid");
    const areaTabs = document.getElementById("areaTabs");
    const rentFilter = document.getElementById("rentFilter");
    const rentValue = document.getElementById("rentValue");
    const commuteFilter = document.getElementById("commuteFilter");
    const commuteValue = document.getElementById("commuteValue");
    const areaSizeFilter = document.getElementById("areaSizeFilter");
    const areaSizeValue = document.getElementById("areaSizeValue");
    const sortSelect = document.getElementById("sortSelect");
    const openCompareBtn = document.getElementById("openCompareBtn");
    const compareCount = document.getElementById("compareCount");
    
    // モーダル要素
    const compareModal = document.getElementById("compareModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const compareTable = document.getElementById("compareTable");

    // 現在のフィルタ状態
    const state = {
        area: "all",
        maxRent: 18.0,
        maxCommute: 60,
        minArea: 80,
        sortBy: "commute-asc"
    };

    // イベントリスナー設定
    areaTabs.addEventListener("click", (e) => {
        if (e.target.classList.contains("tab-btn")) {
            document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
            e.target.classList.add("active");
            state.area = e.target.dataset.area;
            render();
        }
    });

    rentFilter.addEventListener("input", (e) => {
        state.maxRent = parseFloat(e.target.value);
        rentValue.textContent = state.maxRent.toFixed(1);
        render();
    });

    commuteFilter.addEventListener("input", (e) => {
        state.maxCommute = parseInt(e.target.value);
        commuteValue.textContent = state.maxCommute;
        render();
    });

    areaSizeFilter.addEventListener("input", (e) => {
        state.minArea = parseInt(e.target.value);
        areaSizeValue.textContent = state.minArea;
        render();
    });

    sortSelect.addEventListener("change", (e) => {
        state.sortBy = e.target.value;
        render();
    });

    openCompareBtn.addEventListener("click", () => {
        buildCompareTable();
        compareModal.classList.add("active");
    });

    closeModalBtn.addEventListener("click", () => {
        compareModal.classList.remove("active");
    });

    compareModal.addEventListener("click", (e) => {
        if (e.target === compareModal) {
            compareModal.classList.remove("active");
        }
    });

    // 築年数を数値に変換する関数
    function parseAge(ageStr) {
        if (ageStr.includes("新築")) return 0;
        const match = ageStr.match(/築(\d+)年/);
        return match ? parseInt(match[1]) : 99;
    }

    // 専有面積を数値に変換する関数
    function parseAreaSize(mensekiStr) {
        const match = mensekiStr.match(/([\d.]+)/);
        return match ? parseFloat(match[1]) : 0;
    }

    // 家賃総額を計算する関数 (管理費が「-」なら0として加算)
    function parseTotalRent(rentStr, adminStr) {
        const rentMatch = rentStr.match(/([\d.]+)/);
        const rent = rentMatch ? parseFloat(rentMatch[1]) : 0;
        
        let admin = 0;
        if (adminStr && adminStr !== "-") {
            const adminMatch = adminStr.match(/(\d+)/);
            admin = adminMatch ? parseInt(adminMatch[1]) / 10000 : 0; // 円を万円に変換
        }
        return rent + admin;
    }

    // フィルタとソートを適用してレンダリング
    function render() {
        // フィルタリング
        let filtered = properties.filter(item => {
            // エリア
            if (state.area !== "all" && item.station !== state.area) return false;
            
            // 家賃
            const totalRent = parseTotalRent(item.rent, item.admin);
            if (totalRent > state.maxRent) return false;
            
            // 通勤時間
            if (item.door_to_door > state.maxCommute) return false;
            
            // 専有面積
            const size = parseAreaSize(item.menseki);
            if (size < state.minArea) return false;
            
            return true;
        });

        // ソート
        filtered.sort((a, b) => {
            if (state.sortBy === "commute-asc") {
                return a.door_to_door - b.door_to_door;
            } else if (state.sortBy === "rent-asc") {
                return parseTotalRent(a.rent, a.admin) - parseTotalRent(b.rent, b.admin);
            } else if (state.sortBy === "menseki-desc") {
                return parseAreaSize(b.menseki) - parseAreaSize(a.menseki);
            } else if (state.sortBy === "age-asc") {
                return parseAge(a.age_floor) - parseAge(b.age_floor);
            }
            return 0;
        });

        // DOM描画
        bukkenGrid.innerHTML = "";
        
        if (filtered.length === 0) {
            bukkenGrid.innerHTML = `<div class="no-results">条件に合致する物件がありません。</div>`;
            return;
        }

        filtered.forEach((item, index) => {
            const card = document.createElement("div");
            card.className = "bukken-card glass";
            
            const totalRent = parseTotalRent(item.rent, item.admin).toFixed(2);
            const isChecked = selectedProperties.some(sp => sp.url === item.url);
            
            // 通勤時間のビジュアル色分け
            let commuteColor = "green";
            if (item.door_to_door > 50) commuteColor = "red";
            else if (item.door_to_door > 35) commuteColor = "yellow";
            
            // 進捗バーの割合
            const barWidth = Math.min(100, (item.door_to_door / 60) * 100);

            card.innerHTML = `
                <div class="card-header">
                    <span class="station-badge">${item.station}</span>
                    <label class="compare-checkbox-label">
                        <input type="checkbox" class="compare-checkbox" data-url="${item.url}" ${isChecked ? 'checked' : ''}>
                        比較に追加
                    </label>
                </div>
                <h2 class="bukken-title" title="${item.title}">${item.title}</h2>
                
                <div class="rent-box">
                    <span class="rent-main">${item.rent}</span>
                    <span class="rent-admin">管理費: ${item.admin} (総額: ${totalRent}万)</span>
                </div>

                <div class="commute-visual">
                    <div class="commute-header">
                        <span class="commute-total ${commuteColor}">ドアドア ${item.door_to_door}分</span>
                        <span class="commute-breakdown">徒歩${item.walk_min}分 ＋ 電車${item.train_min}分</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar ${commuteColor}" style="width: ${barWidth}%"></div>
                    </div>
                </div>

                <div class="room-details">
                    <div>間取り: <strong>${item.madori}</strong></div>
                    <div>広さ: <strong>${item.menseki}</strong></div>
                    <div>築年数: <strong>${item.age_floor.split(" ")[0]}</strong></div>
                    <div>階数: <strong>${item.age_floor.split(" ")[1] || "-"}</strong></div>
                </div>

                <div class="walk-details" title="${item.station_walk}">
                    ${item.station_walk}
                </div>

                <a href="${item.url}" target="_blank" class="action-btn">SUUMOで詳細を見る</a>
            `;

            // チェックボックスイベント
            const checkbox = card.querySelector(".compare-checkbox");
            checkbox.addEventListener("change", (e) => {
                if (e.target.checked) {
                    if (selectedProperties.length >= 3) {
                        alert("比較できるのは最大3件までです。");
                        e.target.checked = false;
                        return;
                    }
                    selectedProperties.push(item);
                } else {
                    selectedProperties = selectedProperties.filter(sp => sp.url !== item.url);
                }
                updateCompareButton();
            });

            bukkenGrid.appendChild(card);
        });
    }

    // 比較ボタンの更新
    function updateCompareButton() {
        const count = selectedProperties.length;
        compareCount.textContent = count;
        openCompareBtn.disabled = count < 2;
        if (count >= 2) {
            openCompareBtn.classList.add("active");
        } else {
            openCompareBtn.classList.remove("active");
        }
    }

    // 比較テーブルの組み立て
    function buildCompareTable() {
        if (selectedProperties.length === 0) return;
        
        let html = `
            <thead>
                <tr>
                    <th>項目</th>
                    ${selectedProperties.map(p => `<th class="bukken-header">${p.title}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
                <tr>
                    <th>エリア (駅)</th>
                    ${selectedProperties.map(p => `<td>${p.station}</td>`).join("")}
                </tr>
                <tr>
                    <th>家賃 (総額)</th>
                    ${selectedProperties.map(p => {
                        const total = parseTotalRent(p.rent, p.admin).toFixed(2);
                        return `<td class="rent-val">${p.rent} <span class="rent-admin">(管理費:${p.admin} / 総額:${total}万)</span></td>`;
                    }).join("")}
                </tr>
                <tr>
                    <th>ドアドア通勤時間</th>
                    ${selectedProperties.map(p => {
                        let c = "green";
                        if (p.door_to_door > 50) c = "red";
                        else if (p.door_to_door > 35) c = "yellow";
                        return `<td class="commute-val ${c}">${p.door_to_door}分 <span class="rent-admin">(徒歩${p.walk_min}分+乗車${p.train_min}分)</span></td>`;
                    }).join("")}
                </tr>
                <tr>
                    <th>間取り</th>
                    ${selectedProperties.map(p => `<td>${p.madori}</td>`).join("")}
                </tr>
                <tr>
                    <th>専有面積</th>
                    ${selectedProperties.map(p => `<td>${p.menseki}</td>`).join("")}
                </tr>
                <tr>
                    <th>築年数 / 階数</th>
                    ${selectedProperties.map(p => `<td>${p.age_floor}</td>`).join("")}
                </tr>
                <tr>
                    <th>最寄り駅・立地</th>
                    ${selectedProperties.map(p => `<td>${p.station_walk}</td>`).join("")}
                </tr>
                <tr>
                    <th>詳細リンク</th>
                    ${selectedProperties.map(p => `<td><a href="${p.url}" target="_blank" class="action-btn">SUUMOで開く</a></td>`).join("")}
                </tr>
            </tbody>
        `;
        compareTable.innerHTML = html;
    }

    // 初期レンダリング
    render();
    updateCompareButton();
});
