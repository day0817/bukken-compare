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

    // 自己負担額を計算する関数
    function calculateSelfPay(rentStr, adminStr) {
        const total = parseTotalRent(rentStr, adminStr);
        if (total <= 16.0) {
            return total * 0.2;
        } else {
            return 3.2 + (total - 16.0);
        }
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
                return a.self_pay - b.self_pay;
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
            const selfPay = calculateSelfPay(item.rent, item.admin).toFixed(2);
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
                    <div class="rent-row">
                        <span class="rent-main">${item.rent}</span>
                        <span class="rent-admin">管理費: ${item.admin} (総額: ${totalRent}万)</span>
                    </div>
                    <div class="self-pay-row">自己負担: <strong>${selfPay}万円</strong> /月</div>
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
                    <th>自己負担額</th>
                    ${selectedProperties.map(p => {
                        const selfPay = calculateSelfPay(p.rent, p.admin);
                        return `<td class="self-pay-val">${selfPay.toFixed(2)}万円/月</td>`;
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

    // --- エリア分析マップ＆レーダーチャート機能 ---

    // 各駅の定性評価データ＆ポジショニング座標 (X=生活利便性, Y=通勤快適性)
    const stationConfigs = {
        "妙典": { x: 30, y: 80, comfort: 85, life: 75, spec: 80, desc: "東京メトロ東西線の始発駅であることが最大の特徴です。混雑する東西線ですが、妙典始発を狙って並ぶことで確実に座って通勤できます。駅周辺は区画整理された平坦な新興街並みでファミリー層が多く、小学校も落ち着いたのびのびした環境です。物件も駅近かつ自己負担を抑えられる選択肢が見つかり、総合的なバランスが非常に優れています。" },
        "松戸": { x: 50, y: 65, comfort: 65, life: 80, spec: 55, desc: "大手町直通30分という圧倒的な近さがありながら、家賃が安く自己負担を低く抑えられます。千代田線直通は朝非常に混雑し、始発ではないため立ち通勤になります。新着物件の大江邸（築27年/4LDK）のような良質な物件もありますが、全体的には流通数が少なめです。" },
        "本八幡": { x: 75, y: 75, comfort: 80, life: 90, spec: 70, desc: "都営新宿線の始発駅であり、始発電車を活用することで朝確実に座って通勤できる大きなメリットがあります。駅周辺は商業施設が集積し、生活利便性は最高クラスです。物件は築30〜40年以上と古いものが主流ですが、120m²超の広大な物件や12万円（自己負担2.4万）の破格の物件など、個性的な選択肢が揃っています。" },
        "越谷": { x: 65, y: 45, comfort: 55, life: 85, spec: 90, desc: "半蔵門線直通の急行で直通約40分。駅周辺は平坦で自転車移動が非常にスムーズで、大型商業施設（レイクタウン等）が近く買い物は極めて便利です。今回の検索条件において新築や築4年の駅近築浅物件（徒歩9分など）が複数検出されており、一戸建て物件自体の「クオリティ（新しさ・設備）」を最重視したい場合に最も適しています。" },
        "津田沼": { x: 85, y: 60, comfort: 70, life: 95, spec: 50, desc: "快速ルートと東西線直通の2本が利用可能で、始発電車を活用すれば座って通勤可能です。駅周辺は非常に栄えており買い物利便性は抜群です。ただし、今回の検索条件における戸建ての検出数は1件のみで、市場での選択肢は極めて限定的なため、タイミングを待つ必要があります。" },
        "守谷": { x: 60, y: 70, comfort: 75, life: 80, spec: 85, desc: "つくばエクスプレスの始発駅で、朝は並べば確実に座って通勤できます。物理的距離は最も遠いですが、TXの快速運転によりドアドア時間は60分に収まります。計画開発された美しいニュータウンで子育て世帯に絶大な人気があり、家賃8.5万円（自己負担1.7万）の広大な物件や、築5年の築浅が手軽に見つかる高いコスパが魅力です。" }
    };

    // メインタブ制御
    const mainTabs = document.querySelectorAll(".nav-tab");
    const tabContents = document.querySelectorAll(".tab-content");

    mainTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            mainTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const targetId = tab.dataset.target;
            tabContents.forEach(content => {
                if (content.id === targetId) {
                    content.classList.add("active");
                } else {
                    content.classList.remove("active");
                }
            });

            // エリア分析マップタブが開かれた場合、マップと初期データをロード
            if (targetId === "analysis-section") {
                initPositioningMap();
                // デフォルトで妙典を選択状態にする
                setTimeout(() => {
                    const myodenBubble = document.querySelector(".station-bubble[data-station='妙典']");
                    if (myodenBubble) {
                        myodenBubble.click();
                    }
                }, 100);
            }
        });
    });

    let currentRadarChart = null;

    // レーダーチャートの描画 (Chart.js)
    function renderRadarChart(stationName) {
        const canvas = document.getElementById("radarChart");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const config = stationConfigs[stationName];
        if (!config) return;

        // 物件数に応じたスコア算出 (4件以上で100点)
        const stationProperties = properties.filter(p => p.station === stationName);
        const countScore = Math.min(100, (stationProperties.length / 4) * 100);

        const dataValues = [
            100 - (config.comfort === 85 ? 25 : config.comfort === 65 ? 30 : config.comfort === 80 ? 35 : config.comfort === 55 ? 40 : config.comfort === 70 ? 40 : 45) * 1.5, // 時間の短さベース
            config.comfort, // 着席可能性
            config.life,    // 周辺利便性
            countScore,     // 物件の多さ
            config.spec     // 物件クオリティ
        ];

        if (currentRadarChart) {
            currentRadarChart.destroy();
        }

        currentRadarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['通勤時間の短さ', '朝の座りやすさ', '周辺買い物利便', '物件の見つけやすさ', '物件クオリティ'],
                datasets: [{
                    label: stationName,
                    data: dataValues,
                    backgroundColor: 'rgba(0, 229, 255, 0.25)',
                    borderColor: '#00e5ff',
                    pointBackgroundColor: '#00e5ff',
                    pointBorderColor: '#ffffff',
                    pointHoverBackgroundColor: '#ffffff',
                    pointHoverBorderColor: '#00e5ff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.15)' },
                        grid: { color: 'rgba(255, 255, 255, 0.15)' },
                        pointLabels: {
                            color: 'rgba(255, 255, 255, 0.75)',
                            font: { size: 11, family: 'Inter, sans-serif' }
                        },
                        ticks: {
                            display: false,
                            maxTicksLimit: 5
                        },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    }

    // 駅の詳細カードの動的更新
    function updateStationInfoCard(stationName) {
        const container = document.getElementById("stationInfoContent");
        if (!container) return;
        const config = stationConfigs[stationName];
        if (!config) return;

        // 実物件データからサマリーを計算
        const stationProperties = properties.filter(p => p.station === stationName);
        const count = stationProperties.length;
        
        let minSelfPay = "-";
        let maxArea = "-";
        let minCommute = "-";
        
        if (count > 0) {
            const selfPays = stationProperties.map(p => p.self_pay);
            const areas = stationProperties.map(p => parseFloat(p.menseki.replace("m2", "")));
            const commutes = stationProperties.map(p => p.door_to_door);
            
            minSelfPay = Math.min(...selfPays).toFixed(2) + "万円";
            maxArea = Math.max(...areas).toFixed(1) + "m²";
            minCommute = Math.min(...commutes) + "分";
        }

        container.innerHTML = `
            <div class="info-station-name">${stationName}駅エリア</div>
            <div class="info-metrics">
                <div class="info-metric-item">
                    <div class="info-metric-label">検出物件数</div>
                    <div class="info-metric-value">${count} 件</div>
                </div>
                <div class="info-metric-item">
                    <div class="info-metric-label">最安自己負担額</div>
                    <div class="info-metric-value" style="color:var(--accent);">${minSelfPay}</div>
                </div>
                <div class="info-metric-item">
                    <div class="info-metric-label">最大専有面積</div>
                    <div class="info-metric-value">${maxArea}</div>
                </div>
                <div class="info-metric-item">
                    <div class="info-metric-label">最速通勤時間 (ドアドア)</div>
                    <div class="info-metric-value">${minCommute}</div>
                </div>
            </div>
            <div class="info-description">
                ${config.desc}
            </div>
        `;
    }

    // 2軸ポジショニングマップのバブル動的生成
    function initPositioningMap() {
        const map = document.getElementById("positioningMap");
        if (!map) return;
        
        // 既存のバブルをクリア
        const oldBubbles = map.querySelectorAll(".station-bubble");
        oldBubbles.forEach(b => b.remove());

        Object.keys(stationConfigs).forEach(name => {
            const config = stationConfigs[name];
            const stationProperties = properties.filter(p => p.station === name);
            const count = stationProperties.length;

            // 物件数に応じたバブルのサイズ計算 (60px〜108px)
            const size = 60 + Math.min(4, count) * 12;

            const bubble = document.createElement("div");
            bubble.className = "station-bubble";
            bubble.style.left = `${config.x}%`;
            bubble.style.bottom = `${config.y}%`;
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.dataset.station = name;

            bubble.innerHTML = `
                <span class="bubble-name">${name}</span>
                <span class="bubble-count">${count}件</span>
            `;

            bubble.addEventListener("click", () => {
                map.querySelectorAll(".station-bubble").forEach(b => b.classList.remove("active"));
                bubble.classList.add("active");
                renderRadarChart(name);
                updateStationInfoCard(name);
            });

            map.appendChild(bubble);
        });
    }

    // 初期レンダリング
    render();
    updateCompareButton();
});
