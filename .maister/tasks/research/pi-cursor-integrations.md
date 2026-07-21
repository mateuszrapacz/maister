# Research: dojrzałość, popularność i aktualność integracji Cursor dla pi

**Data pomiaru: 2026-07-18.** Dane pochodzą z pierwotnych endpointów GitHub API, npm registry i npm downloads API odczytanych tego dnia. Pobrania npm nie oznaczają unikalnych użytkowników ani aktywnych instalacji.

## Podsumowanie

Najbardziej dojrzały technicznie, popularny i aktualny jest **`pi-cursor-sdk`**, ale wymaga oficjalnego API key i **nie używa subskrypcji Cursor**. Jeśli subskrypcja jest warunkiem, aktywniejszy jest **`@offbynan/pi-cursor-provider`**, jednak korzysta z niepublicznego `api2.cursor.sh`/gRPC, więc ma najwyższe ryzyko zmian protokołu i regulaminu. **`@netandreus/pi-cursor-provider`** używa oficjalnego Agent CLI, ale jest nieaktualizowany od 2026-02-21, nie ma testów, a otwarty issue dokumentuje niezgodność z Pi 0.77.0 — nie należy go obecnie rekomendować bez naprawy i testu end-to-end.

## Metoda

Ocena obejmuje cztery kąty: (1) dojrzałość — historia, autorzy, testy, CI, issues, licencja; (2) popularność — GitHub i npm; (3) aktualność; (4) architektura, subskrypcja i ryzyko integracyjne.

## Porównanie

| Projekt | Aktualność na 2026-07-18 | Popularność | Dojrzałość techniczna | Mechanizm / subskrypcja | Ryzyko |
|---|---|---|---|---|---|
| `@offbynan/pi-cursor-provider` | commit/npm `0.6.0`: **2026-07-08** (10 dni) | 12★, 8 forków; 78/tydz., 552/mies., 1 915/rok | ok. 100 commitów, 5 contributorów, 1 plik testowy, typecheck; bez CI/Releases | PKCE OAuth + prywatne `api2.cursor.sh` gRPC przez proxy; **tak** | **wysokie** protokołowe/regulaminowe |
| `@netandreus/pi-cursor-provider` | commit/npm: **2026-02-21** (147 dni) | 31★, 13 forków; 55/tydz., 204/mies., 1 595/rok | 7 commitów, 1 contributor, 0 testów, lint/typecheck; bez CI | oficjalny Cursor Agent CLI i `agent login`; **tak** | niższe protokołowe, ale **krytyczne kompatybilności/utrzymania** |
| `pi-cursor-sdk` | commit/npm `0.1.60`: **2026-07-17** (1 dzień) | 232★, 20 forków; 2 514/tydz., 9 586/mies., 21 865/rok | ok. 378 commitów, >80 plików testowych, verify/smoke; bez klasycznego CI | oficjalny `@cursor/sdk` + API key; **nie** | najniższe protokołowe; nie spełnia celu subskrypcji |

## Ustalenia

