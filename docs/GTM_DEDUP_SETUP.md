# GTM Configuration for Event ID Deduplication

This guide configures Google Tag Manager to pass `event_id` to Meta Pixel and Pinterest Tag for browser/server event deduplication.

## Prerequisites

- GTM Container ID: `GTM-K9KM3953`
- Meta Pixel ID: `1588901548777498`
- Pinterest Tag ID: `2613563536774`

---

## Step 1: Create Data Layer Variables

### 1.1 Event ID Variable (camelCase)

1. Go to **Variables** → **User-Defined Variables** → **New**
2. Configure:
   - **Name:** `DLV - eventID`
   - **Variable Type:** Data Layer Variable
   - **Data Layer Variable Name:** `eventID`
   - **Data Layer Version:** Version 2
3. **Save**

### 1.2 Event ID Variable (snake_case)

1. Go to **Variables** → **User-Defined Variables** → **New**
2. Configure:
   - **Name:** `DLV - event_id`
   - **Variable Type:** Data Layer Variable
   - **Data Layer Variable Name:** `event_id`
   - **Data Layer Version:** Version 2
3. **Save**

### 1.3 Ecommerce Value Variable

1. Go to **Variables** → **User-Defined Variables** → **New**
2. Configure:
   - **Name:** `DLV - Ecommerce Value`
   - **Variable Type:** Data Layer Variable
   - **Data Layer Variable Name:** `ecommerce.value`
   - **Data Layer Version:** Version 2
3. **Save**

### 1.4 Combined Event ID Variable (with fallback)

1. Go to **Variables** → **User-Defined Variables** → **New**
2. Configure:
   - **Name:** `Event ID Combined`
   - **Variable Type:** Custom JavaScript
   - **Custom JavaScript:**
     ```javascript
     function() {
       return {{DLV - eventID}} || {{DLV - event_id}} || '';
     }
     ```
3. **Save**

---

## Step 2: Create Triggers

> [!IMPORTANT] > **Purchase tags MUST use a Custom Event trigger, NOT Page View/DOM Ready/Window Loaded!**  
> The `purchase` event is pushed to the dataLayer via JavaScript AFTER the page loads.

### 2.1 Begin Checkout Trigger

1. Go to **Triggers** → **New**
2. Configure:
   - **Name:** `CE - begin_checkout`
   - **Trigger Type:** Custom Event
   - **Event name:** `begin_checkout`
   - **This trigger fires on:** All Custom Events
3. **Save**

### 2.2 Purchase Trigger (CRITICAL!)

1. Go to **Triggers** → **New**
2. Configure:
   - **Name:** `CE - purchase`
   - **Trigger Type:** Custom Event
   - **Event name:** `purchase`
   - **This trigger fires on:** All Custom Events
3. **Save**

---

## Step 3: Configure Meta Pixel Tags

### 3.0 Meta Pixel - Base Code (CRITICAL FIX)

> [!WARNING]
> You **MUST** disable `autoConfig` to prevent duplicate "SubscribedButtonClick" and "InitiateCheckout" events from Meta's automatic bot!

1. Go to **Tags** → **Meta Pixel - Base** (or create it)
2. **Tag Type:** Custom HTML
3. **Trigger:** All Pages
4. **HTML:**

   ```html
   <!-- Meta Pixel Code -->
   <script>
     !(function (f, b, e, v, n, t, s) {
       if (f.fbq) return;
       n = f.fbq = function () {
         n.callMethod
           ? n.callMethod.apply(n, arguments)
           : n.queue.push(arguments);
       };
       if (!f._fbq) f._fbq = n;
       n.push = n;
       n.loaded = !0;
       n.version = "2.0";
       n.queue = [];
       t = b.createElement(e);
       t.async = !0;
       t.src = v;
       s = b.getElementsByTagName(e)[0];
       s.parentNode.insertBefore(t, s);
     })(
       window,
       document,
       "script",
       "https://connect.facebook.net/en_US/fbevents.js"
     );

     // CRITICAL: Disable autoConfig to stop duplicate events
     fbq("init", "1588901548777498", { autoConfig: false });

     fbq("track", "PageView");
   </script>
   <noscript
     ><img
       height="1"
       width="1"
       style="display:none"
       src="https://www.facebook.com/tr?id=1588901548777498&ev=PageView&noscript=1"
   /></noscript>
   <!-- End Meta Pixel Code -->
   ```

### 3.1 Meta Pixel - Begin Checkout Tag

