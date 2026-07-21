# OpenCode a subskrypcja Kiro

## Werdykt

Technicznie jest to możliwe przez społecznościowy plugin [`@zhafron/opencode-kiro-auth`](https://github.com/tickernelz/opencode-kiro-auth), który importuje sesję z `kiro-cli` albo loguje przez AWS Builder ID / IAM Identity Center. Nie jest to jednak oficjalna integracja OpenCode ani Kiro/AWS.

## Ustalenia

- OpenCode oficjalnie obsługuje pluginy instalowane z npm lub jako lokalne moduły: [OpenCode — Plugins](https://opencode.ai/docs/plugins/).
- Społecznościowy plugin deklaruje dostęp do modeli przez Kiro i synchronizację uwierzytelnienia z `kiro-cli`: [README pluginu](https://github.com/tickernelz/opencode-kiro-auth#readme).
- Autor pluginu wyraźnie zaznacza, że projekt nie jest powiązany, wspierany ani zatwierdzony przez AWS lub Anthropic i używa się go na własne ryzyko: [sekcja Disclaimer](https://github.com/tickernelz/opencode-kiro-auth#disclaimer).
- Oficjalna dokumentacja Kiro opisuje płatne plany i kredyty, ale nie została znaleziona oficjalna instrukcja użycia subskrypcji Kiro w OpenCode: [Kiro — Billing for individuals](https://kiro.dev/docs/billing/).

## Wniosek praktyczny

Można spróbować wykorzystać limity/kredyty konta Kiro w OpenCode, ale jest to nieoficjalne i może przestać działać. Przed użyciem na ważnym lub firmowym koncie należy sprawdzić aktualne warunki Kiro/AWS albo uzyskać potwierdzenie supportu, szczególnie czy zewnętrzny klient jest dozwolony.
