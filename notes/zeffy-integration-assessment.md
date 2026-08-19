# Zeffy Donor Automation Assessment

## Verified current capabilities

- Zeffy offers a free, read-only API for payments, contacts, and campaigns. Payment data can be filtered by date and includes line-item detail, refunds, buyer information, and tax receipt links.
- Zeffy supports a configured webhook URL in Settings → Integrations. On a completed payment, it sends a `payment.completed` POST event with a full payment object and retries when the receiving endpoint does not return a 2xx response.
- Zeffy documents API-key authentication, HTTPS-only API requests, 100 requests per minute per key, and key regeneration. Its public support page does not document a webhook signature-verification mechanism.
- Zeffy also supports Zapier, but Zapier may introduce subscription cost and a separate operational dependency.

## Recommended classification logic

1. Monthly recurring payment: Monthly Giving, regardless of value.
2. One-time or annual donor: use the donor's calendar-year recorded giving total after the new payment.
3. $500–$4,999 annual total: Donors 500–5K.
4. $5,000+ annual total: Major Donors.
5. Under $500 without monthly recurring status: do not automatically create a tracked donor card.

## Recommended rollout

Start with a server-side dashboard sync that retrieves Zeffy payments and creates a reviewable import queue or requires a user-initiated Sync Zeffy action. Store Zeffy payment and contact IDs to deduplicate. Once results are reconciled against Zeffy exports, optionally enable the real-time webhook.

## Security safeguards

- Keep the Zeffy API key only in server-side environment configuration; never expose it in the browser.
- Use a separate secret endpoint for webhook intake and verify every received payment against Zeffy's API before creating data in the dashboard.
- Deduplicate using Zeffy payment ID before any donor, donation, or portfolio update.
- Maintain a rejected/needs-review queue for ambiguous matching, refunds, missing names or email, and changes to existing donor records.
- Use least-privilege admin access for Zeffy key generation and rotate/revoke the key if exposure is suspected.

## Official sources

- https://www.zeffy.com/integration/api
- https://support.zeffy.com/get-started-with-the-zeffy-api-yourg
- https://support.zeffy.com/integrating-zeffy-with-other-softwares-74zts
- https://support.zeffy.com/reports-and-exporting-data-k15ip
