/*
 * Ledgerly - service library, categories, document types and currencies.
 * Prices are typical UK prices at time of writing and are always editable by the user.
 * Cancel links point only to well-known official account / cancel pages; where a
 * deep link isn't certain we link to the service's main site or account page.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.LG = root.LG || {}).Library = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CATEGORIES = [
    { id: 'entertainment', name: 'TV & streaming', color: '#6366F1', track: true },
    { id: 'music', name: 'Music & audio', color: '#EC4899', track: true },
    { id: 'software', name: 'Software & cloud', color: '#0EA5E9', track: true },
    { id: 'ai', name: 'AI tools', color: '#8B5CF6', track: true },
    { id: 'news', name: 'News & reading', color: '#F59E0B', track: true },
    { id: 'fitness', name: 'Health & fitness', color: '#10B981', track: true },
    { id: 'food', name: 'Food & delivery', color: '#F97316', track: true },
    { id: 'gaming', name: 'Gaming', color: '#22C55E', track: true },
    { id: 'home', name: 'Home & utilities', color: '#0F766E', track: false },
    { id: 'phone', name: 'Phone & internet', color: '#3B82F6', track: false },
    { id: 'insurance', name: 'Insurance', color: '#64748B', track: false },
    { id: 'transport', name: 'Car & transport', color: '#A16207', track: false },
    { id: 'finance', name: 'Banking & finance', color: '#14B8A6', track: true },
    { id: 'shopping', name: 'Shopping & memberships', color: '#E11D48', track: true },
    { id: 'other', renew: 12, name: 'Other', color: '#94A3B8', track: true }
  ];

  var APPLE_CANCEL = 'https://support.apple.com/en-gb/118428';
  var APPLE_NOTE = 'On iPhone or iPad: Settings > your name > Subscriptions, choose the service, then Cancel Subscription. You keep access until the end of the period you have paid for.';
  var MS_ACCOUNT = 'https://account.microsoft.com/services';
  var GOOGLE_ONE = 'https://one.google.com/settings';

  // [id, name, category, typical price, cycle, tile colour, monogram, overlap group, typical annual price, cancel url, cancel note]
  var RAW = [
    // TV & streaming
    ['netflix', 'Netflix', 'entertainment', 12.99, 'monthly', '#B20710', 'N', 'video', 0, 'https://www.netflix.com/cancelplan', 'Account > Cancel membership. Access continues until your billing date.'],
    ['disney', 'Disney+', 'entertainment', 9.99, 'monthly', '#0E2A6B', 'D+', 'video', 99.90, 'https://www.disneyplus.com/account', 'Profile > Account > Subscription > Cancel subscription. If you pay through Apple, Google or Amazon, cancel there instead.'],
    ['prime', 'Amazon Prime', 'shopping', 8.99, 'monthly', '#146EB4', 'a', 'prime', 95.00, 'https://www.amazon.co.uk/gp/primecentral', 'Prime Central > Manage membership > End membership. Unused Prime may be refundable.'],
    ['appletv', 'Apple TV+', 'entertainment', 9.99, 'monthly', '#1D1D1F', 'tv', 'video', 0, APPLE_CANCEL, APPLE_NOTE],
    ['now', 'NOW', 'entertainment', 9.99, 'monthly', '#0B3B2E', 'NOW', 'video', 0, 'https://www.nowtv.com', 'Sign in > My Account > Memberships, then cancel each membership. NOW is rolling monthly.'],
    ['paramount', 'Paramount+', 'entertainment', 6.99, 'monthly', '#0064FF', 'P+', 'video', 0, 'https://www.paramountplus.com/account/', 'Account > Cancel subscription. Cancel through your app store if you signed up there.'],
    ['youtube', 'YouTube Premium', 'entertainment', 12.99, 'monthly', '#CC0000', 'YT', 'video', 0, 'https://www.youtube.com/paid_memberships', 'Purchases and memberships > Manage membership > Deactivate.'],
    ['itvx', 'ITVX Premium', 'entertainment', 5.99, 'monthly', '#102C54', 'ITV', 'video', 59.99, 'https://www.itv.com', 'Account > Manage subscription > Cancel. App store sign-ups must be cancelled in the store.'],
    ['discovery', 'discovery+', 'entertainment', 6.99, 'monthly', '#2175D9', 'd+', 'video', 0, 'https://www.discoveryplus.com', 'Account > Subscription > Cancel. App store sign-ups must be cancelled in the store.'],
    ['crunchyroll', 'Crunchyroll', 'entertainment', 5.99, 'monthly', '#F47521', 'CR', 'video', 0, 'https://www.crunchyroll.com/account/membership', 'Settings > Membership > Cancel membership.'],
    ['dazn', 'DAZN', 'entertainment', 14.99, 'monthly', '#111111', 'DZ', 'sport', 0, 'https://www.dazn.com', 'My Account > Subscription > Cancel. Annual plans paid monthly may have a minimum term.'],
    ['sky', 'Sky TV', 'entertainment', 15.00, 'monthly', '#003F8C', 'sky', 'video', 0, 'https://www.sky.com', 'Sky usually requires 31 days notice by phone or online chat. Check if you are still in a minimum term.'],
    ['tnt', 'TNT Sports', 'entertainment', 30.99, 'monthly', '#0A0A0A', 'TNT', 'sport', 0, 'https://www.tntsports.co.uk', 'Cancel through the provider you subscribed with (BT/EE, Sky, Virgin or discovery+).'],
    // Music & audio
    ['spotify', 'Spotify Premium', 'music', 12.99, 'monthly', '#1DB954', 'S', 'music', 0, 'https://www.spotify.com/account/subscription/', 'Account > Manage your plan > Cancel Premium. You drop to the free plan at the end of the period.'],
    ['applemusic', 'Apple Music', 'music', 10.99, 'monthly', '#FA243C', '\u266B', 'music', 109.00, APPLE_CANCEL, APPLE_NOTE],
    ['ytmusic', 'YouTube Music', 'music', 10.99, 'monthly', '#E62117', 'YM', 'music', 0, 'https://www.youtube.com/paid_memberships', 'Purchases and memberships > YouTube Music > Deactivate.'],
    ['amazonmusic', 'Amazon Music Unlimited', 'music', 10.99, 'monthly', '#25D1DA', 'am', 'music', 109.00, 'https://www.amazon.co.uk/music/settings', 'Amazon Music settings > Cancel subscription.'],
    ['tidal', 'TIDAL', 'music', 10.99, 'monthly', '#000000', 'TI', 'music', 0, 'https://account.tidal.com', 'Account > Manage subscription > Cancel.'],
    ['deezer', 'Deezer', 'music', 11.99, 'monthly', '#A238FF', 'Dz', 'music', 0, 'https://www.deezer.com', 'Account settings > Manage my subscription > Cancel.'],
    ['audible', 'Audible', 'music', 8.99, 'monthly', '#F29A1F', 'Au', 'audiobooks', 0, 'https://www.audible.co.uk/account', 'Account details > Cancel membership. Use any remaining credits first, they expire on cancellation.'],
    // Software & cloud
    ['icloud', 'iCloud+ (200GB)', 'software', 2.99, 'monthly', '#3693F3', '\u2601', 'cloud', 0, APPLE_CANCEL, 'Settings > your name > iCloud > Manage Storage > Change Storage Plan > Downgrade Options.'],
    ['googleone', 'Google One (100GB)', 'software', 1.99, 'monthly', '#4285F4', 'G1', 'cloud', 19.99, GOOGLE_ONE, 'Google One > Settings > Cancel membership.'],
    ['dropbox', 'Dropbox Plus', 'software', 9.99, 'monthly', '#0061FE', 'Db', 'cloud', 95.88, 'https://www.dropbox.com/account/plan', 'Settings > Plan > Cancel plan. Your files stay but you drop to 2GB.'],
    ['m365', 'Microsoft 365 Personal', 'software', 8.99, 'monthly', '#D83B01', 'M', 'cloud', 89.99, MS_ACCOUNT, 'Microsoft account > Services & subscriptions > Manage > Cancel subscription.'],
    ['appleone', 'Apple One', 'software', 18.95, 'monthly', '#2B2B2B', '1', 'bundle', 0, APPLE_CANCEL, APPLE_NOTE],
    ['adobe', 'Adobe Creative Cloud', 'software', 56.98, 'monthly', '#DA1F26', 'Ai', 'design', 0, 'https://account.adobe.com/plans', 'Adobe account > Plans > Manage plan > Cancel. Annual plans paid monthly can carry an early cancellation fee.'],
    ['canva', 'Canva Pro', 'software', 10.99, 'monthly', '#00C4CC', 'C', 'design', 99.99, 'https://www.canva.com/settings', 'Settings > Billing & plans > Cancel subscription.'],
    ['notion', 'Notion Plus', 'software', 9.50, 'monthly', '#191919', 'N', 'notes', 0, 'https://www.notion.so', 'Settings > Billing > Change plan > Downgrade to Free.'],
    ['onepassword', '1Password', 'software', 2.99, 'monthly', '#0572EC', '1P', 'passwords', 0, 'https://1password.com', 'Sign in on 1password.com > Billing > Cancel subscription.'],
    ['grammarly', 'Grammarly Pro', 'software', 25.00, 'monthly', '#15C39A', 'G', 'writing', 120.00, 'https://account.grammarly.com/subscription', 'Account > Subscription > Cancel subscription.'],
    ['linkedin', 'LinkedIn Premium', 'software', 29.99, 'monthly', '#0A66C2', 'in', 'career', 0, 'https://www.linkedin.com/premium/', 'Me > Premium features > Manage Premium account > Cancel subscription.'],
    ['duolingo', 'Duolingo Super', 'software', 12.99, 'monthly', '#58CC02', 'Du', 'learning', 79.99, 'https://www.duolingo.com/settings/account', 'Cancel in the app store you subscribed through, or Settings > Subscription on the web.'],
    ['nordvpn', 'NordVPN', 'software', 11.99, 'monthly', '#4687FF', 'Nd', 'vpn', 59.88, 'https://my.nordaccount.com', 'Nord Account > Billing > Subscriptions > Cancel auto-renewal.'],
    ['expressvpn', 'ExpressVPN', 'software', 10.99, 'monthly', '#DA3940', 'Ex', 'vpn', 79.00, 'https://www.expressvpn.com', 'Sign in > My Subscriptions > Turn off automatic renewal.'],
    ['surfshark', 'Surfshark', 'software', 12.49, 'monthly', '#178BF1', 'Sf', 'vpn', 47.88, 'https://my.surfshark.com', 'My account > Subscription > Cancel subscription.'],
    // AI tools
    ['chatgpt', 'ChatGPT Plus', 'ai', 20.00, 'monthly', '#10A37F', 'GPT', 'ai', 0, 'https://chatgpt.com', 'Profile > Settings > Account/Subscription > Manage > Cancel plan. Cancel in the app store if you subscribed on mobile.'],
    ['claude', 'Claude Pro', 'ai', 18.00, 'monthly', '#C96442', 'Cl', 'ai', 0, 'https://claude.ai/settings/billing', 'Settings > Billing > Cancel plan.'],
    ['gemini', 'Google AI Pro (Gemini)', 'ai', 18.99, 'monthly', '#1A73E8', 'Ge', 'ai', 0, GOOGLE_ONE, 'Google One > Settings > Cancel membership.'],
    ['copilot', 'Microsoft Copilot Pro', 'ai', 19.00, 'monthly', '#2F2F8F', 'Co', 'ai', 0, MS_ACCOUNT, 'Microsoft account > Services & subscriptions > Copilot Pro > Cancel.'],
    ['perplexity', 'Perplexity Pro', 'ai', 20.00, 'monthly', '#20808D', 'Px', 'ai', 0, 'https://www.perplexity.ai/settings/account', 'Settings > Account > Manage subscription > Cancel.'],
    // News & reading
    ['times', 'The Times', 'news', 12.00, 'monthly', '#1A1A1A', 'T', 'news', 0, 'https://www.thetimes.com', 'My account > Subscriptions. Some plans need a phone call to cancel.'],
    ['guardian', 'The Guardian', 'news', 10.00, 'monthly', '#052962', 'G', 'news', 0, 'https://manage.theguardian.com', 'Manage my account > Subscriptions/Contributions > Cancel.'],
    ['economist', 'The Economist', 'news', 16.00, 'monthly', '#E3120B', 'E', 'news', 0, 'https://myaccount.economist.com', 'My account > Manage subscription > Cancel.'],
    ['ft', 'Financial Times', 'news', 39.00, 'monthly', '#990F3D', 'FT', 'news', 0, 'https://www.ft.com/myaccount', 'My account > Subscription > Cancel subscription.'],
    ['kindle', 'Kindle Unlimited', 'news', 9.49, 'monthly', '#232F3E', 'KU', 'books', 0, 'https://www.amazon.co.uk/kindle-dbs/ku/ku-central', 'Kindle Unlimited > Manage membership > Cancel.'],
    ['medium', 'Medium', 'news', 5.00, 'monthly', '#121212', 'M', 'news', 0, 'https://medium.com/me/settings', 'Settings > Membership and payment > Cancel membership.'],
    ['patreon', 'Patreon', 'other', 5.00, 'monthly', '#FF424D', 'P', '', 0, 'https://www.patreon.com/settings/memberships', 'Settings > Memberships > Edit > Cancel membership.'],
    // Health & fitness
    ['gym', 'Gym membership', 'fitness', 35.00, 'monthly', '#1F2937', '\u25CF', 'gym', 0, '', 'Check your contract for a notice period (often 1 month). Most gyms let you cancel in their app or member area.'],
    ['puregym', 'PureGym', 'fitness', 24.99, 'monthly', '#00A6A6', 'PG', 'gym', 0, 'https://www.puregym.com', 'Members area > Membership > Cancel membership. No contract on most plans.'],
    ['gymgroup', 'The Gym Group', 'fitness', 22.99, 'monthly', '#000000', 'GG', 'gym', 0, 'https://www.thegymgroup.com', 'Log in > My membership > Cancel membership.'],
    ['strava', 'Strava', 'fitness', 5.99, 'monthly', '#FC4C02', 'St', 'fitness-app', 54.99, 'https://www.strava.com/account', 'Settings > My Account > Downgrade. App store sign-ups must be cancelled in the store.'],
    ['peloton', 'Peloton App', 'fitness', 12.99, 'monthly', '#181A1D', 'Pe', 'fitness-app', 0, 'https://www.onepeloton.co.uk', 'Account > Subscriptions > Cancel subscription.'],
    ['headspace', 'Headspace', 'fitness', 10.99, 'monthly', '#F47D31', 'Hs', 'mindfulness', 69.99, 'https://www.headspace.com', 'Account > Subscription > Cancel. App store sign-ups must be cancelled in the store.'],
    ['calm', 'Calm', 'fitness', 14.99, 'monthly', '#2E6BB5', 'Ca', 'mindfulness', 39.99, 'https://www.calm.com', 'Profile > Manage subscription > Cancel.'],
    // Food & delivery
    ['deliveroo', 'Deliveroo Plus', 'food', 3.49, 'monthly', '#00CCBC', 'De', 'delivery', 0, 'https://deliveroo.co.uk', 'Account > Deliveroo Plus > Cancel subscription.'],
    ['uberone', 'Uber One', 'food', 5.99, 'monthly', '#000000', 'U1', 'delivery', 0, 'https://www.uber.com', 'Uber or Uber Eats app > Account > Uber One > Manage membership > End membership.'],
    ['hellofresh', 'HelloFresh', 'food', 45.00, 'weekly', '#91C11E', 'HF', 'mealkit', 0, 'https://www.hellofresh.co.uk', 'Account settings > Plan settings > Cancel plan. Skip weeks instead if you only need a break.'],
    ['gousto', 'Gousto', 'food', 40.00, 'weekly', '#E8423A', 'Go', 'mealkit', 0, 'https://www.gousto.co.uk', 'My details > Subscription > Pause or cancel.'],
    ['clubcard', 'Tesco Clubcard Plus', 'food', 7.99, 'monthly', '#00539F', 'C+', '', 0, 'https://www.tesco.com/clubcard', 'Clubcard account > Clubcard Plus > Manage > Cancel.'],
    // Gaming
    ['gamepass', 'Xbox Game Pass Ultimate', 'gaming', 22.99, 'monthly', '#107C10', 'X', 'games', 0, MS_ACCOUNT, 'Microsoft account > Services & subscriptions > Manage > Cancel subscription.'],
    ['psplus', 'PlayStation Plus', 'gaming', 6.99, 'monthly', '#00439C', 'PS', 'games', 59.99, 'https://www.playstation.com/en-gb/', 'Console: Settings > Users and Accounts > Account > Payment and Subscriptions > Subscriptions > Turn off auto-renew.'],
    ['nso', 'Nintendo Switch Online', 'gaming', 3.49, 'monthly', '#E60012', 'NS', 'games', 17.99, 'https://www.nintendo.com/en-gb/', 'Nintendo Account > Shop menu > Turn off automatic renewal.'],
    ['eaplay', 'EA Play', 'gaming', 3.99, 'monthly', '#FF4747', 'EA', 'games', 24.99, 'https://www.ea.com', 'Cancel in the platform you subscribed through (Xbox, PlayStation, Steam or EA app).'],
    // Home & utilities
    ['counciltax', 'Council Tax', 'home', 180.00, 'monthly', '#334155', 'CT', '', 0, 'https://www.gov.uk/council-tax', 'Council Tax cannot be cancelled, but check discounts: living alone gets 25% off, and students may be exempt.'],
    ['energy', 'Gas & electricity', 'home', 140.00, 'monthly', '#CA8A04', '\u26A1', '', 0, 'https://www.ofgem.gov.uk', 'You can switch supplier for free; your new supplier handles the move. Fixed deals may have exit fees.'],
    ['water', 'Water', 'home', 40.00, 'monthly', '#0284C7', 'H\u2082O', '', 0, '', 'Water cannot be switched in England, but a water meter can cut bills for small households.'],
    ['rent', 'Rent', 'home', 1200.00, 'monthly', '#57534E', 'R', '', 0, '', 'Check your tenancy agreement for the notice period.'],
    ['mortgage', 'Mortgage', 'home', 1100.00, 'monthly', '#44403C', 'Mg', '', 0, '', 'Set a reminder 6 months before your fixed rate ends so you can remortgage.'],
    ['boiler', 'Boiler cover', 'home', 18.00, 'monthly', '#EA580C', 'B', '', 0, '', 'Compare at renewal; many plans include an annual service you should book.'],
    ['tvlicence', 'TV Licence', 'home', 174.50, 'yearly', '#B91C1C', 'TV', '', 0, 'https://www.tvlicensing.co.uk', 'If you no longer watch live TV or use BBC iPlayer you can cancel and may get a refund.'],
    // Phone & internet
    ['broadband', 'Broadband', 'phone', 32.00, 'monthly', '#2563EB', '\u21C5', '', 0, 'https://www.ofcom.org.uk', 'Out of contract? Your provider must tell you, and switching via One Touch Switch is handled by the new provider.'],
    ['mobile', 'Mobile phone', 'phone', 20.00, 'monthly', '#7C3AED', '\u260E', '', 0, '', 'Text PAC to 65075 for a switching code, or STAC to 75075 to cancel. Codes arrive by text within a minute.'],
    ['sim', 'SIM-only plan', 'phone', 10.00, 'monthly', '#9333EA', 'SIM', '', 0, '', 'Text PAC to 65075 to keep your number, or STAC to 75075 to cancel.'],
    // Insurance
    ['carins', 'Car insurance', 'insurance', 640.00, 'yearly', '#475569', 'Car', '', 0, '', 'Compare quotes 3-4 weeks before renewal, prices are often lowest then. Turn off auto-renew if you plan to switch.'],
    ['homeins', 'Home insurance', 'insurance', 180.00, 'yearly', '#52525B', 'Hm', '', 0, '', 'Compare 3-4 weeks before renewal. Check buildings and contents cover separately.'],
    ['petins', 'Pet insurance', 'insurance', 28.00, 'monthly', '#78716C', 'Pet', '', 0, '', 'Switching can exclude existing conditions, so read the new policy carefully before cancelling.'],
    ['lifeins', 'Life insurance', 'insurance', 20.00, 'monthly', '#3F3F46', 'Life', '', 0, '', 'Speak to your insurer before cancelling; restarting cover later usually costs more.'],
    ['phoneins', 'Phone insurance', 'insurance', 8.00, 'monthly', '#6B7280', 'Ph', '', 0, '', 'Check whether your bank account or home insurance already covers your phone.'],
    ['breakdown', 'Breakdown cover', 'insurance', 120.00, 'yearly', '#D97706', 'BD', '', 0, '', 'Some bank accounts and car insurance policies include breakdown cover; check before renewing.'],
    // Car & transport
    ['carfinance', 'Car finance', 'transport', 250.00, 'monthly', '#92400E', 'CF', '', 0, '', 'You can usually settle early; ask the lender for a settlement figure.'],
    ['railcard', 'Railcard', 'transport', 35.00, 'yearly', '#B45309', 'RC', '', 0, 'https://www.railcard.co.uk', 'Railcards do not auto-renew; set a reminder so you are not caught without one.'],
    ['parking', 'Parking permit', 'transport', 100.00, 'yearly', '#A3A3A3', 'P', '', 0, '', 'Renew through your local council website.'],
    // Banking, shopping & other
    ['monzo', 'Monzo Perks', 'finance', 7.00, 'monthly', '#FF4F40', 'Mz', 'bank-plan', 0, 'https://monzo.com', 'In the app: Account > Manage plan > Downgrade.'],
    ['revolut', 'Revolut Premium', 'finance', 7.99, 'monthly', '#191C1F', 'R', 'bank-plan', 0, 'https://www.revolut.com', 'In the app: Profile > Your plan > Cancel plan.'],
    ['costco', 'Costco membership', 'shopping', 33.60, 'yearly', '#E31837', 'Cc', '', 0, 'https://www.costco.co.uk', 'Cancel at any warehouse membership desk for a refund of the fee.'],
    ['charity', 'Charity donation', 'other', 10.00, 'monthly', '#BE185D', '\u2665', '', 0, '', 'Contact the charity or cancel the Direct Debit in your banking app.']
  ];

  var SERVICES = RAW.map(function (r) {
    return { id: r[0], name: r[1], category: r[2], price: r[3], cycle: r[4], color: r[5], mono: r[6], group: r[7] || '', annualPrice: r[8] || 0, cancelUrl: r[9] || '', cancelNote: r[10] || '' };
  });
  var BY_ID = {};
  SERVICES.forEach(function (s) { BY_ID[s.id] = s; });

  var GROUP_LABELS = {
    music: 'music streaming', cloud: 'cloud storage', video: 'TV streaming', ai: 'AI assistant', vpn: 'VPN',
    gym: 'gym', 'fitness-app': 'fitness app', mindfulness: 'meditation app', delivery: 'food delivery pass',
    mealkit: 'meal kit', games: 'games subscription', news: 'news subscription', design: 'design software',
    'bank-plan': 'paid bank plan', sport: 'sports streaming', books: 'reading subscription'
  };
  // video & news overlap is common and often intentional, so only flag when 3+ are stacked
  var GROUP_THRESHOLD = { video: 3, news: 3 };

  // keyword fallback so custom items still get grouped
  var GROUP_KEYWORDS = [
    ['music', /spotify|apple music|tidal|deezer|youtube music|music unlimited|soundcloud/i],
    ['cloud', /icloud|google one|dropbox|onedrive|microsoft 365|box\.com|pcloud|mega/i],
    ['ai', /chatgpt|openai|claude|gemini|copilot|perplexity|midjourney/i],
    ['vpn', /vpn|surfshark/i],
    ['gym', /\bgym\b|fitness first|david lloyd|virgin active|nuffield/i],
    ['video', /netflix|disney|prime video|apple tv|now tv|paramount|britbox|itvx|hulu|max\b/i]
  ];
  function groupFor(item) {
    if (!item) return '';
    if (item.serviceId && BY_ID[item.serviceId]) return BY_ID[item.serviceId].group || '';
    var name = item.name || '';
    for (var i = 0; i < GROUP_KEYWORDS.length; i++) if (GROUP_KEYWORDS[i][1].test(name)) return GROUP_KEYWORDS[i][0];
    return '';
  }

  var DOC_TYPES = [
    { id: 'passport', renew: 120, name: 'Passport', icon: 'passport', lead: 180, url: 'https://www.gov.uk/renew-adult-passport', tip: 'Many countries need 3-6 months left on your passport, so renew well before travelling.' },
    { id: 'licence', renew: 120, name: 'Driving licence (photocard)', icon: 'id', lead: 60, url: 'https://www.gov.uk/renew-driving-licence', tip: 'The photocard must be renewed every 10 years. You can be fined up to \u00A31,000 for not renewing.' },
    { id: 'mot', renew: 12, name: 'MOT', icon: 'car', lead: 30, url: 'https://www.gov.uk/getting-an-mot', tip: 'You can get an MOT up to a month (minus a day) before it runs out and keep the same renewal date.' },
    { id: 'cartax', renew: 12, name: 'Car tax (VED)', icon: 'car', lead: 14, url: 'https://www.gov.uk/vehicle-tax', tip: 'Tax renews online at GOV.UK with the reference from your V11 reminder or V5C.' },
    { id: 'carins', renew: 12, name: 'Car insurance', icon: 'shield', lead: 28, url: '', tip: 'Quotes are often cheapest 3-4 weeks before renewal.' },
    { id: 'homeins', renew: 12, name: 'Home insurance', icon: 'home', lead: 28, url: '', tip: 'Compare buildings and contents cover before auto-renewing.' },
    { id: 'petins', renew: 12, name: 'Pet insurance', icon: 'paw', lead: 28, url: '', tip: 'Check how existing conditions are handled before switching.' },
    { id: 'travelins', renew: 12, name: 'Travel insurance', icon: 'plane', lead: 21, url: '', tip: 'Annual policies are often cheaper if you travel twice or more a year.' },
    { id: 'tvlicence', renew: 12, name: 'TV Licence', icon: 'tv', lead: 30, url: 'https://www.tvlicensing.co.uk', tip: 'Needed for live TV on any channel and for BBC iPlayer.' },
    { id: 'ghic', renew: 60, name: 'GHIC / EHIC card', icon: 'id', lead: 60, url: 'https://www.gov.uk/global-health-insurance-card', tip: 'The GHIC is free from the official GOV.UK/NHS site. Avoid paid third-party sites.' },
    { id: 'warranty', renew: 0, name: 'Product warranty', icon: 'box', lead: 30, url: '', tip: 'Report faults before the warranty ends, and keep your receipt.' },
    { id: 'boiler', renew: 12, name: 'Boiler service', icon: 'flame', lead: 30, url: '', tip: 'An annual service keeps most manufacturer warranties valid.' },
    { id: 'breakdown', renew: 12, name: 'Breakdown cover', icon: 'car', lead: 21, url: '', tip: 'Check whether your bank account includes it before renewing.' },
    { id: 'railcard', renew: 12, name: 'Railcard', icon: 'train', lead: 14, url: 'https://www.railcard.co.uk', tip: 'Railcards save a third on most rail fares.' },
    { id: 'visa', renew: 0, name: 'Visa / residence permit', icon: 'passport', lead: 120, url: 'https://www.gov.uk/browse/visas-immigration', tip: 'Start renewals early; processing times vary.' },
    { id: 'gas', renew: 12, name: 'Gas safety certificate', icon: 'flame', lead: 30, url: '', tip: 'Landlords must renew this every 12 months.' },
    { id: 'eye', renew: 24, name: 'Eye test', icon: 'eye', lead: 14, url: '', tip: 'Adults are advised to have an eye test every 2 years.' },
    { id: 'dentist', renew: 6, name: 'Dental check-up', icon: 'smile', lead: 14, url: '', tip: 'Book early; NHS appointments fill up quickly.' },
    { id: 'other', name: 'Other document', icon: 'doc', lead: 30, url: '', tip: '' }
  ];
  var DOC_BY_ID = {};
  DOC_TYPES.forEach(function (d) { DOC_BY_ID[d.id] = d; });

  var CURRENCIES = [
    { code: 'GBP', name: 'British pound', locale: 'en-GB' },
    { code: 'EUR', name: 'Euro', locale: 'en-IE' },
    { code: 'USD', name: 'US dollar', locale: 'en-US' },
    { code: 'CAD', name: 'Canadian dollar', locale: 'en-CA' },
    { code: 'AUD', name: 'Australian dollar', locale: 'en-AU' },
    { code: 'NZD', name: 'New Zealand dollar', locale: 'en-NZ' },
    { code: 'CHF', name: 'Swiss franc', locale: 'de-CH' },
    { code: 'SEK', name: 'Swedish krona', locale: 'sv-SE' },
    { code: 'NOK', name: 'Norwegian krone', locale: 'nb-NO' },
    { code: 'DKK', name: 'Danish krone', locale: 'da-DK' },
    { code: 'PLN', name: 'Polish zloty', locale: 'pl-PL' },
    { code: 'INR', name: 'Indian rupee', locale: 'en-IN' },
    { code: 'NGN', name: 'Nigerian naira', locale: 'en-NG' },
    { code: 'ZAR', name: 'South African rand', locale: 'en-ZA' },
    { code: 'AED', name: 'UAE dirham', locale: 'en-AE' },
    { code: 'JPY', name: 'Japanese yen', locale: 'ja-JP' },
    { code: 'SGD', name: 'Singapore dollar', locale: 'en-SG' }
  ];

  function category(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return CATEGORIES[CATEGORIES.length - 1];
  }

  return {
    CATEGORIES: CATEGORIES, SERVICES: SERVICES, DOC_TYPES: DOC_TYPES, CURRENCIES: CURRENCIES,
    GROUP_LABELS: GROUP_LABELS, GROUP_THRESHOLD: GROUP_THRESHOLD,
    service: function (id) { return BY_ID[id] || null; },
    docType: function (id) { return DOC_BY_ID[id] || DOC_BY_ID.other; },
    category: category, groupFor: groupFor
  };
});
