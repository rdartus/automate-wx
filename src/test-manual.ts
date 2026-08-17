// import { chromium } from "patchright";
// import { createStealthContext } from "./browser.js";
// import { login } from "./auth.js";
// import { loadConfig } from "./config.js";


// async function run() {
//   console.log("[manual] Lancement du navigateur...");
//       const config = await loadConfig();
  
//   const context = await createStealthContext();
//     const page = await context.newPage();
//     attachPageLogging(page);
  
  
//   await page.goto("https://www.wuxiaworld.com", { waitUntil: "domcontentloaded" });
//   console.log("[manual] Page chargée :", await page.title());

//   // Interagis avec la page ici pour tester tes sélecteurs...
//         console.log("[step] login");

//         await login(
//             page,
//             context,
//             config.site,
//         );

// //   await browser.close();
// }



// function attachPageLogging(page: Page) {
//     page.on("console", (message) => {
//         console.log(`[browser:${message.type()}] ${message.text()}`);
//     });

//     page.on("pageerror", (error) => {
//         console.error("[pageerror]", error);
//     });
//     page.on("crash", () => {
//         console.error("[BROWSER] La page Chromium a crashé");
//     });
//     page.on("close", () => {
//         console.error("[BROWSER] La page a été fermée");
//     });

//     page.context().browser()?.on("disconnected", () => {
//         console.error("[BROWSER] Le navigateur est déconnecté");
//     });

//     page.on("requestfailed", (request) => {
//         const failure = request.failure()?.errorText ?? "unknown error";
//         console.error(`[requestfailed] ${request.method()} ${request.url()} -> ${failure}`);
//     });
// }

// run().catch(console.error);