1. Go to **Tags** → **New**
2. Configure:
   - **Name:** `Meta Pixel - Begin Checkout`
   - **Tag Type:** Custom HTML
   - **HTML:**
     ```html
     <script>
       fbq('track', 'InitiateCheckout', {
         value: {{DLV - Ecommerce Value}},
         currency: 'USD'
       }, {eventID: '{{Event ID Combined}}'});
     </script>
     ```
   - **Trigger:** `CE - begin_checkout`
3. **Save**

### 3.2 Meta Pixel - Purchase Tag

1. Go to **Tags** → **New**
2. Configure:
   - **Name:** `Meta Pixel - Purchase`
   - **Tag Type:** Custom HTML
   - **HTML:**
     ```html
     <script>
       fbq('track', 'Purchase', {
         value: {{DLV - Ecommerce Value}},
         currency: 'USD',
         content_type: 'product'
       }, {eventID: '{{Event ID Combined}}'});
     </script>
     ```
   - **Trigger:** `CE - purchase` ← **NOT Page View!**
3. **Save**

---

## Step 4: Configure Pinterest Tags

### 4.1 Pinterest - Begin Checkout Tag

1. Go to **Tags** → **New**
2. Configure:
   - **Name:** `Pinterest - Begin Checkout`
   - **Tag Type:** Custom HTML
   - **HTML:**
     ```html
     <script>
       pintrk('track', 'checkout', {
         event_id: '{{Event ID Combined}}',
         value: {{DLV - Ecommerce Value}},
         order_quantity: 1,
         currency: 'USD'
       });
     </script>
     ```
   - **Trigger:** `CE - begin_checkout`
3. **Save**

### 4.2 Pinterest - Purchase Tag

1. Go to **Tags** → **New**
2. Configure:
   - **Name:** `Pinterest - Purchase`
   - **Tag Type:** Custom HTML
   - **HTML:**
     ```html
     <script>
       pintrk('track', 'checkout', {
         event_id: '{{Event ID Combined}}',
         value: {{DLV - Ecommerce Value}},
         order_quantity: 1,
         currency: 'USD'
       });
     </script>
     ```
   - **Trigger:** `CE - purchase` ← **NOT Page View!**
3. **Save**

---

## Step 5: Remove/Disable Conflicting Tags

> [!CAUTION]
> If you have existing Purchase/Checkout tags firing on **Page View**, **DOM Ready**, or **Window Loaded** triggers, they will fire with empty eventID and cause deduplication failures!

1. Go to **Tags** in GTM
2. Search for any existing Meta Pixel or Pinterest tags related to Purchase/Checkout
3. Either:
   - **Delete** them if you've created new ones above, OR
   - **Update their triggers** to use `CE - purchase` instead of Page View

---

## Step 6: Test in Preview Mode

1. Click **Preview** in GTM
2. Go to your site → initiate checkout → complete purchase
3. In GTM Debug panel, verify:

   **On checkout page:**

   - `begin_checkout` event fires
   - Meta Pixel - Begin Checkout tag fires with `eventID`
   - Pinterest - Begin Checkout tag fires with `event_id`

   **On success page (/vault?success=true):**

   - `purchase` event fires (check Data Layer tab)
   - Meta Pixel - Purchase tag fires with `eventID`
   - Pinterest - Purchase tag fires with `event_id`
   - `eventID` value matches what was stored at checkout

---

## Step 7: Publish Container

1. Click **Submit** in GTM
2. Add version name: `Fix purchase event triggers for deduplication`
3. **Publish**

---

## Validation

### Meta Events Manager

1. Go to [facebook.com/events_manager](https://facebook.com/events_manager)
2. Select your Pixel → **Test Events**
3. Make a test purchase
4. Look for events with **"Received and Deduplicated"** status

### Pinterest Ads Manager

1. Go to [ads.pinterest.com](https://ads.pinterest.com) → **Conversions**
2. Select Tag → **Event History**
3. Verify single `checkout` event per purchase (not duplicated)

---

## Troubleshooting

| Issue                             | Cause                   | Fix                                                                  |
| --------------------------------- | ----------------------- | -------------------------------------------------------------------- |
| Tags not firing on success page   | Wrong trigger type      | Use `CE - purchase` Custom Event trigger, NOT Page View              |
| eventID is empty/undefined        | Variable not reading    | Check Data Layer Variable name is exactly `eventID` (case-sensitive) |
| Events not deduplicating          | event_id mismatch       | Ensure browser eventID matches server event_id exactly               |
| Duplicate purchase events         | Old tags still active   | Remove/disable any Purchase tags using Page View triggers            |
| Value shows as $0 or wrong amount | Variable path incorrect | Verify `ecommerce.value` path in Data Layer                          |
