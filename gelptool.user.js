// ==UserScript==
// @name         GelpTool
// @namespace    http://tampermonkey.net/
// @version      2026-09-04-1
// @description  try to take over the world!
// @author       You
// @match        https://gelpweb.benesse.ne.jp/members/myRecipe*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICRAEAOw==
// @downloadURL  https://github.com/ta-kuan/Gelptool/raw/refs/heads/main/gelptool.user.js
// @updateURL    https://github.com/ta-kuan/Gelptool/raw/refs/heads/main/gelptool.user.js
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// ==/UserScript==
/* jshint esversion: 11 */
(function() {
    'use strict';
    const STORAGE_KEY = 'gelptool_auto_run';
    const INDEX_KEY = 'gelptool_current_index'; // 次に処理する一覧項目の番号を保存
    const NAV_KEY = 'gelptool_navigating';      // スクリプト自身の自動遷移かを識別するフラグ
    let isRunning = false;
    const isScriptNavigating = sessionStorage.getItem(NAV_KEY) === 'true';
    sessionStorage.removeItem(NAV_KEY); // フラグはチェック後に消去
    if (!isScriptNavigating) {
        sessionStorage.setItem(STORAGE_KEY, 'false');
        sessionStorage.setItem(INDEX_KEY, '0');
    }
    GM_registerMenuCommand("▶ 自動実行を開始", () => setAutoRun(true));
    GM_registerMenuCommand("⏹ 自動実行を停止", () => setAutoRun(false));
    function setAutoRun(state) {
        sessionStorage.setItem(STORAGE_KEY, state ? 'true' : 'false');
        if (state) {
            sessionStorage.setItem(INDEX_KEY, '0');
            sessionStorage.setItem(NAV_KEY, 'true');
            console.log("【GelpTool】自動実行モードをONにしました（1番目からスタートします）");
            safeMainProcess();
        } else {
            console.log("【GelpTool】自動実行モードをOFFにしました");
        }
    }
    const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
    const GEMINI_API_KEY="AQ.Ab8RN6L9Lc1RvJx5F9UFv45Gefq4T7wQdyhKVJqx5PMw-DGV0w";
    const MODEL="gemini-3.5-flash-lite";

    function geminiRequest(prompt){
        return new Promise((resolve,reject)=>{
            GM_xmlhttpRequest({
                method:"POST",
                url:`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
                headers:{"Content-Type":"application/json"},
                data:JSON.stringify({
                    contents:[{parts:[{text:prompt}]}],
                    generationConfig:{
                        maxOutputTokens:10,
                        thinkingConfig:{
                            thinkingLevel:"minimal"
                        }
                    }
                }),
                onload:(response)=>{
                    if(response.status<200||response.status>=300){
                        reject(new Error(`API Error: ${response.status} ${response.responseText}`));
                        return;
                    }
                    try{
                        resolve(JSON.parse(response.responseText));
                    }catch(error){
                        reject(error);
                    }
                },
                onerror:()=>reject(new Error("通信エラー")),
                ontimeout:()=>reject(new Error("タイムアウト"))
            });
        });
    }

    async function selectByAI(){
        const word=document.querySelector(".Heading_h3__p6Arz")?.textContent?.trim();
        const labels=[...document.querySelectorAll(".RadioButton_label__zYJqU")];
        const buttons=[...document.querySelectorAll(".RadioButton_base__ZBb8T")];

        if(!word||labels.length!==4||buttons.length!==4){
            buttons[0]?.click();
            return;
        }

        const choices=labels.map(x=>x.textContent.trim().replace(/^[A-D]\.\s*/,""));
        const prompt=`英単語:${word}\nA:${choices[0]}\nB:${choices[1]}\nC:${choices[2]}\nD:${choices[3]}\n正解の記号1文字だけ:`;

        try{
            const data=await geminiRequest(prompt);
            console.log("AIレスポンス:",data);

            const text=data.candidates?.[0]?.content?.parts?.[0]?.text||"";
            const answer=text.toUpperCase().match(/[ABCD]/)?.[0];
            const index={A:0,B:1,C:2,D:3}[answer];

            if(index===undefined){
                console.warn(`AI回答不正: "${text}" → A`);
                buttons[0]?.click();
                return;
            }

            console.log(`【AI】${word} → ${answer}`);
            buttons[index].click();

        }catch(error){
            console.error("AIエラー → A",error);
            buttons[0]?.click();
        }
    }

    async function Vocabulary(){
        console.log("【GelpTool】Vocabulary 処理実行中");

        await sleep(300);
        await selectByAI();

        while(document.querySelector(".BaseButton_fill__jfjjK")?.textContent?.trim()==="次へ"){
            await sleep(500);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();

            await sleep(500);
            await selectByAI();
        }

        await sleep(1800);
        document.querySelector(".BaseButton_fill__jfjjK")?.click();
        await sleep(1200);
    }

    async function Grammar() {
        console.log("【GelpTool】Grammar 処理実行中");
        document.querySelector(".BaseButton_fill__jfjjK")?.click();
        await sleep(1000);
        while (!document.querySelector(".BaseButton_lg__1TV5a")) {
            await sleep(300);
            document.querySelector(".SegmentButton_last__YXrS_")?.click();
        }
        await sleep(600);
        document.querySelector(".BaseButton_lg__1TV5a")?.click();
        await sleep(600);
        document.querySelector(".RadioButton_radioIcon__W9vw7")?.click();
        await sleep(600);
        document.querySelector(".BaseButton_lg__1TV5a")?.click();
        await sleep(600);
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(600);
        const el = document.querySelector(".BaseTextArea_textArea__iLrzL");
        if (el) {
            el.focus();
            const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
            if (nativeTextAreaValueSetter) {
                nativeTextAreaValueSetter.call(el, "g");
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const keyOptions = { key: 'g', code: 'KeyG', keyCode: 71, which: 71, bubbles: true, cancelable: true };
            el.dispatchEvent(new KeyboardEvent('keydown', keyOptions));
            el.dispatchEvent(new KeyboardEvent('keypress', keyOptions));
            el.dispatchEvent(new KeyboardEvent('keyup', keyOptions));
        }
        document.querySelector(".BaseButton_lg__1TV5a")?.click();
        await sleep(800);
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(800);
        document.querySelector(".BaseButton_lg__1TV5a")?.click();
        await sleep(1200);
    }
    async function ListeningQuesutyonn() {
        console.log("【GelpTool】Listening [問題] 処理実行中");
        while (document.querySelector(".BaseButton_fill__jfjjK")?.textContent?.trim() !== "完了") {
            await sleep(600);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
        }
        await sleep(1200);
    }
    async function ListeningPractice() {
        console.log("【GelpTool】Listening [練習] 処理実行中");
        for (let m = 1; m <= 3; m++) {
            document.querySelector(".BaseButton_lg__1TV5a")?.click();
            await sleep(600);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            await sleep(600);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            for (let k = 1; k <= 2; k++) {
                await sleep(600);
                Array.from(document.querySelectorAll(".BaseButton_outline__a_dl4")).at(-1)?.click();
                await sleep(600);
                while (!document.querySelector(".BaseButton_lg__1TV5a")) {
                    await sleep(1000);
                }
                await sleep(1000);
                document.querySelector(".BaseButton_lg__1TV5a")?.click();
                await sleep(3000);
                document.querySelector(".BaseButton_fill__jfjjK")?.click();
                await sleep(600);
            }
        }
        await sleep(1200);
    }
    async function ListeningOther() {
        console.log("【GelpTool】Listening [その他] 処理実行中");
        await sleep(1000);
        if (document.querySelector(".BaseButton_fill__jfjjK")) {
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            await sleep(500);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            await sleep(500);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            await sleep(500);
            Array.from(document.querySelectorAll(".BaseButton_fill__jfjjK")).at(-1)?.click();
            await sleep(500);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            await sleep(500);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            await sleep(500);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            await sleep(500);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            await sleep(500);
            while (!document.querySelector(".BaseButton_lg__1TV5a")) {
                await sleep(1000);
            }
            await sleep(1000);
            document.querySelector(".BaseButton_lg__1TV5a")?.click();
            await sleep(500);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            await sleep(500);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            await sleep(500);
            while (!document.querySelector(".BaseButton_lg__1TV5a")) {
                await sleep(1000);
            }
            document.querySelector(".BaseButton_lg__1TV5a")?.click();
            await sleep(500);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            await sleep(500);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            await sleep(500);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            await sleep(500);
            Array.from(document.querySelectorAll(".BaseButton_fill__jfjjK")).at(-1)?.click();
        } else {
            document.querySelector(".BaseButton_outline__a_dl4")?.click();
            await sleep(500);
            window.scrollTo(0, document.body.scrollHeight);
            await sleep(500);
            const radioButtons = document.querySelectorAll(".RadioButton_radioIcon__W9vw7");
            for (const radio of radioButtons) {
                radio.click();
                await sleep(300);
            }
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            await sleep(1200);
        }
        await sleep(1200);
    }
    async function ReadingQuesutyonn() {
        console.log("【GelpTool】Reading [問題] 処理実行中");
        while (document.querySelector(".BaseButton_lg__1TV5a")?.textContent?.trim() !== "完了") {
            await sleep(600);
            document.querySelector(".BaseButton_lg__1TV5a")?.click();
        }
        await sleep(1200);
    }
    async function ReadingPractice() {
        console.log("【GelpTool】Reading [練習] 処理実行中");
        while (document.querySelector(".BaseButton_lg__1TV5a")?.textContent?.trim() !== "完了") {
            await sleep(600);
            document.querySelector(".BaseButton_lg__1TV5a")?.click();
        }
        await sleep(1200);
    }
    async function ReadingOther() {
        console.log("【GelpTool】Reading [その他] 処理実行中");
        document.querySelector(".BaseButton_outline__a_dl4")?.click();
        await sleep(500);
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(500);
        const radioButtons = document.querySelectorAll(".RadioButton_radioIcon__W9vw7");
        for (const radio of radioButtons) {
            radio.click();
            await sleep(300);
        }
        document.querySelector(".BaseButton_fill__jfjjK")?.click();
        await sleep(1200);
    }
    async function WritingQuesutyonn() {
        console.log("【GelpTool】Writing [問題] 処理実行中");
        for (let m = 0;m < 3;m++) {
            await sleep(1500);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            await sleep(300);
            const el = document.querySelector(".BaseTextArea_textArea__iLrzL");
            if (el) {
                el.focus();
                const textToInput = "I like.";
                const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                if (nativeTextAreaValueSetter) {
                    const newValue = el.value ? el.value + textToInput : textToInput;
                    nativeTextAreaValueSetter.call(el, newValue);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
                const keyOptions = { key: 'a', code: 'KeyA', keyCode: 65, which: 65, bubbles: true, cancelable: true };
                el.dispatchEvent(new KeyboardEvent('keydown', keyOptions));
                el.dispatchEvent(new KeyboardEvent('keypress', keyOptions));
                el.dispatchEvent(new KeyboardEvent('keyup', keyOptions));
            }
            await sleep(300);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
            while (document.querySelectorAll(".BaseButton_fill__jfjjK").length !== 2) {
                await sleep(1000);
            }
            document.querySelectorAll(".BaseButton_fill__jfjjK")[1].click();
        }
        await sleep(1200);
    }
    async function WritingPractice() {
        console.log("【GelpTool】Writing [練習] 処理実行中");
        for (let m = 0;m < 6;m++) {
            await sleep(1000);
            document.querySelector(".BaseButton_fill__jfjjK")?.click();
        }
    }
    async function WritingOther() {
        console.log("【GelpTool】Writing [その他] 処理実行中");
        await sleep(1000);
        document.querySelector(".BaseButton_fill__jfjjK")?.click();
        await sleep(600);
        window.scrollTo(0, document.body.scrollHeight);
        const el = document.querySelector(".BaseTextArea_textArea__iLrzL");
        if (el) {
            el.focus();
            const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
            if (nativeTextAreaValueSetter) {
                nativeTextAreaValueSetter.call(el, "a");
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const keyOptions = { key: 'a', code: 'KeyA', keyCode: 65, which: 65, bubbles: true, cancelable: true };
            el.dispatchEvent(new KeyboardEvent('keydown', keyOptions));
            el.dispatchEvent(new KeyboardEvent('keypress', keyOptions));
            el.dispatchEvent(new KeyboardEvent('keyup', keyOptions));
        }
        await sleep(600);
        document.querySelectorAll(".BaseButton_outline__a_dl4")[1].click();
        while (!document.querySelector(".BaseButton_fill__jfjjK")) {
            await sleep(1000);
        }
        await sleep(2000);
        document.querySelector(".BaseButton_fill__jfjjK")?.click();
        await sleep(1200);
    }
    async function Speaking() {
        console.log("【GelpTool】Speaking 処理実行中");
        await sleep(1000);
        document.querySelector(".Heading_backIcon__m9K6p").click();
    }
    async function safeMainProcess() {
        if (isRunning) return;
        isRunning = true;
        sessionStorage.setItem(NAV_KEY, 'true');
        try {
            await mainProcess();
        } finally {
            isRunning = false;
        }
    }
    async function mainProcess() {
        await sleep(1000);
        const currentUrl = location.href.toLowerCase();
        const h2Text = (document.querySelector(".Heading_h2__2yww1")?.textContent || "").toLowerCase();
        const isVocabPage = h2Text.includes('vocabulary') || currentUrl.includes('vocab');
        const isGrammarPage = h2Text.includes('grammar') || currentUrl.includes('grammar');
        const isListeningPage = currentUrl.includes('listening') || h2Text.includes('listening');
        const isReadingPage = currentUrl.includes('reading') || h2Text.includes('reading');
        const isWritingPage = currentUrl.includes('writing') || h2Text.includes('writing');
        const isSpeakingPage = currentUrl.includes('speaking') || h2Text.includes('speaking');
        if (isVocabPage) {
            console.log("【GelpTool】h2テキストに 'vocabulary' を検出：詳細画面として処理を開始します。");
            await Vocabulary();
            return;
        }
        if (isGrammarPage) {
            console.log("【GelpTool】h2テキストに 'grammar' を検出：詳細画面として処理を開始します。");
            await Grammar();
            return;
        }
        if (isListeningPage) {
            console.log("【GelpTool】Listening詳細画面（問題ページ）を検出しました。");
            if (h2Text.includes('問題')) await ListeningQuesutyonn();
            else if (h2Text.includes('練習')) await ListeningPractice();
            else await ListeningOther();
            return;
        }
        if (isReadingPage) {
            console.log("【GelpTool】Reading詳細画面（問題ページ）を検出しました。");
            if (h2Text.includes('問題')) await ReadingQuesutyonn();
            else if (h2Text.includes('練習')) await ReadingPractice();
            else await ReadingOther();
            return;
        }
        if (isWritingPage) {
            console.log("【GelpTool】Writing詳細画面（問題ページ）を検出しました。");
            if (h2Text.includes('問題')) await WritingQuesutyonn();
            else if (h2Text.includes('練習')) await WritingPractice();
            else await WritingOther();
            return;
        }
        if (isSpeakingPage) {
            console.log("【GelpTool】Speaking詳細画面（問題ページ）を検出しました。");
            await Speaking();
            return;
        }
        console.log("【GelpTool】詳細画面の条件を満たさないため、一覧画面として判定されました。項目読み込みを待機します...");
        let currentIndex = parseInt(sessionStorage.getItem(INDEX_KEY) || '0', 10);
        let elements = Array.from(document.querySelectorAll('.ArticleInfo_title__Gz2YW'));
        for (let i = 0; i < 10; i++) {
            elements = Array.from(document.querySelectorAll('.ArticleInfo_title__Gz2YW'));
            if (elements.length > 0) break;
            await sleep(500);
        }
        console.log(`【GelpTool】一覧項目数: ${elements.length}, 現在の進捗番号: ${currentIndex + 1}`);
        if (currentIndex < elements.length) {
            const element = elements[currentIndex];
            const text = element ? element.textContent.trim() : "";
            console.log(`【GelpTool】項目 [${currentIndex + 1}/${elements.length}] を実行します: ${text}`);
            sessionStorage.setItem(INDEX_KEY, (currentIndex + 1).toString());
            sessionStorage.setItem(NAV_KEY, 'true');
            element.click();
            return;
        }
        console.log("【GelpTool】現在のページの全項目を完了しました。「次へ」ボタンを確認します...");
        const nextButton = document.querySelector(".BaseButton_iconRight__1U0Sv");
        if (nextButton && !nextButton.classList.contains("BaseButton_disabled__UOHyS")) {
            console.log("【GelpTool】「次へ」ボタンをクリックして次のページへ進みます...");
            sessionStorage.setItem(INDEX_KEY, '0');
            sessionStorage.setItem(NAV_KEY, 'true');
            nextButton.click();
            await sleep(2000);
            setTimeout(() => {
                safeMainProcess();
            }, 500);
            return;
        }
        console.log("【GelpTool】「次へ」ボタンが無効化されています。全自動実行を正常終了します。");
        sessionStorage.setItem(STORAGE_KEY, 'false');
        sessionStorage.setItem(INDEX_KEY, '0');
        sessionStorage.removeItem(NAV_KEY);
    }
    window.addEventListener('load', async () => {
        const isAutoRun = sessionStorage.getItem(STORAGE_KEY) === 'true';
        if (isAutoRun) {
            console.log("【GelpTool】自動実行モードで動作中...");
            await sleep(1000);
            await safeMainProcess();
        }
    });
    let lastUrl = location.href;
    setInterval(async () => {
        if (location.href !== lastUrl) {
            if (isRunning) {
                return;
            }
            lastUrl = location.href;
            const isAutoRun = sessionStorage.getItem(STORAGE_KEY) === 'true';
            if (isAutoRun) {
                await sleep(1000);
                await safeMainProcess();
            }
        }
    }, 1000);
})();
