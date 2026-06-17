// ==UserScript==
// @name         MTurk Ibotta & Queue Automator (Ultimate Fix)
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  Fixes Ibotta iframe domain issue, selects radios, and auto submits.
// @match        https://worker.mturk.com/*
// @match        https://*.mturkcontent.com/*
// @match        https://*.ibotta.com/*
// @allFrames    true
// @grant        GM_openInTab
// @grant        window.close
// ==/UserScript==

(function() {
    'use strict';

    const currentUrl = window.location.href;
    const targetTitle = "Are these receipts the same?";

    // ==========================================
    // STEP 1: QUEUE PAGE LOGIC (ডাবল ওপেন হওয়া বন্ধ করবে)
    // ==========================================
    if (currentUrl.includes('worker.mturk.com/tasks') && !currentUrl.includes('/projects/') && window.self === window.top) {
        console.log("[MTurk Automator] Monitoring Queue...");
        const openedTasks = new Set(); 

        setInterval(() => {
            const taskLinks = document.querySelectorAll('a[href*="/tasks/"]');
            
            for (let link of taskLinks) {
                let parent = link.parentElement;
                let textContext = link.textContent || "";
                
                for (let i = 0; i < 5 && parent; i++) {
                    textContext += " " + (parent.textContent || "");
                    parent = parent.parentElement;
                }

                if (textContext.includes(targetTitle)) {
                    if (!openedTasks.has(link.href)) {
                        console.log("[MTurk Automator] Opening Target HIT in background...");
                        
                        openedTasks.add(link.href);
                        link.style.border = "2px solid red"; 
                        
                        if (typeof GM_openInTab !== 'undefined') {
                            GM_openInTab(link.href, { active: false, insert: true });
                        } else {
                            window.open(link.href, '_blank');
                        }
                        break; 
                    }
                }
            }
        }, 2000);
    }

    // ==========================================
    // STEP 2: TASK LOGIC (যেকোনো আইফ্রেমের ভেতর রান করবে)
    // ==========================================
    // window.self !== window.top মানে হলো এটি নিশ্চিতভাবে আইফ্রেমের ভেতর আছে (যেমন backend.ibotta.com)
    else if (window.self !== window.top) {
        console.log(`[MTurk Automator] Running INSIDE iframe: ${currentUrl}`);

        let attemptCount = 0;
        let taskInterval = setInterval(() => {
            attemptCount++;

            // রেডিও বাটন খুঁজবে
            const radioButtons = document.querySelectorAll('input[type="radio"]');
            
            // সাবমিট বাটন খুঁজবে
            let actualSubmitBtn = null;
            const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], .submitBtn, .btn-primary');
            
            for (let btn of buttons) {
                const btnText = (btn.innerText || btn.value || "").trim().toLowerCase();
                if (btnText === "submit") {
                    actualSubmitBtn = btn;
                    break;
                }
            }

            if (radioButtons.length >= 2 && actualSubmitBtn) {
                clearInterval(taskInterval);
                console.log("[MTurk Automator] Form elements found inside Ibotta iframe!");

                // পেজ রেডি হওয়ার জন্য ১.৫ সেকেন্ড অপেক্ষা
                setTimeout(() => {
                    const randomIndex = Math.floor(Math.random() * 2);
                    
                    // সরাসরি ক্লিক এবং ভ্যালু চেঞ্জ ট্রিগার
                    radioButtons[randomIndex].click();
                    radioButtons[randomIndex].checked = true;
                    radioButtons[randomIndex].dispatchEvent(new Event('change', { bubbles: true }));
                    console.log(`[MTurk Automator] Selected option: ${randomIndex === 0 ? 'No' : 'Yes'}`);

                    // ১ সেকেন্ড পর Submit এ ক্লিক
                    setTimeout(() => {
                        console.log("[MTurk Automator] Clicking Submit...");
                        actualSubmitBtn.click();
                        
                        // সাবমিট হওয়ার পর মেইন পেজকে ট্যাব ক্লোজ করার সিগন্যাল দেবে
                        setTimeout(() => {
                            window.top.postMessage("close_mturk_tab", "*");
                        }, 2500);
                        
                    }, 1000);
                }, 1500);

            } else if (attemptCount > 80) { 
                clearInterval(taskInterval);
                console.log("[MTurk Automator] Elements not found inside iframe after 40 seconds.");
            }
        }, 500);
    }

    // ==========================================
    // STEP 3: TAB CLOSE LOGIC (ব্যাকগ্রাউন্ড ট্যাবটি ক্লোজ করবে)
    // ==========================================
    else if (currentUrl.includes('/projects/') && currentUrl.includes('/tasks') && window.self === window.top) {
        window.addEventListener("message", (event) => {
            if (event.data === "close_mturk_tab") {
                console.log("[MTurk Automator] Closing tab...");
                window.close();
            }
        });
    }
})();
