# Zeffy Donor Sync Recommendation

## Bottom line

**Yes, this is possible and likely worthwhile for THV, but it should begin as an automated import with a review queue rather than immediate, irreversible card creation.** Zeffy now provides a free read-only API for payments, contacts, and campaigns, plus real-time `payment.completed` webhook delivery. The API can filter payment records by date, campaign, status, and type; Zeffy says access is free, HTTPS-only, API-key authenticated, and rate-limited at 100 requests per minute. [1] [2]

| Approach | What happens | Tradeoffs | Cost | Setup complexity |
|---|---|---|---|---|
| CSV import | Staff exports Zeffy data and adds cards manually | Lowest technical risk; ongoing manual work and late data | No added platform cost | Low |
| API sync with review queue **(recommended first)** | A dashboard sync retrieves new Zeffy payments, proposes card creation/routing, and requires review only for ambiguous records | Reduces data entry while preventing duplicate or misclassified donors | Zeffy API is free; requires one implementation project | Moderate |
| Real-time webhook automation | Zeffy sends completed-payment data immediately; unambiguous transactions create/update cards automatically | Fastest, but needs strong duplicate, refund, campaign, and identity controls | Zeffy webhook/API access is free; requires monitoring and implementation | Higher |
| Zapier | Zeffy sends payments through Zapier into another workflow | Fastest no-code start; adds a third-party dependency and potential paid plan as volume grows | May require a Zapier plan | Low to moderate |

## Recommended donor-routing rules

The integration should use the donor’s **current-calendar-year recorded giving after the incoming payment**, not just the single gift amount. Monthly recurring gifts always enter **Monthly Giving**. One-time gifts with annual giving of **$500–$4,999** enter **Donors 500–5K**, and those reaching **$5,000+** enter or move to **Major Donors**. One-time gifts below $500 remain outside the tracked card portfolios. This preserves the existing dashboard policy.

Trip program contributions must be explicitly excluded by Zeffy campaign/form ID so the $500 expedition contribution remains in Trips only and does not create a donor card.

## Security and data-integrity safeguards

The Zeffy API key must be stored only in server-side configuration, never in browser code. Zeffy states that only its organization admin can generate a key, that the key should be treated like a password, and that it can be regenerated. [1] [2]

Each webhook must be treated as a notification rather than as unquestioned truth. Zeffy’s official guide documents delivery retries and a full payment payload, but does not document a signature-verification mechanism. The dashboard should therefore retrieve and validate the referenced payment through the Zeffy API before changing donor data. It should store Zeffy payment IDs and contact IDs, process each payment only once, and surface refunds, missing contacts, existing-donor matches, and unknown campaigns for review. [2]

## Recommendation

> Build the **API sync with review queue** first. Once THV has reconciled several live donation cycles and the campaign rules are reliable, enable automatic creation for clearly matched donations while retaining manual review for exceptions.

## Decisions needed before implementation

1. Which Zeffy campaign/form IDs should create donor cards, and which should be excluded? At minimum, trip program contributions must be excluded.
2. Do you want imports to appear immediately after a payment, or is a daily synchronization sufficient?
3. Should a new donor with missing email, address, or unclear name enter a review queue rather than create a card automatically? This is recommended.

## References

[1] [Zeffy API Beta: Free Public API for Nonprofits](https://www.zeffy.com/integration/api)

[2] [Zeffy Help Center: Get Started With the Zeffy API](https://support.zeffy.com/get-started-with-the-zeffy-api-yourg)

[3] [Zeffy Help Center: Integrating Zeffy with Other Software](https://support.zeffy.com/integrating-zeffy-with-other-softwares-74zts)

[4] [Zeffy Help Center: Reports and Exporting Data](https://support.zeffy.com/reports-and-exporting-data-k15ip)
