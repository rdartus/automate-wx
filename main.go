package main

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
	"github.com/go-rod/rod/lib/proto"
	"github.com/go-rod/stealth"
)

func GoChapter(page *rod.Page, cookies []*proto.NetworkCookie, url string) {
	fmt.Println("------------------------ Start chapter opening ------------------------------------")
	fmt.Println("---------Book : ", url, "--------")
	npage := stealth.MustPage(page.Browser())
	defer npage.Close()
	wait := npage.WaitNavigation(proto.PageLifecycleEventNameNetworkAlmostIdle)

	npage.MustNavigate(url)
	wait()
	// err := npage.WaitElementsMoreThan(`[aria-label="VIP"]`,0)
	// if err != nil {
	//     fmt.Println(err)
	// }
	_, err := npage.Element("h4")
	if err != nil {
		fmt.Println(err)
	}
	verif2, _, err := npage.Has(`button[aria-label="VIP"]`)
	if err != nil {
		fmt.Println(err)
	}
	if !verif2 {
		wait := npage.WaitNavigation(proto.PageLifecycleEventNameNetworkAlmostIdle)
		npage.MustReload()
		wait()
		_, _, err := npage.Has(`button[aria-label="VIP"]`)
		if err != nil {
			fmt.Println(err)
			fmt.Println("Account / Loading error")
		}
	}
}
func GoBook(page *rod.Page, cookies []*proto.NetworkCookie, url string) {
	fmt.Println("------------------------ Start Book search ------------------------------------")
	fmt.Println("---------Book : ", url, "--------")
	FreeChapterText_S := "div span[role='status']"
	StatusChapter_S := "div span[role='status'] ~ span div[class*=text]"
	// ChapterW2U_S := "div[title='wait']"
	ChapterW2U_S := "a:has(div[title='wait'])"
	// ChapterLink_S := "a.group"
	// ListChaters_S := "div#full-width-tabpanel-0.h-full > div > div:nth-child(2) > div"

	// chapterTab_S := "#novel-tabs #full-width-tab-0"
	// chapterTab_S := `()=> jQuery("div.MuiTabs-Root span:contains('Chapters')").parents()[0]`
	chapterTab_S := `()=> jQuery("div#novel-tabs button span:contains('Chapters')").parents()[0]`
	freeBook_S := `()=> jQuery('div:contains("Free for All Chapters")').last().get()`

	// page := stealth.MustPage(browser)
	wait := page.WaitNavigation(proto.PageLifecycleEventNameNetworkAlmostIdle)
	page.MustNavigate(url)
	wait()

	verif2, _, err := page.Has(`button[aria-label="VIP"]`)
	if !verif2 {
		page.MustReload()
		page.WaitDOMStable(4*time.Second, 0.01)
	}
	wait = page.WaitRequestIdle(1*time.Second, []string{".*(jquery).*"}, []string{".*"}, nil)
	page.MustEval(`() => console.log("hello world")`)
	page.Eval(`() => import('https://code.jquery.com/jquery-3.7.1.min.js')`)
	wait()
	version, err := page.Eval(`() => jQuery.fn.jquery`)
	if err != nil {
		fmt.Println("error import Jquery :")
		fmt.Println(err)
	}

	fmt.Println("jquery imported, version " + version.Value.Str())
	page.WaitDOMStable(100*time.Millisecond, 0.01)
	// page.WaitDOMStable(4*time.Second, 0.01)

	//get book status
	page.MustEval(`(a) => console.log(a)`, freeBook_S)
	// page.MustEval(`{
	// 	var a = jQuery('div:contains("Free for All Chapters")').last()[0]
	// 	console.log(a)
	//     }`)
	freeBook, err := page.ElementsByJS(rod.Eval(freeBook_S))
	for _, v := range freeBook {
		// fmt.Println(v.MustDescribe())
		// fmt.Println(v.HTML())
		fmt.Println(v.Attribute("text"))
	}
	fmt.Println(err)
	if freeBook != nil && len(freeBook) != 0 {
		fmt.Println("The following Book is free, skip book : " + url)
		return
	}
	//get number of free chapter
	FreeChapterNumber, _ := page.MustElement(FreeChapterText_S).Text()
	FreeChapterNumber2, _ := strconv.Atoi(strings.Split(FreeChapterNumber, " ")[0])
	fmt.Printf("Free chapters : %d", FreeChapterNumber2)

	if FreeChapterNumber2 < 1 {
		fmt.Println("Not enough free chapter skip book : " + url)
		return
	}
	StatusChapter, _ := page.MustElement(StatusChapter_S).Text()
	tmpStatus := strings.Split(StatusChapter, " ")

	for _, status := range tmpStatus {
		if strings.Contains(status, ":") {
			fmt.Println(status)
			if status == "23:00:00" {
				fmt.Println("free chapter available ")
			} else if status != "23:00:00" {
				fmt.Println("free chapter available next " + status)
				return
			}

		} else {
			// fmt.Println("No timer ?")
			// fmt.Println(status)
		}

	}
	fmt.Println(StatusChapter)

	el, err := page.ElementByJS(rod.Eval(chapterTab_S))
	if err != nil {
		fmt.Println(err)
		page.MustEval(`(a) => console.log(a)`, chapterTab_S)

	}
	fmt.Println("Click Chapter Tab")
	el.MustClick()
	eval := page.MustEval(chapterTab_S + ".id")
	fmt.Println(eval)
	page.WaitDOMStable(1*time.Second, 0.1)

	// ListChaters_S2 := "div#" + strings.Replace(eval.String(), "tab", "tabpanel", -1) + ".h-full > div > div:nth-child(2) > div"
	ListChaters_S2 := "div#" + strings.Replace(eval.String(), "tab", "tabpanel", -1) + ".h-full  div.MuiAccordionSummary-content"
	TabCHapter := "div#" + strings.Replace(eval.String(), "tab", "tabpanel", -1) + ".h-full"

	// page.MustElement(chapterTab_S).MustClick()
	//uncollapse books
	fmt.Println("Click on books")
	page.MustEval(`(a) => console.log(a)`, ListChaters_S2)
	books := page.MustElements(ListChaters_S2)
	for i := 0; i <= len(books)-1; i++ {
		book := books[i]
		book.MustClick()
		page.WaitDOMStable(100*time.Millisecond, 0.01)
	}

	fmt.Println("Search unopened chapters")
	fmt.Println(TabCHapter + ChapterW2U_S)
	page.WaitDOMStable(1*time.Second, 0.1)
	ListChaters := page.MustElements(TabCHapter + " " + ChapterW2U_S)
	fmt.Printf("unopened chapters : %d \n", len(ListChaters))

	page.Eval(`(str)=>console.log(str)`, ListChaters_S2+" "+ChapterW2U_S)
out:
	for i, chapter := range ListChaters {
		if i < FreeChapterNumber2 {
			urlChapter, err := chapter.Eval("() => console.log(this)")
			fmt.Println(urlChapter)
			if err != nil {
				panic(err)
			}
			urlChapter2, err := chapter.Eval(`() => {console.log(this.href);
            return this.href}`)
			if err != nil {
				fmt.Println(err)
				panic(err)
			}
			fmt.Println(urlChapter2)
			GoChapter(page, cookies, urlChapter2.Value.Str())
		} else {
			break out
		}
	}
	cookies, _ = page.Browser().GetCookies()
	fmt.Println(cookies)

}