1. **`pi-cursor-sdk` zdecydowanie prowadzi pod względem skali i aktywności.** Repo powstało 2026-05-04, miało ok. 378 commitów i ostatni commit 2026-07-17. Ma 232 gwiazdki, 20 forków, 58 tagów i 3 contributorów (wkład 376/1/1), co ujawnia silną zależność od głównego autora. npm zawiera 62 wersje; `0.1.60` opublikowano 2026-07-17. Pobrania: 2 514/tydzień, 9 586/miesiąc, 21 865/rok. [repo API](https://api.github.com/repos/fitchmultz/pi-cursor-sdk) · [commity](https://api.github.com/repos/fitchmultz/pi-cursor-sdk/commits) · [contributors](https://api.github.com/repos/fitchmultz/pi-cursor-sdk/contributors) · [npm registry](https://registry.npmjs.org/pi-cursor-sdk) · [npm downloads](https://api.npmjs.org/downloads/point/last-month/pi-cursor-sdk)

2. **`pi-cursor-sdk` ma najsilniejsze zaplecze testowe, choć brak klasycznego CI jest luką.** W repo widać ponad 80 plików testowych Vitest, typecheck, `verify` oraz smoke testy macOS/Ubuntu/Windows. Wymaga Node `>=22.19`, zależy od `@cursor/sdk` 1.0.23 i MCP SDK. Z 34 pobranych issues 27 było zamkniętych, 7 otwartych. Actions API pokazuje tylko dynamiczny Copilot reviewer, nie klasyczny workflow CI, więc nie da się potwierdzić egzekwowania zestawu testów na każdym PR. Ostatni GitHub Release to `v0.1.57` z 2026-07-11, natomiast npm zawiera też `0.1.58–0.1.60`. [repo](https://github.com/fitchmultz/pi-cursor-sdk) · [README](https://github.com/fitchmultz/pi-cursor-sdk#readme) · [Releases](https://github.com/fitchmultz/pi-cursor-sdk/releases) · [issues API](https://api.github.com/repos/fitchmultz/pi-cursor-sdk/issues?state=all&per_page=100) · [workflows API](https://api.github.com/repos/fitchmultz/pi-cursor-sdk/actions/workflows)

3. **`pi-cursor-sdk` nie rozwiązuje celu „użyj mojej subskrypcji”.** README wskazuje oficjalny `@cursor/sdk` i jawny API key oraz wyraźnie mówi, że pakiet nie reuse logowania Cursor Agent CLI/Desktop ani subscription OAuth. **Ryzyko protokołu jest najniższe**, lecz ryzyko niedopasowania do wymagań jest wysokie, jeśli kluczowa jest subskrypcja. [README](https://github.com/fitchmultz/pi-cursor-sdk#readme) · [npm](https://www.npmjs.com/package/pi-cursor-sdk)

4. **`@offbynan/pi-cursor-provider` jest świeży i aktywny, ale ma krótki staż.** Repo powstało 2026-05-10; około setny i ostatni commit z 2026-07-08 brzmi „fix: keep Cursor model list stable across sessions”, a npm `0.6.0` ukazał się tego samego dnia. Projekt ma 12★, 8 forków, 5 contributorów (39/38/20/2/1), 12 tagów i 8 wersji npm. Pobrania: 78/tydzień, 552/miesiąc, 1 915/rok. Rozkład wkładu jest zdrowszy niż u konkurentów, ale około dwumiesięczna historia nie dowodzi długoterminowej stabilności. [repo API](https://api.github.com/repos/offbynan/pi-cursor-provider) · [commity](https://api.github.com/repos/offbynan/pi-cursor-provider/commits) · [contributors](https://api.github.com/repos/offbynan/pi-cursor-provider/contributors) · [npm registry](https://registry.npmjs.org/%40offbynan%2Fpi-cursor-provider) · [npm downloads](https://api.npmjs.org/downloads/point/last-month/%40offbynan%2Fpi-cursor-provider)

5. **Zaplecze jakości `offbynan` jest podstawowe, nie rozbudowane.** Repo ma tylko jeden plik testowy `index.test.ts`, choć udostępnia `test=vitest` i `typecheck=tsc`; wymaga Node `>=18`. Nie ma workflow Actions ani GitHub Releases mimo 12 tagów. Peer dependencies nadal wskazują pakiety `@mariozechner/pi-*`, co jest dodatkową powierzchnią ryzyka kompatybilności z ewolucją pi. Licencja MIT. **Waga: średnia** — testy istnieją, ale ich zakres i brak CI ograniczają zaufanie. [repo](https://github.com/offbynan/pi-cursor-provider) · [README](https://github.com/offbynan/pi-cursor-provider#readme) · [workflows API](https://api.github.com/repos/offbynan/pi-cursor-provider/actions/workflows) · [Releases](https://github.com/offbynan/pi-cursor-provider/releases)

6. **`offbynan` używa subskrypcji przez najbardziej ryzykowną architekturę.** PKCE OAuth i lokalny proxy komunikują się z niepublicznym `api2.cursor.sh`/gRPC. Cursor może bez zapowiedzi zmienić protokół, logowanie lub backend; pozostaje też niezweryfikowane ryzyko zgodności z regulaminem. **Waga: wysoka** — rozwiązanie należy traktować jako eksperymentalne. [README](https://github.com/offbynan/pi-cursor-provider#readme) · [npm](https://www.npmjs.com/package/@offbynan/pi-cursor-provider)

7. **`@netandreus/pi-cursor-provider` ma silne oznaki porzucenia.** Repo powstało 2026-02-19; ostatni commit, push i update npm nastąpiły 2026-02-21, 147 dni przed pomiarem. Ma 31★ i 13 forków, ale tylko 1 contributora i 7 commitów. Jeden release `v0.1.2` wydano 2026-02-20; npm ma 5 wersji, najnowszą `0.1.4`. Pobrania: 55/tydzień, 204/miesiąc, 1 595/rok. Po odfiltrowaniu PR są 3 otwarte i 1 zamknięty issue. Licencja MIT. [repo API](https://api.github.com/repos/netandreus/pi-cursor-provider) · [commity](https://api.github.com/repos/netandreus/pi-cursor-provider/commits) · [contributors](https://api.github.com/repos/netandreus/pi-cursor-provider/contributors) · [Releases](https://github.com/netandreus/pi-cursor-provider/releases) · [npm registry](https://registry.npmjs.org/%40netandreus%2Fpi-cursor-provider) · [npm downloads](https://api.npmjs.org/downloads/point/last-month/%40netandreus%2Fpi-cursor-provider)

8. **`netandreus` nie ma testów, a bieżąca kompatybilność jest publicznie zakwestionowana.** Repo ma 0 testów, jedynie lint/typecheck, brak CI i peer dependencies `@mariozechner/pi-*`. Otwarty 2026-05-29 issue #6, bez komentarzy do daty pomiaru, zgłasza „Provider incompatible with Pi 0.77.0”; po `agent login` provider kończy się błędem „No API key found for cursor”. To bezpośredni dowód, że deklarowane ponowne użycie logowania/subskrypcji nie działa co najmniej w opisanej konfiguracji. **Waga: blocker dla rekomendacji na aktualnym pi.** [issue #6](https://github.com/netandreus/pi-cursor-provider/issues/6) · [workflows API](https://api.github.com/repos/netandreus/pi-cursor-provider/actions/workflows) · [repo](https://github.com/netandreus/pi-cursor-provider)

9. **Delegowanie przez oficjalny Cursor Agent CLI jest koncepcyjnie mniej kruche niż prywatne gRPC, ale nie gwarantuje zgodności providera.** `netandreus` reuse `agent login`/subskrypcji i nie implementuje prywatnego protokołu bezpośrednio. Zależy jednak od zachowania CLI, jego formatu/credential storage oraz API pi. Brak utrzymania i issue #6 sprawiają, że praktyczne ryzyko kompatybilności jest obecnie wyższe niż korzyść architektury. [README](https://github.com/netandreus/pi-cursor-provider#readme) · [issue #6](https://github.com/netandreus/pi-cursor-provider/issues/6)

## Czy Cursor zabrania innych harnessów?

**Nie ma ogólnego zakazu używania Cursor z zewnętrznym klientem.** Oficjalna dokumentacja Cursor opisuje tryb `agent acp` jako serwer Agent Client Protocol „for custom clients”, mówi wprost, że ACP jest przeznaczony do budowania własnych klientów i integracji, oraz pokazuje logowanie `cursor_login` i przykłady dla Neovim, Zed i własnych edytorów. To jest wspierana ścieżka użycia Cursor poza aplikacją desktopową: [Cursor ACP docs](https://cursor.com/docs/cli/acp) i [Cursor CLI authentication](https://cursor.com/docs/cli/reference/authentication).

Ryzyko `@offbynan/pi-cursor-provider` nie wynika więc z samego faktu używania innego harnessu, lecz z ominięcia wspieranego ACP/CLI i bezpośredniej komunikacji z prywatnym `api2.cursor.sh` przez odtworzony protokół gRPC/protobuf. Warunki Cursor nie wymieniają „third-party harnesses” jako zakazanych, ale sekcja 1.5 zabrania m.in. reverse engineeringu lub prób uzyskania dostępu do underlying structure, probing oraz harvesting/scraping. Bez stanowiska Anysphere nie można rozstrzygnąć, czy konkretny provider narusza te punkty, ale jest to realna niepewność regulaminowa obok ryzyka technicznego: [Cursor Terms of Service, §1.5](https://cursor.com/terms-of-service).

Praktyczna gradacja ryzyka: oficjalne `agent acp` + `cursor_login` — niskie; uruchamianie udokumentowanego Cursor CLI jako subprocess — umiarkowane, zależne od sposobu integracji; bezpośredni prywatny gRPC — wysokie. To ocena techniczna, nie porada prawna.

## Rekomendacja

- **Oficjalna ścieżka i osobny API key są akceptowalne:** wybrać `pi-cursor-sdk`; przed produkcją uruchamiać własne CI integracyjne i pinować wersje.
- **Subskrypcja jest bezwzględnym wymogiem:** spośród trzech tylko `offbynan` jest aktywnym kandydatem, ale wymaga świadomej akceptacji wysokiego ryzyka protokołu/regulaminu oraz testu na koncie testowym.
- **Nie rekomendować obecnie `netandreus` na aktualnym pi.** Warunkiem ponownej oceny jest naprawa issue #6, wydanie nowej wersji i test end-to-end z bieżącym Pi i Cursor Agent CLI.

## Źródła

### Zachowane

- [GitHub API/repo offbynan](https://api.github.com/repos/offbynan/pi-cursor-provider), [npm registry](https://registry.npmjs.org/%40offbynan%2Fpi-cursor-provider), [downloads API](https://api.npmjs.org/downloads/point/last-month/%40offbynan%2Fpi-cursor-provider) — kod, metadane, wersje i użycie.
- [GitHub API/repo netandreus](https://api.github.com/repos/netandreus/pi-cursor-provider), [issue #6](https://github.com/netandreus/pi-cursor-provider/issues/6), [npm registry](https://registry.npmjs.org/%40netandreus%2Fpi-cursor-provider), [downloads API](https://api.npmjs.org/downloads/point/last-month/%40netandreus%2Fpi-cursor-provider) — metadane i bezpośredni sygnał niezgodności.
- [GitHub API/repo fitchmultz](https://api.github.com/repos/fitchmultz/pi-cursor-sdk), [npm registry](https://registry.npmjs.org/pi-cursor-sdk), [downloads API](https://api.npmjs.org/downloads/point/last-month/pi-cursor-sdk) — kod, testy, wersje i użycie.

### Odrzucone

- Nie używano blogów, katalogów pakietów ani stron SEO; informacje można było oprzeć na źródłach pierwotnych.

## Luki i ryzyka rezydualne

- To migawka z **2026-07-18**; wskaźniki zmieniają się w czasie.
- Link `last-month` wprost reprodukuje wartość miesięczną; dla okien tydzień/rok trzeba odpytać downloads API z dokładnymi datami granicznymi.
- Pobrania npm obejmują CI, reinstalacje i cache; nie mierzą ludzi, aktywnych wdrożeń ani retencji.
- Brak publicznego CI nie dowodzi braku prywatnych/lokalnych testów, ale uniemożliwia potwierdzenie ich egzekwowania.
- Nie wykonano własnego E2E z kontem Cursor ani audytu warunków usługi; ocena regulaminowa nie jest poradą prawną.