func checkin(page *rod.Page, cookies []*proto.NetworkCookie, siteUrl string) {
	fmt.Println("------------------------Start checkin------------------------------------")
	checkin_S := `()=> jQuery('button:contains("Got it")')[0]`

	wait := page.WaitNavigation(proto.PageLifecycleEventNameNetworkAlmostIdle)
	page.MustNavigate(siteUrl)
	wait()

	verif2, _, err := page.Has(`button[aria-label="VIP"]`)
	if !verif2 {
		page.MustReload()
		page.WaitDOMStable(4*time.Second, 0.01)
	}

	wait = page.WaitRequestIdle(1*time.Second, []string{".*(jquery).*"}, []string{".*"}, nil)
	page.MustEval(`() => console.log("hello world")`)
	page.Eval(`() => import('https://code.jquery.com/jquery-3.7.1.min.js')`)
	wait()
	version, err := page.Eval(`() => jQuery.fn.jquery`)
	if err != nil {
		fmt.Println("error import Jquery :")
		fmt.Println(err)
	}

	fmt.Println("jquery imported, version " + version.Value.Str())
	page.WaitDOMStable(4100*time.Millisecond, 0.01)
	// page.Race().ElementByJS(rod.Eval(checkin_S)).MustHandle(func(e *rod.Element) {
	// 	// Fais quelque chose avec l'élément, par exemple, clique dessus
	// 	e.MustClick()
	// }).MustDo().Timeout(10 * time.Second)

	checkin, err2 := page.ElementByJS(rod.Eval(checkin_S))
	if err2 != nil {
		fmt.Println("Check in not necessary :")
		page.MustEval(`(a) => console.log(a)`, checkin_S)
		fmt.Println(err2)
		return
	}
	checkin.MustClick()

}

func checkout(page *rod.Page, cookies []*proto.NetworkCookie, siteUrl string) {
	fmt.Println("------------------------Start checkin------------------------------------")
	checkout_S := `#app div.mx-auto > div.flex button`

	wait := page.WaitNavigation(proto.PageLifecycleEventNameNetworkAlmostIdle)
	page.MustNavigate(siteUrl+"/manage/subscriptions/daily-rewards")
	wait()

	verif2, _, err := page.Has(`button[aria-label="VIP"]`)
	if !verif2 {
		page.MustReload()
		page.WaitDOMStable(4*time.Second, 0.01)
	}

	wait = page.WaitRequestIdle(1*time.Second, []string{".*(jquery).*"}, []string{".*"}, nil)
	page.MustEval(`() => console.log("hello world")`)
	page.Eval(`() => import('https://code.jquery.com/jquery-3.7.1.min.js')`)
	wait()
	version, err := page.Eval(`() => jQuery.fn.jquery`)
	if err != nil {
		fmt.Println("error import Jquery :")
		fmt.Println(err)
	}

	fmt.Println("jquery imported, version " + version.Value.Str())
	page.WaitDOMStable(100*time.Millisecond, 0.01)

	rewards := page.MustElements(checkout_S)
	for i := 0; i <= len(rewards)-1; i++ {
		reward := rewards[i]
		reward.MustClick()
		page.WaitDOMStable(100*time.Millisecond, 0.01)
	}

}

func login(page *rod.Page, cookies []*proto.NetworkCookie, siteUrl string) {
	fmt.Println("------------------------Start Login------------------------------------")
	profile_S := "button[aria-label='profile nav']"
	login_S := "button[data-cy='header-button-login']"
	user := os.Getenv("USER_WX")
	if user == "" {
		log.Fatalln("no env value for user")
		err := errors.New("no value for getenv")
		panic(err)
	}
	password := os.Getenv("PASSWORD_WX")
	if password == "" {
		log.Fatalln("no env value for password")
		err := errors.New("no value for getenv")
		panic(err)
	}

	// page.Timeout(2*time.Second)
	wait := page.WaitNavigation(proto.PageLifecycleEventNameNetworkAlmostIdle)
	page.MustNavigate(siteUrl)
	wait()
	page.WaitStable(2 * time.Second)
	page.MustElement(profile_S).MustClick()
	page.WaitStable(2 * time.Second)
	el := page.MustElement(login_S)
	el.WaitStable(100 * time.Millisecond)
	// pagetimeout := page.Timeout(10 * time.Second)
	wait = page.WaitNavigation(proto.PageLifecycleEventNameNetworkAlmostIdle)
	el.MustClick()
	wait()

	page.WaitStable(4 * time.Second)
	page.MustElement("#Username").MustInput(user)
	page.MustElement("#Password").MustInput(password)
	wait = page.WaitNavigation(proto.PageLifecycleEventNameNetworkAlmostIdle)
	fmt.Println("Send Login")
	page.MustElement("button[value='login']").MustClick()
	wait()

	cookies, _ = page.Browser().GetCookies()
	fmt.Println(cookies)

}
func main() {

	var result map[string]interface{}
	if _, err := os.Stat("/config/list.json"); !os.IsNotExist(err) {
		jsonFile, _ := os.Open("/config/list.json")
		defer jsonFile.Close()

		byteValue, _ := io.ReadAll(jsonFile)
		json.Unmarshal([]byte(byteValue), &result)
	} else if _, err := os.Stat("list.json"); !os.IsNotExist(err) {
		jsonFile, _ := os.Open("list.json")
		defer jsonFile.Close()

		byteValue, _ := io.ReadAll(jsonFile)
		json.Unmarshal([]byte(byteValue), &result)
	} else {
		panic(err)
	}
	// if we os.Open returns an error then handle it

	fmt.Println("Successfully Opened users.json")
	// defer the closing of our jsonFile so that we can parse it later on

	siteUrl := result["site"].(string)
	aInterface := result["books"].([]interface{})
	books := make([]string, len(aInterface))
	for i, v := range aInterface {
		books[i] = v.(string)
	}

	l := launcher.New().
		Headless(false).
		Devtools(false)

	defer l.Cleanup()

	url := l.MustLaunch()

	browser := rod.New().
		ControlURL(url).
		Trace(true).
		// Timeout(5*time.Second).
		// SlowMotion(2 * time.Second).
		MustConnect()

	defer browser.Close()

	fmt.Printf("js: %x\n\n", md5.Sum([]byte(stealth.JS)))

	page := stealth.MustPage(browser)
	defer page.Close()

	//---------------- Test with network limitation ----------------

	// page.EnableDomain(proto.NetworkEnable{})

	// _ = proto.NetworkEmulateNetworkConditions{
	// 	Offline:            false,
	// 	Latency:            20,
	// 	DownloadThroughput: 10000,
	// 	UploadThroughput:   8000,
	// 	ConnectionType:     proto.NetworkConnectionTypeCellular2g,
	// }.Call(page)

	var cookies []*proto.NetworkCookie

	login(page, cookies, siteUrl)
	checkin(page, cookies, siteUrl)
	// checkout(page, cookies, siteUrl)

	for _, book := range books {
		tpage := page.Timeout(10 * time.Minute)
		err := rod.Try(func() {
			GoBook(tpage, cookies, book)
		})
		if errors.Is(err, context.DeadlineExceeded) {
			fmt.Println("timeout error for " + book)
		} else if err != nil {
			fmt.Println("other types of error : " + err.Error())
		}
		tpage.CancelTimeout()
	}

	// checkout(page, cookies, siteUrl)
}

// utils.TypeConverter
func TypeConverter[R any](data any) (*R, error) {
	var result R
	b, err := json.Marshal(&data)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(b, &result)
	if err != nil {
		return nil, err
	}
	return &result, err
}
