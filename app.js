/* Plain Plate v0.1 — grams-first food tracker. No accounts, no server: data stays on the device. */
'use strict';

/* ---------- Constants ---------- */
// App version shown in Settings. On every release, bump this AND the VERSION in sw.js to match.
const APP_VERSION = '0.3.0';
const STORE_KEY = 'plainplate.v1';
const LIFE = { sit: 1.55, feet: 1.85, heavy: 2.20 }; // FAO/WHO/UNU 2004 PAL, middle of each range
const GOALS = { maintain: { gentle: 0, standard: 0 }, lose: { gentle: -0.10, standard: -0.20 }, gain: { gentle: 0.05, standard: 0.10 } };
// 2024 Adult Compendium of Physical Activities (code, MET). Net kcal = (MET − 1) × kg × hours.
const ACTS = [
  ['strength', '02054', 3.5], ['strength_hard', '02050', 6.0], ['bodyweight', '02056', 3.0],
  ['walk', '17190', 3.8], ['walk_brisk', '17200', 4.8], ['hike', '17080', 6.0],
  ['run', '12050', 9.3], ['cycle_easy', '01010', 4.0], ['cycle', '01014', 7.0], ['cycle_indoor', '01216', 5.0],
  ['swim', '18240', 5.8], ['yoga', '02150', 2.3], ['pilates', '02105', 2.8], ['dance', '03070', 3.8],
  ['zumba', '02310', 6.5], ['circuit', '02035', 5.0], ['elliptical', '02048', 5.0], ['rowing', '02071', 5.0],
  ['tennis', '15675', 6.8], ['football', '15610', 7.0], ['basketball', '15055', 7.5], ['martial', '15425', 5.3], ['rope', '15551', 11.8]
];
const ACT = Object.fromEntries(ACTS.map(([k, c, m]) => [k, { code: c, met: m }]));
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const N = { kcal: 0, p: 1, c: 2, f: 3, s: 4, fi: 5, sf: 6, salt: 7 };
const KCAL_PER_KG = 7700; // rough rule of thumb, shown as "about"
// Grams in one level tablespoon (~15 ml); a teaspoon is a third. Typical household values (USDA household measures, pack servings).
// First match on the Ciqual English name wins; a third item limits the rule to one Ciqual group. Anything else asks the user once.
const SPOON = [
  [/^chia/i, 12], [/^flaxseed/i, 10], [/^sesame seed/i, 9], [/^sunflower seed/i, 9], [/^pumpkin and squash, seed/i, 8], [/^hemp, seed/i, 10],
  [/^(peanut butter|tahini)/i, 16], [/^honey$/i, 21], [/^maple syrup/i, 20], [/^(jam|marmalade)/i, 20],
  [/^sugar, (white|vanilla)/i, 12.5], [/^sugar, brown/i, 13.8],
  [/^butter oil/i, 13, 'o'], [/^butter/i, 14.2, 'o'], [/^spreadable fat/i, 14, 'o'], [/^(lard|chicken fat|duck fat|goose fat|turkey fat)/i, 13, 'o'], [/\boil\b/i, 13.6, 'o'],
  [/^oat (flakes|, raw)$/i, 5], [/^oat bran/i, 6], [/^wheat flour/i, 7.8], [/^cocoa powder, no added/i, 5.4], [/^cocoa or chocolate powder/i, 7],
  [/^milk,/i, 15.3], [/^cream\b/i, 15], [/^yogurt, greek-style, plain/i, 17], [/^yogurt\b.*plain/i, 15.3],
  [/^mayonnaise/i, 13.8], [/^ketchup/i, 17], [/^mustard/i, 15], [/^soy sauce/i, 16], [/^vinegar/i, 15], [/^lemon juice/i, 15],
  [/^rice, [a-z ,()]*raw$/i, 12], [/^parmesan/i, 5], [/^raisin$/i, 10], [/^coconut, pulp, dried/i, 5],
  [/^cinnamon, powder/i, 7.8], [/^paprika, powder/i, 6.9], [/^oregano, dried/i, 3], [/^salt, /i, 18], [/^coffee, ground/i, 5]
];
const SPOON_DIV = { tbsp: 1, tsp: 3 };
// Grams of edible part in one piece. Eggs follow EU box sizes (S <53 g, M 53–63, L 63–73, XL 73+ in shell), shell removed.
// Fruit and vegetables: USDA household measures for small / medium / large. Anything else asks the user once.
const PIECE = [
  [/^egg, (raw|hard-boiled|soft-boiled|poached|fried)/i, { S: 44, M: 51, L: 60, XL: 68 }, 'egg'], [/^egg white/i, { M: 34 }], [/^egg yolk/i, { M: 17 }],
  [/^banana, flesh without skin, raw/i, { S: 101, M: 118, L: 136 }], [/^apple, .*flesh and skin.*raw/i, { S: 149, M: 182, L: 223 }], [/^apple, .*without skin, raw/i, { S: 133, M: 162, L: 198 }],
  [/^orange, flesh/i, { S: 96, M: 131, L: 184 }], [/^clementine or mandarin orange, flesh/i, { M: 80 }], [/^tomato, cherry, raw/i, { M: 17 }],
  [/^tomato, (raw|round, raw|long, raw|green, raw|bunch, raw)/i, { S: 91, M: 123, L: 182 }], [/^potato, (new, |peeled, |ware, peeled, )?(raw|boiled\/cooked in water)/i, { S: 170, M: 213, L: 369 }],
  [/^onion, raw/i, { S: 70, M: 110, L: 150 }], [/^carrot, raw/i, { S: 50, M: 61, L: 72 }], [/^cucumber, flesh/i, { M: 300 }], [/^courgette or zucchini, flesh and skin, raw/i, { S: 118, M: 196, L: 323 }],
  [/^sweet pepper, [a-z ,]*raw$/i, { S: 74, M: 119, L: 164 }], [/^peach, .*raw/i, { S: 130, M: 150, L: 175 }], [/^pear, .*raw/i, { S: 148, M: 178, L: 230 }],
  [/^kiwi fruit/i, { M: 69, L: 91 }], [/^avocado, flesh/i, { M: 136 }], [/^lemon, flesh/i, { M: 58 }], [/^strawberry, raw/i, { M: 12, L: 18 }],
  [/^fig, raw/i, { M: 50 }], [/^fig, dried/i, { M: 8 }], [/^plum, .*raw/i, { M: 66 }], [/^apricot, pitted, raw/i, { M: 35 }], [/^date, /i, { M: 8 }],
  [/^olives?\b/i, { M: 4 }, null, 'x'], [/^almond, /i, { M: 1.2 }, null, 'v'], [/^rusk/i, { M: 10 }], [/^garlic, raw/i, { M: 3 }]
];
const SIZES = ['S', 'M', 'L', 'XL'];

/* ---------- Text (Greek / English) ---------- */
const T = {
  en: {
    appName: 'Plain Plate', today: 'Today', planner: 'Planner', weight: 'Weight', settings: 'Settings', back: 'Back',
    restDay: 'Rest day', workoutDay: 'Workout day', of: 'of', kcalLeft: 'kcal left', kcalOver: 'kcal over target',
    breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', nothingYet: 'Nothing yet', add: 'Add',
    addFood: 'Add food', addTo: 'Add to', protein: 'Protein', carbs: 'Carbs', fat: 'Fat', fibre: 'Fibre', sugars: 'Sugars', satfat: 'Saturated fat', salt: 'Salt', energy: 'Energy',
    refProtein: (g, kg) => `Reference: ${g} g at ${kg} kg · EFSA`, refCarbs: '45–60% of energy · EFSA', refFat: 'WHO ≤30% · EFSA 20–35% of energy', refFibre: 'Reference: 25 g · WHO · EFSA',
    refSalt: 'WHO & EFSA: 5 g a day (2 g sodium)', refSat: 'WHO under 10% of energy · EFSA as low as possible', refSugars: 'Total sugars from labels. WHO and EFSA advice is about free/added sugars, which labels don\'t separate.',
    more: 'Sugars, saturated fat, salt', less: 'Show less', approxToday: n => `${n} ${n === 1 ? 'entry is' : 'entries are'} approximate`, approx: 'approximate', partialDay: 'Some foods are missing values, so totals are partial.',
    dayComplete: 'I logged everything today', dayCompleteHint: 'Only fully logged days are used to fine-tune your targets.',
    searchPh: 'Search foods', recent: 'Recent', myFoods: 'My foods', foods: 'Foods', noResults: 'No matches.', cantFind: "Can't find it?",
    closest: 'Use the closest match', closestHint: 'Pick the nearest food above, then tick "approximate" before adding.', createMy: 'Create my food', createMyHint: 'From a label, per 100 g',
    scan: 'Scan a barcode', weighDryOrCooked: 'weigh dry or cooked', per100: 'kcal/100 g',
    iWeighed: 'I weighed it', dry: 'Dry, before cooking', cooked: 'Cooked', grams: 'Weight in grams', thisPortion: 'This portion', meal: 'Meal',
    onceCooked: g => `≈ ${g} g once cooked`, beforeCooking: g => `≈ ${g} g dry, before cooking`, markApprox: 'This is an approximate match', save: 'Save', update: 'Update', remove: 'Remove from log', addToMeal: m => `Add to ${m}`,
    per100src: 'Values per 100 g', source: 'Source', missing: 'not given',
    plannerQ: 'How many grams should I weigh?', setAmount: 'Set an amount', fillLeft: "Fill what's left", iWant: 'I want', leftToday: 'Left today', from: 'from', change: 'Change',
    weighDry: 'Weigh dry', weighCooked: 'Weigh cooked', weighIt: 'Weigh', beforeCookingL: 'before cooking', onPlate: 'on the plate', perHundred: v => `${v} kcal per 100 g`, pickFood: 'Pick a food', nothingLeft: 'Nothing left for today.',
    unitKcal: 'kcal', unitP: 'g protein', unitC: 'g carbs', unitF: 'g fat',
    wTitle: 'Weight', wAdd: 'Add weigh-in', wDate: 'Date', wKg: 'Weight (kg)', wNone: 'No weigh-ins yet.', wTrend: 'Trend',
    calTitle: 'Targets from your own data', calNeed: (d, w) => `Needs at least 14 fully logged days and 4 weigh-ins in the last 3 weeks. So far: ${d} days, ${w} weigh-ins.`,
    calSuggest: m => `Your logs and weigh-ins suggest your maintenance is about ${m} kcal a day.`, calWorking: 'How this was worked out',
    calDays: 'Fully logged days used', calAvg: 'Average intake', calTrend: 'Weight trend', calPerWeek: 'kg per week', calNew: 'Suggested targets', calCapped: 'Change limited to 10% this round; the next check can go further.',
    calLow: 'The data points below your estimated resting needs. That usually means some food went unlogged, so no suggestion this time.',
    calApply: 'Update my targets', calLater: 'Not now', calCustom: 'You use your own targets. This is shown for information; applying it replaces them.', calApplied: 'Targets updated',
    sTitle: 'Settings', sLang: 'Language', sTargets: 'Daily targets', sRest: 'Rest day', sWorkout: 'Workout day', sMode: 'Targets', sSplit: 'Workout days differ', sSame: 'Same every day',
    sOwn: 'Set my own', sUseCalc: 'Use calculated', sProfile: 'Profile & activity', sRedo: 'Edit answers', sProteinT: 'Protein target (optional, g)', sBackup: 'Backup', sExport: 'Export backup file', sImport: 'Import backup file', sImported: 'Backup restored', sAbout: 'About the data', sReset: 'Erase all data', sResetQ: 'Erase everything on this phone? This cannot be undone.', sMyFoods: 'My foods',
    howGot: 'How we got this', resting: 'Resting needs', restingSub: 'Mifflin–St Jeor equation', daily: 'Daily life', workouts: 'Workouts', goal: 'Goal', calibrated: 'Adjusted from your data',
    lowNote: k => `This is below your estimated resting needs (${k} kcal).`, estimates: 'Equations estimate. Treat these as a starting point; you can change them any time in Settings.',
    obLang: 'Language', obAbout: 'About you', obAboutSub: 'Used only to estimate your needs. Stays on this phone.', sex: 'Sex (used by the formula)', female: 'Female', male: 'Male', age: 'Age', height: 'Height (cm)', weightKg: 'Weight (kg)',
    obLife: 'Daily life, outside workouts', obLifeSub: 'Workouts come next, so don\'t count them here.', lifeSit: 'Mostly sitting', lifeSitEx: 'Desk job, studying, driving', lifeFeet: 'On my feet / physical job', lifeFeetEx: 'Shop, restaurant, building work, nursing', lifeHeavy: 'Heavy manual work', lifeHeavyEx: 'Farm work, hauling, forestry',
    obWork: 'Training week', obWorkSub: 'Tap your workout days. Skip if you don\'t train.', activity: 'Activity', minutes: 'Minutes', noWorkouts: 'No workouts', sameEach: 'Same activity each workout day',
    obGoal: 'Goal', maintain: 'Maintain', lose: 'Lose', gain: 'Gain', pace: 'Pace', gentle: 'Gentle', standard: 'Standard', paceInfo: (a, b) => `Gentle ${a}, standard ${b} of maintenance`,
    obTargets: 'Your daily targets', obTargetsSub: 'Calculated from your answers. Change anything.', weeklyAvg: 'Weekly average', daysWeek: n => `kcal · ${n} days a week`, everyDay: 'Every day', avgRounded: 'kcal · your weekly average', useThese: 'Use these', next: 'Next', skip: 'Skip', start: 'Start',
    ownTitle: 'Set my own targets', ownSub: 'Type any numbers. Leave workout day empty to use the same number.',
    myFoodTitle: 'My food', name: 'Name', barcode: 'Barcode (optional)', per100g: 'Per 100 g', delete: 'Delete', saved: 'Saved',
    scanTitle: 'Scan a barcode', scanNo: "This phone's browser can't scan. Type the barcode number instead.", scanType: 'Barcode number', lookup: 'Look up', looking: 'Looking up…', offNotFound: 'Not found on Open Food Facts. You can add it from the label.', offError: 'Could not reach Open Food Facts. Check the connection.', offFound: 'Found on Open Food Facts', addFromLabel: 'Add from the label', offNote: 'Label values from Open Food Facts (ODbL), entered by volunteers. Check them against the pack.',
    aboutTitle: 'About the data', aboutBody: [
      'Foods: Ciqual 2025, the French food composition table by ANSES (Agence nationale de sécurité sanitaire), 3,304 foods. Values per 100 g. "Traces" and "below detection" are counted as 0.',
      'Barcodes: Open Food Facts, a volunteer database (Open Database License). Shown as label data.',
      'Resting needs: Mifflin–St Jeor equation. Daily-life factors: FAO/WHO/UNU (2004) activity levels, middle of each range. Workouts: 2024 Adult Compendium of Physical Activities. Resistance bands are not listed there; the closest entry (bodyweight resistance exercises) is used.',
      'Reference values: WHO and EFSA, shown side by side when they differ. Information, not targets.',
      'Data-based targets use about 7,700 kcal per kg of body weight, a rough rule of thumb.',
      'Fonts: Commissioner and JetBrains Mono (SIL Open Font License).'],
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    acts: { strength: 'Strength training, moderate', strength_hard: 'Strength training, vigorous', bodyweight: 'Bodyweight or resistance bands', walk: 'Walking, moderate pace', walk_brisk: 'Walking, brisk', hike: 'Hiking', run: 'Running (~10 min/mile)', cycle_easy: 'Cycling, easy', cycle: 'Cycling, general', cycle_indoor: 'Indoor cycling, moderate', swim: 'Swimming laps, easy', yoga: 'Yoga', pilates: 'Pilates', dance: 'Dancing', zumba: 'Zumba', circuit: 'Circuit training', elliptical: 'Elliptical trainer', rowing: 'Rowing machine', tennis: 'Tennis', football: 'Football (casual)', basketball: 'Basketball', martial: 'Martial arts, practice', rope: 'Jump rope' },
    saveMeal: 'Save as a meal', myMeals: 'My meals', mealSaved: 'Meal saved', mealNameDef: m => `My ${m}`, addedN: n => `Added ${n} ${n === 1 ? 'item' : 'items'}`, sameAsLast: m => `Same as last ${m}`, noMeals: 'Save a meal from any meal screen to add it again in one tap.', mealDelQ: 'Delete this saved meal?',
    bkRemind: 'Remind me to back up', bkEvery: 'Every how many days', bkLast: x => `Last backup: ${x}`, bkNever: 'never', ago: n => n === 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`,
    bkDue: x => `Last backup: ${x}. Your log is stored only on this phone, so a backup file is the only way to get it back if the phone or browser data is lost.`, bkNow: 'Back up now', bkLater: 'Later', bkDone: 'Backup saved', bkHint: 'Keep the file somewhere off this phone: Drive, email or a computer.',
    showDetails: 'Show details', hideDetails: 'Hide details',     inMeal: 'In this meal', done: 'Done', mealHint: 'Search and add each part of the meal. This screen stays open until you tap Done.', items: n => `${n} ${n === 1 ? 'item' : 'items'}`, addedTo: m => `Added to ${m}`,
    segG: 'Grams', segPc: 'Pieces', segTsp: 'Teaspoon', segTbsp: 'Tablespoon', pc: n => num(n) === 1 ? 'pc' : 'pcs', pcLong: 'piece', sizeS: 'Small', sizeM: 'Medium', sizeL: 'Large', sizeXL: 'XL', sizeMine: 'My own', eggNote: 'egg box size, shell removed', pieceTypical: s => `typical ${s.toLowerCase()}`, pieceAsk: 'Grams in 1 piece', pieceHint: 'Weigh one once and it is remembered for this food.', tsp: 'tsp', tbsp: 'tbsp', tspLong: 'teaspoon', tbspLong: 'tablespoon', measureIn: 'Measure in', spoonIs: (u, g) => `1 ${u} = ${g} g`, spoonTypical: 'typical level spoon', spoonMine: 'your own value',
    spoonAsk: u => `Grams in 1 level ${u}`, spoonHint: 'Weigh one spoonful once and it is remembered for this food. A heaped spoon can weigh up to about twice as much.', gApprox: g => `≈ ${g} g`,
    offline: 'Saved on this phone', delConfirm: 'Delete this food?', yes: 'Yes', no: 'No', cancel: 'Cancel', toastAdded: 'Added', toastRemoved: 'Removed', installHint: 'To install: browser menu → "Add to Home screen".'
  },
  el: {
    appName: 'Plain Plate', today: 'Σήμερα', planner: 'Σχεδιασμός', weight: 'Βάρος', settings: 'Ρυθμίσεις', back: 'Πίσω',
    restDay: 'Ημέρα ξεκούρασης', workoutDay: 'Ημέρα προπόνησης', of: 'από', kcalLeft: 'kcal απομένουν', kcalOver: 'kcal πάνω από τον στόχο',
    breakfast: 'Πρωινό', lunch: 'Μεσημεριανό', dinner: 'Βραδινό', snack: 'Σνακ', nothingYet: 'Τίποτα ακόμα', add: 'Προσθήκη',
    addFood: 'Προσθήκη τροφής', addTo: 'Προσθήκη σε', protein: 'Πρωτεΐνη', carbs: 'Υδατάνθρακες', fat: 'Λιπαρά', fibre: 'Φυτικές ίνες', sugars: 'Σάκχαρα', satfat: 'Κορεσμένα λιπαρά', salt: 'Αλάτι', energy: 'Ενέργεια',
    refProtein: (g, kg) => `Αναφορά: ${g} g για ${kg} kg · EFSA`, refCarbs: '45–60% της ενέργειας · EFSA', refFat: 'ΠΟΥ ≤30% · EFSA 20–35% της ενέργειας', refFibre: 'Αναφορά: 25 g · ΠΟΥ · EFSA',
    refSalt: 'ΠΟΥ & EFSA: 5 g την ημέρα (2 g νάτριο)', refSat: 'ΠΟΥ κάτω από 10% της ενέργειας · EFSA όσο το δυνατόν λιγότερο', refSugars: 'Συνολικά σάκχαρα από τις ετικέτες. Οι συστάσεις ΠΟΥ και EFSA αφορούν ελεύθερα/πρόσθετα σάκχαρα, που οι ετικέτες δεν ξεχωρίζουν.',
    more: 'Σάκχαρα, κορεσμένα, αλάτι', less: 'Λιγότερα', approxToday: n => `${n} ${n === 1 ? 'καταχώρηση είναι' : 'καταχωρήσεις είναι'} κατά προσέγγιση`, approx: 'κατά προσέγγιση', partialDay: 'Σε κάποιες τροφές λείπουν τιμές, οπότε τα σύνολα είναι μερικά.',
    dayComplete: 'Κατέγραψα τα πάντα σήμερα', dayCompleteHint: 'Μόνο οι πλήρως καταγεγραμμένες μέρες χρησιμοποιούνται για να προσαρμοστούν οι στόχοι σου.',
    searchPh: 'Αναζήτηση τροφής', recent: 'Πρόσφατα', myFoods: 'Οι τροφές μου', foods: 'Τροφές', noResults: 'Δεν βρέθηκε τίποτα.', cantFind: 'Δεν το βρίσκεις;',
    closest: 'Η πιο κοντινή αντιστοιχία', closestHint: 'Διάλεξε την πιο κοντινή τροφή παραπάνω και σημείωσε «κατά προσέγγιση» πριν την προσθέσεις.', createMy: 'Δημιούργησε δική σου', createMyHint: 'Από ετικέτα, ανά 100 g',
    scan: 'Σάρωση barcode', weighDryOrCooked: 'ζύγισμα ωμό ή μαγειρεμένο', per100: 'kcal/100 g',
    iWeighed: 'Το ζύγισα', dry: 'Ωμό, πριν το μαγείρεμα', cooked: 'Μαγειρεμένο', grams: 'Βάρος σε γραμμάρια', thisPortion: 'Αυτή η μερίδα', meal: 'Γεύμα',
    onceCooked: g => `≈ ${g} g μαγειρεμένο`, beforeCooking: g => `≈ ${g} g ωμό, πριν το μαγείρεμα`, markApprox: 'Είναι κατά προσέγγιση αντιστοιχία', save: 'Αποθήκευση', update: 'Ενημέρωση', remove: 'Αφαίρεση', addToMeal: m => `Προσθήκη: ${m}`,
    per100src: 'Τιμές ανά 100 g', source: 'Πηγή', missing: 'δεν δίνεται',
    plannerQ: 'Πόσα γραμμάρια να ζυγίσω;', setAmount: 'Ορισμός ποσότητας', fillLeft: 'Ό,τι απομένει', iWant: 'Θέλω', leftToday: 'Απομένουν σήμερα', from: 'από', change: 'Αλλαγή',
    weighDry: 'Ζύγισε ωμό', weighCooked: 'Ζύγισε μαγειρεμένο', weighIt: 'Ζύγισε', beforeCookingL: 'πριν το μαγείρεμα', onPlate: 'στο πιάτο', perHundred: v => `${v} kcal ανά 100 g`, pickFood: 'Διάλεξε τροφή', nothingLeft: 'Δεν απομένει τίποτα για σήμερα.',
    unitKcal: 'kcal', unitP: 'g πρωτεΐνη', unitC: 'g υδατάνθρακες', unitF: 'g λιπαρά',
    wTitle: 'Βάρος', wAdd: 'Προσθήκη ζυγίσματος', wDate: 'Ημερομηνία', wKg: 'Βάρος (kg)', wNone: 'Δεν υπάρχουν ζυγίσματα ακόμα.', wTrend: 'Τάση',
    calTitle: 'Στόχοι από τα δικά σου δεδομένα', calNeed: (d, w) => `Χρειάζονται τουλάχιστον 14 πλήρως καταγεγραμμένες μέρες και 4 ζυγίσματα τις τελευταίες 3 εβδομάδες. Μέχρι τώρα: ${d} μέρες, ${w} ζυγίσματα.`,
    calSuggest: m => `Οι καταγραφές και τα ζυγίσματά σου δείχνουν ότι η συντήρησή σου είναι περίπου ${m} kcal την ημέρα.`, calWorking: 'Πώς υπολογίστηκε',
    calDays: 'Πλήρεις μέρες που μετρήθηκαν', calAvg: 'Μέση πρόσληψη', calTrend: 'Τάση βάρους', calPerWeek: 'kg την εβδομάδα', calNew: 'Προτεινόμενοι στόχοι', calCapped: 'Η αλλαγή περιορίστηκε στο 10% αυτή τη φορά· ο επόμενος έλεγχος μπορεί να προχωρήσει περισσότερο.',
    calLow: 'Τα δεδομένα δείχνουν κάτω από τις εκτιμώμενες ανάγκες ηρεμίας σου. Αυτό συνήθως σημαίνει ότι κάποιο φαγητό δεν καταγράφηκε, οπότε δεν γίνεται πρόταση αυτή τη φορά.',
    calApply: 'Ενημέρωση στόχων', calLater: 'Όχι τώρα', calCustom: 'Χρησιμοποιείς δικούς σου στόχους. Εμφανίζεται για ενημέρωση· αν το εφαρμόσεις, τους αντικαθιστά.', calApplied: 'Οι στόχοι ενημερώθηκαν',
    sTitle: 'Ρυθμίσεις', sLang: 'Γλώσσα', sTargets: 'Ημερήσιοι στόχοι', sRest: 'Ημέρα ξεκούρασης', sWorkout: 'Ημέρα προπόνησης', sMode: 'Στόχοι', sSplit: 'Διαφέρουν στις προπονήσεις', sSame: 'Ίδιοι κάθε μέρα',
    sOwn: 'Δικοί μου στόχοι', sUseCalc: 'Χρήση υπολογισμού', sProfile: 'Προφίλ & δραστηριότητα', sRedo: 'Αλλαγή απαντήσεων', sProteinT: 'Στόχος πρωτεΐνης (προαιρετικό, g)', sBackup: 'Αντίγραφο ασφαλείας', sExport: 'Εξαγωγή αρχείου', sImport: 'Εισαγωγή αρχείου', sImported: 'Τα δεδομένα επανήλθαν', sAbout: 'Σχετικά με τα δεδομένα', sReset: 'Διαγραφή όλων', sResetQ: 'Να διαγραφούν όλα από αυτό το κινητό; Δεν αναιρείται.', sMyFoods: 'Οι τροφές μου',
    howGot: 'Πώς προέκυψαν', resting: 'Ανάγκες ηρεμίας', restingSub: 'Εξίσωση Mifflin–St Jeor', daily: 'Καθημερινότητα', workouts: 'Προπονήσεις', goal: 'Στόχος', calibrated: 'Προσαρμοσμένο από τα δεδομένα σου',
    lowNote: k => `Είναι κάτω από τις εκτιμώμενες ανάγκες ηρεμίας σου (${k} kcal).`, estimates: 'Οι εξισώσεις δίνουν εκτίμηση. Είναι σημείο εκκίνησης· μπορείς να τους αλλάξεις όποτε θες από τις Ρυθμίσεις.',
    obLang: 'Γλώσσα', obAbout: 'Για σένα', obAboutSub: 'Χρησιμοποιούνται μόνο για την εκτίμηση. Μένουν σε αυτό το κινητό.', sex: 'Φύλο (για την εξίσωση)', female: 'Γυναίκα', male: 'Άνδρας', age: 'Ηλικία', height: 'Ύψος (cm)', weightKg: 'Βάρος (kg)',
    obLife: 'Καθημερινότητα, εκτός προπόνησης', obLifeSub: 'Οι προπονήσεις ακολουθούν, μην τις μετράς εδώ.', lifeSit: 'Κυρίως καθιστική', lifeSitEx: 'Γραφείο, διάβασμα, οδήγηση', lifeFeet: 'Όρθια / σωματική εργασία', lifeFeetEx: 'Κατάστημα, εστίαση, οικοδομή, νοσηλευτική', lifeHeavy: 'Βαριά χειρωνακτική εργασία', lifeHeavyEx: 'Αγροτικές δουλειές, μεταφορές, δασοκομία',
    obWork: 'Εβδομάδα προπόνησης', obWorkSub: 'Πάτησε τις μέρες προπόνησης. Προσπέρασε αν δεν γυμνάζεσαι.', activity: 'Δραστηριότητα', minutes: 'Λεπτά', noWorkouts: 'Χωρίς προπόνηση', sameEach: 'Ίδια δραστηριότητα κάθε μέρα προπόνησης',
    obGoal: 'Στόχος', maintain: 'Διατήρηση', lose: 'Απώλεια', gain: 'Αύξηση', pace: 'Ρυθμός', gentle: 'Ήπιος', standard: 'Κανονικός', paceInfo: (a, b) => `Ήπιος ${a}, κανονικός ${b} της συντήρησης`,
    obTargets: 'Οι ημερήσιοι στόχοι σου', obTargetsSub: 'Υπολογίστηκαν από τις απαντήσεις σου. Άλλαξε ό,τι θες.', weeklyAvg: 'Εβδομαδιαίος μέσος όρος', daysWeek: n => `kcal · ${n} μέρες την εβδομάδα`, everyDay: 'Κάθε μέρα', avgRounded: 'kcal · ο εβδομαδιαίος μέσος όρος', useThese: 'Χρήση αυτών', next: 'Επόμενο', skip: 'Προσπέραση', start: 'Ξεκίνα',
    ownTitle: 'Δικοί μου στόχοι', ownSub: 'Γράψε όποιους αριθμούς θες. Άφησε κενή την ημέρα προπόνησης για τον ίδιο αριθμό.',
    myFoodTitle: 'Δική μου τροφή', name: 'Όνομα', barcode: 'Barcode (προαιρετικό)', per100g: 'Ανά 100 g', delete: 'Διαγραφή', saved: 'Αποθηκεύτηκε',
    scanTitle: 'Σάρωση barcode', scanNo: 'Ο browser αυτού του κινητού δεν σαρώνει. Γράψε τον αριθμό του barcode.', scanType: 'Αριθμός barcode', lookup: 'Αναζήτηση', looking: 'Αναζήτηση…', offNotFound: 'Δεν βρέθηκε στο Open Food Facts. Μπορείς να το προσθέσεις από την ετικέτα.', offError: 'Δεν υπάρχει σύνδεση με το Open Food Facts.', offFound: 'Βρέθηκε στο Open Food Facts', addFromLabel: 'Προσθήκη από ετικέτα', offNote: 'Τιμές ετικέτας από το Open Food Facts (ODbL), καταχωρημένες από εθελοντές. Έλεγξέ τες με τη συσκευασία.',
    aboutTitle: 'Σχετικά με τα δεδομένα', aboutBody: [
      'Τροφές: Ciqual 2025, ο γαλλικός πίνακας σύστασης τροφίμων της ANSES (Agence nationale de sécurité sanitaire), 3.304 τροφές. Τιμές ανά 100 g. Τα «ίχνη» και οι τιμές κάτω από το όριο ανίχνευσης μετρούν ως 0.',
      'Barcodes: Open Food Facts, εθελοντική βάση (Open Database License). Εμφανίζονται ως δεδομένα ετικέτας.',
      'Ανάγκες ηρεμίας: εξίσωση Mifflin–St Jeor. Καθημερινότητα: επίπεδα δραστηριότητας FAO/WHO/UNU (2004), μέση κάθε εύρους. Προπονήσεις: 2024 Adult Compendium of Physical Activities. Τα λάστιχα αντίστασης δεν υπάρχουν εκεί· χρησιμοποιείται η πιο κοντινή κατηγορία (ασκήσεις με βάρος σώματος).',
      'Τιμές αναφοράς: ΠΟΥ και EFSA, δίπλα-δίπλα όταν διαφέρουν. Ενημερωτικά, όχι στόχοι.',
      'Οι στόχοι από τα δεδομένα σου χρησιμοποιούν περίπου 7.700 kcal ανά κιλό σωματικού βάρους, έναν χοντρικό εμπειρικό κανόνα.',
      'Γραμματοσειρές: Commissioner και JetBrains Mono (SIL Open Font License).'],
    days: ['Κυρ', 'Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ'], months: ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαΐ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'],
    acts: { strength: 'Βάρη, μέτρια ένταση', strength_hard: 'Βάρη, υψηλή ένταση', bodyweight: 'Βάρος σώματος ή λάστιχα', walk: 'Περπάτημα, μέτριο', walk_brisk: 'Περπάτημα, γρήγορο', hike: 'Πεζοπορία', run: 'Τρέξιμο (~6 λεπτά/χλμ)', cycle_easy: 'Ποδήλατο, χαλαρά', cycle: 'Ποδήλατο, γενικά', cycle_indoor: 'Στατικό ποδήλατο, μέτριο', swim: 'Κολύμπι, χαλαρές διαδρομές', yoga: 'Γιόγκα', pilates: 'Πιλάτες', dance: 'Χορός', zumba: 'Ζούμπα', circuit: 'Κυκλική προπόνηση', elliptical: 'Ελλειπτικό', rowing: 'Κωπηλατική μηχανή', tennis: 'Τένις', football: 'Ποδόσφαιρο (χαλαρό)', basketball: 'Μπάσκετ', martial: 'Πολεμικές τέχνες, εξάσκηση', rope: 'Σχοινάκι' },
    saveMeal: 'Αποθήκευση ως γεύμα', myMeals: 'Τα γεύματά μου', mealSaved: 'Το γεύμα αποθηκεύτηκε', mealNameDef: m => `Το ${m} μου`, addedN: n => `Προστέθηκαν ${n}`, sameAsLast: m => `Ίδιο με το προηγούμενο ${m}`, noMeals: 'Αποθήκευσε ένα γεύμα από την οθόνη κάθε γεύματος για να το ξαναβάζεις με ένα πάτημα.', mealDelQ: 'Διαγραφή αυτού του γεύματος;',
    bkRemind: 'Υπενθύμιση για αντίγραφο ασφαλείας', bkEvery: 'Κάθε πόσες μέρες', bkLast: x => `Τελευταίο αντίγραφο: ${x}`, bkNever: 'ποτέ', ago: n => n === 0 ? 'σήμερα' : n === 1 ? 'χθες' : `πριν από ${n} μέρες`,
    bkDue: x => `Τελευταίο αντίγραφο: ${x}. Τα δεδομένα σου υπάρχουν μόνο σε αυτό το κινητό, οπότε ένα αρχείο αντιγράφου είναι ο μόνος τρόπος να τα πάρεις πίσω αν χαθεί το κινητό ή τα δεδομένα του browser.`, bkNow: 'Αντίγραφο τώρα', bkLater: 'Αργότερα', bkDone: 'Το αντίγραφο αποθηκεύτηκε', bkHint: 'Κράτα το αρχείο κάπου εκτός κινητού: Drive, email ή υπολογιστή.',
    showDetails: 'Λεπτομέρειες', hideDetails: 'Απόκρυψη',     inMeal: 'Σε αυτό το γεύμα', done: 'Τέλος', mealHint: 'Ψάξε και πρόσθεσε κάθε κομμάτι του γεύματος. Η οθόνη μένει ανοιχτή μέχρι να πατήσεις «Τέλος».', items: n => `${n} ${n === 1 ? 'τροφή' : 'τροφές'}`, addedTo: m => `Προστέθηκε: ${m}`,
    segG: 'Γραμμάρια', segPc: 'Τεμάχια', segTsp: 'Κουταλάκι', segTbsp: 'Κουτάλι', pc: () => 'τεμ.', pcLong: 'τεμάχιο', sizeS: 'Μικρό', sizeM: 'Μεσαίο', sizeL: 'Μεγάλο', sizeXL: 'XL', sizeMine: 'Δικό μου', eggNote: 'μέγεθος συσκευασίας, χωρίς τσόφλι', pieceTypical: s => `τυπικό ${s.toLowerCase()}`, pieceAsk: 'Γραμμάρια σε 1 τεμάχιο', pieceHint: 'Ζύγισε ένα μία φορά και θα το θυμάται για αυτή την τροφή.', tsp: 'κ.γ.', tbsp: 'κ.σ.', tspLong: 'κουταλάκι του γλυκού', tbspLong: 'κουτάλι της σούπας', measureIn: 'Μέτρηση σε', spoonIs: (u, g) => `1 ${u} = ${g} g`, spoonTypical: 'τυπική κοφτή κουταλιά', spoonMine: 'δική σου τιμή',
    spoonAsk: u => `Γραμμάρια σε 1 κοφτό ${u}`, spoonHint: 'Ζύγισε μία κουταλιά μία φορά και θα τη θυμάται για αυτή την τροφή. Μια γεμάτη κουταλιά μπορεί να ζυγίζει έως και περίπου τα διπλά.', gApprox: g => `≈ ${g} g`,
    offline: 'Αποθηκευμένο σε αυτό το κινητό', delConfirm: 'Διαγραφή αυτής της τροφής;', yes: 'Ναι', no: 'Όχι', cancel: 'Άκυρο', toastAdded: 'Προστέθηκε', toastRemoved: 'Αφαιρέθηκε', installHint: 'Για εγκατάσταση: μενού browser → «Προσθήκη στην αρχική οθόνη».'
  }
};

/* ---------- State ---------- */
let S = load();
let DB = null, FOOD = new Map(), PAIR = new Map();
let ob = null; // onboarding draft
let ui = { moreOpen: false, query: '', plan: { mode: 'set', unit: 'kcal', amount: 100, food: { src: 'c', id: 9100 } } };

function blank() {
  return { v: 1, lang: (navigator.language || 'en').toLowerCase().startsWith('el') ? 'el' : 'en', profile: null, log: {}, myFoods: [], weights: [], recent: [], calib: null, sumOpen: false, spoon: {}, piece: {}, meals: [], backup: { on: true, days: 7, last: null, since: null, snooze: null } };
}
function load() {
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY)); if (s && s.v === 1) return Object.assign(blank(), s); } catch (e) { }
  return blank();
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { toast('Storage full or blocked'); } }
const t = k => (T[S.lang] && T[S.lang][k] !== undefined ? T[S.lang][k] : T.en[k]);

/* ---------- Helpers ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 0) => n == null || isNaN(n) ? '–' : new Intl.NumberFormat(S.lang === 'el' ? 'el-GR' : 'en-GB', { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(n);
const r10 = n => Math.round(n / 10) * 10;
const pad = n => String(n).padStart(2, '0');
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => dstr(new Date());
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); };
const dayLabel = s => { const d = parseD(s); return `${t('days')[d.getDay()]} ${d.getDate()} ${t('months')[d.getMonth()]}`; };
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'σ');
const num = v => { const x = parseFloat(String(v).replace(',', '.')); return isNaN(x) ? null : x; };
const icon = {
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
  fwd: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B605C" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  barcode: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7V5h3M17 5h3v2M20 17v2h-3M7 19H4v-2"/><path d="M8 9v6M11 9v6M14 9v6M16.5 9v6"/></svg>',
  down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
  info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" style="flex:none"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>',
  today: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/></svg>',
  plan: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 18h16"/><path d="M7 18V9"/><path d="M12 18V5"/><path d="M17 18v-6"/></svg>',
  weight: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 10a3 3 0 0 1 6 0"/><path d="M12 10l1.5-1.5"/></svg>',
  settings: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>'
};

/* ---------- Food data ---------- */
async function loadDB() {
  const res = await fetch('foods.json');
  DB = await res.json();
  for (const f of DB.foods) { f.k = norm((f.el || '') + ' ' + f.en); FOOD.set(f.id, f); }
  for (const [d, c] of DB.pairs) { PAIR.set(d, { dry: d, cooked: c, state: 'dry' }); PAIR.set(c, { dry: d, cooked: c, state: 'cooked' }); }
}
function getFood(src, id) {
  if (src === 'c') { const f = FOOD.get(Number(id)); return f && { src: 'c', id: f.id, name: (S.lang === 'el' && f.el) || f.en, n: f.n, tag: 'Ciqual' }; }
  if (src === 'm' || src === 'o') { const f = S.myFoods.find(x => x.id === id); return f && { src: 'm', id: f.id, name: f.name, n: f.n, tag: f.off ? 'Open Food Facts' : t('myFoods') }; }
  return null;
}
const foodKey = (src, id) => `${src === 'o' ? 'm' : src}:${id}`;
function spoonDefault(src, id) {
  if (src !== 'c') return null;
  const f = FOOD.get(Number(id)); if (!f) return null;
  for (const [re, g, grp] of SPOON) { if (grp && f.g !== grp) continue; if (re.test(f.en)) return g; }
  return null;
}
function spoonFor(src, id) { const u = S.spoon[foodKey(src, id)]; if (u) return { g: u, mine: true }; const d = spoonDefault(src, id); return d ? { g: d, mine: false } : null; }
function pieceDefault(src, id) {
  if (src !== 'c') return null;
  const f = FOOD.get(Number(id)); if (!f) return null;
  for (const [re, sizes, kind, grp] of PIECE) { if (grp && f.g !== grp) continue; if (re.test(f.en)) return { sizes, egg: kind === 'egg' }; }
  return null;
}
// What one piece weighs for a food: the user's own value, else their last size, else medium.
function pieceFor(src, id) {
  const u = S.piece[foodKey(src, id)], pd = pieceDefault(src, id);
  if (typeof u === 'number') return { size: 'mine', g: u };
  if (pd) { const sz = u && pd.sizes[u] ? u : (pd.sizes.M ? 'M' : Object.keys(pd.sizes)[0]); return { size: sz, g: pd.sizes[sz] }; }
  return { size: 'mine', g: '' };
}
const sizeName = (sz, egg) => sz === 'mine' ? t('sizeMine') : egg ? sz : t('size' + sz);
function amountLabel(e) {
  if (e.unit === 'pc') { const pd = pieceDefault(e.src, e.ref); const sz = pd && e.size && e.size !== 'mine' && Object.keys(pd.sizes).length > 1 ? ` (${sizeName(e.size, pd.egg)})` : ''; return `${fmt(e.qty, 2)} ${t('pc')(e.qty)}${sz} · ${fmt(e.grams)} g`; }
  return e.unit && e.unit !== 'g' ? `${fmt(e.qty, 2)} ${t(e.unit)} · ${fmt(e.grams)} g` : `${fmt(e.grams)} g`;
}
// Words that turn a basic food into a product or a part of it. A name with one of these ranks lower unless the search asks for it.
const DERIVED = ['nectar', 'juice', 'drink', 'tart', 'turnover', 'pie', 'cake', 'compote', 'jam', 'starch', 'flour', 'bran', 'fat', 'oil', 'sauce', 'powder', 'syrup', 'soup', 'salad', 'puree', 'crisps', 'chips', 'dessert', 'pudding', 'biscuit', 'spread', 'sweets', 'snack', 'type',
  'νεκταρ', 'χυμοσ', 'ροφημα', 'ταρτα', 'πιτα', 'κεικ', 'κομποστα', 'μαρμελαδα', 'αμυλο', 'αλευρι', 'πιτουρο', 'λιποσ', 'λαδι', 'ελαιο', 'σαλτσα', 'σκονη', 'σιροπι', 'σουπα', 'σαλατα', 'πουρεσ', 'πατατακια', 'γλυκο', 'μπισκοτο', 'επαλειμμα', 'τυπου'];
const reEsc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordAt = (txt, tok) => new RegExp('(^|[^a-z0-9α-ω])' + reEsc(tok)).test(txt);
// Plural/inflection stems: English only when the word ends in -s/-es (oats → oat, tomatoes → tomato); Greek endings vary, so try 1–2 letters off.
function stems(tok) {
  const out = [];
  if (/[α-ω]$/.test(tok)) { if (tok.length >= 4) out.push(tok.slice(0, -1)); if (tok.length >= 6) out.push(tok.slice(0, -2)); }
  else if (/es$/.test(tok) && tok.length >= 5) out.push(tok.slice(0, -2), tok.slice(0, -1));
  else if (/s$/.test(tok) && tok.length >= 4) out.push(tok.slice(0, -1));
  return out;
}
function tokMatch(k, tok) { // 0 = start of a word, 1 = middle of a word, 2 = plural/inflection stripped, -1 = no match
  if (wordAt(k, tok)) return 0;
  if (k.includes(tok)) return 1;
  return stems(tok).some(x => wordAt(k, x)) ? 2 : -1;
}
function searchFoods(q, limit = 40) {
  const toks = norm(q).split(/\s+/).filter(Boolean);
  if (!toks.length) return [];
  const phrase = toks.join(' '), t0 = toks[0], st0 = stems(t0);
  const out = [];
  for (const f of DB.foods) {
    const kinds = toks.map(x => tokMatch(f.k, x));
    if (kinds.includes(-1)) continue;
    const name = norm((S.lang === 'el' && f.el) || f.en);
    const words = name.split(/[^a-z0-9α-ω]+/).filter(Boolean), head = words[0] || '';
    // Ciqual names a basic food as one word then details: "Banana, raw". Products read "Banana nectar".
    const basic = /^[a-z'-]+(,|$| \()/i.test(f.en);
    const headHit = head.startsWith(t0) || st0.some(x => head.startsWith(x) && head.length <= t0.length + 1);
    let score = name.length * 0.6;
    if (toks.length > 1 && name.startsWith(phrase)) score -= 90; // "olive oil" → "Olive oil, extra virgin"
    else if (headHit) score -= basic ? 80 : 50;
    if (head === t0 || st0.includes(head)) score -= 15; // whole word typed: "egg" before "eggplant"
    kinds.forEach(k => { if (k === 1) score += 60; if (k === 2) score += 15; });
    for (const w of DERIVED) if (words.some(x => x === w || x.startsWith(w) && w.length >= 5) && !toks.some(x => w.startsWith(x) || x.startsWith(w))) score += 45;
    if (/prepacked|canned|frozen|from fast food|takeaway/i.test(f.en)) score += 40;
    if (/\(average\)/i.test(f.en)) score -= 25;
    if (/\braw\b/i.test(f.en)) score -= 15;
    if (S.lang === 'el' && !f.el) score += 80;
    out.push([score, f]);
  }
  return out.sort((a, b) => a[0] - b[0]).slice(0, limit).map(x => x[1]);
}

/* ---------- Targets ---------- */
function bmr(p) { return 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'male' ? 5 : -161); }
function workoutKcal(p, dow) {
  const w = (p.workouts || []).find(x => x.day === dow);
  if (!w || !ACT[w.act]) return 0;
  return (ACT[w.act].met - 1) * p.weight * (w.min / 60);
}
function calcTargets(p) {
  if (!p) return null;
  const b = bmr(p), factor = LIFE[p.life] || 1.55;
  let maintRest = b * factor;
  const extras = [0, 1, 2, 3, 4, 5, 6].map(d => workoutKcal(p, d));
  const avgExtra = extras.reduce((a, x) => a + x, 0) / 7;
  if (S.calib && S.calib.maintRest) maintRest = S.calib.maintRest;
  const g = (GOALS[p.goal] || GOALS.maintain)[p.pace || 'gentle'] || 0;
  const perDay = extras.map(x => r10((maintRest + x) * (1 + g)));
  const restT = r10(maintRest * (1 + g));
  const wDays = extras.map((x, i) => x > 0 ? i : -1).filter(i => i >= 0);
  const workT = wDays.length ? r10(wDays.reduce((a, i) => a + perDay[i], 0) / wDays.length) : restT;
  const weekly = perDay.reduce((a, x) => a + x, 0) / 7;
  return { bmr: Math.round(b), factor, maintRest: Math.round(maintRest), avgExtra, extras, goal: g, perDay, rest: restT, workout: workT, weekly: Math.round(weekly), wDays, calibrated: !!(S.calib && S.calib.maintRest) };
}
function dayInfo(ds) {
  const p = S.profile; if (!p) return { target: 2000, workout: false };
  const c = calcTargets(p), dow = parseD(ds).getDay(), L = S.log[ds] || {};
  let workout = L.type ? L.type === 'workout' : c.extras[dow] > 0;
  let target;
  if (p.custom && p.custom.rest) {
    target = workout && p.custom.workout ? p.custom.workout : p.custom.rest;
  } else if (p.mode === 'same') target = r10(c.weekly);
  else target = workout ? (c.extras[dow] > 0 ? c.perDay[dow] : c.workout) : c.rest;
  return { target, workout, bmr: c.bmr };
}

/* ---------- Backup ---------- */
const daysSince = d => Math.round((parseD(todayStr()) - parseD(d)) / 864e5);
function backupDue() {
  const b = S.backup; if (!b.since) { b.since = Object.keys(S.log).sort()[0] || todayStr(); save(); } // existing users: count from their first logged day
  if (!b.on || b.snooze === todayStr()) return null;
  const n = daysSince(b.last || b.since);
  return n >= (Number(b.days) || 7) ? (b.last ? t('ago')(daysSince(b.last)) : t('bkNever')) : null;
}
async function doBackup() {
  const name = `plain-plate-backup-${todayStr()}.json`, json = JSON.stringify(S, null, 1);
  const done = () => { S.backup.last = todayStr(); S.backup.snooze = null; save(); toast(t('bkDone')); render(); };
  try {
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); done(); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a2 = document.createElement('a'); a2.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a2.download = name; document.body.appendChild(a2); a2.click(); a2.remove(); done();
}

/* ---------- Saved meals ---------- */
const ENTRY_KEEP = ['src', 'ref', 'name', 'tag', 'n', 'grams', 'unit', 'qty', 'gpt', 'gpp', 'size', 'state', 'approx'];
const stripEntry = e => Object.fromEntries(ENTRY_KEEP.filter(k => e[k] != null).map(k => [k, e[k]]));
function copyEntry(x, meal) { // fresh copy for a new day, with the food's current values
  const f = getFood(x.src, x.ref), e = Object.assign(stripEntry(x), { meal, at: Date.now() });
  if (f) { e.name = f.name; e.tag = f.tag; e.n = f.n; }
  return e;
}
function addEntries(ds, meal, list) {
  if (!list.length) return;
  const L = S.log[ds] || (S.log[ds] = { entries: [], complete: false });
  list.forEach(x => L.entries.push(copyEntry(x, meal))); save(); toast(t('addedN')(list.length)); render();
}
const listKcal = list => list.reduce((a, x) => { const f = getFood(x.src, x.ref); const n0 = f ? f.n[0] : (x.n || [])[0]; return a + (n0 || 0) * x.grams / 100; }, 0);
function lastMeal(ds, meal) { for (let i = 1; i <= 14; i++) { const d = addDays(ds, -i), it = mealItems(d, meal); if (it.length) return { d, items: it.map(([e]) => e) }; } return null; }

/* ---------- Totals ---------- */
function entryNut(e) { return e.n.map(v => v == null ? null : v * e.grams / 100); }
function dayTotals(ds) {
  const L = S.log[ds]; const tot = [0, 0, 0, 0, 0, 0, 0, 0]; let partial = false, approx = 0;
  if (L) for (const e of L.entries) {
    const nn = entryNut(e); nn.forEach((v, i) => { if (v == null) partial = true; else tot[i] += v; });
    if (e.approx) approx++;
  }
  return { tot, partial, approx };
}

/* ---------- Calibration (data-based targets) ---------- */
function calibration() {
  const p = S.profile; if (!p) return null;
  const end = addDays(todayStr(), -1), start = addDays(end, -20);
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) { const L = S.log[d]; if (L && L.complete && L.entries.length) days.push(dayTotals(d).tot[0]); }
  const ws = S.weights.filter(w => w.date >= start && w.date <= end).sort((a, b) => a.date < b.date ? -1 : 1);
  const res = { days: days.length, weighins: ws.length, ready: days.length >= 14 && ws.length >= 4 };
  if (!res.ready) return res;
  const avg = days.reduce((a, x) => a + x, 0) / days.length;
  const xs = ws.map(w => (parseD(w.date) - parseD(start)) / 864e5), ys = ws.map(w => w.kg);
  const mx = xs.reduce((a, x) => a + x, 0) / xs.length, my = ys.reduce((a, y) => a + y, 0) / ys.length;
  let num_ = 0, den = 0; xs.forEach((x, i) => { num_ += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  const slope = den ? num_ / den : 0; // kg per day
  const maint = avg - slope * KCAL_PER_KG;
  const c = calcTargets(p);
  res.avg = avg; res.slope = slope; res.maint = maint;
  if (maint < c.bmr) { res.low = true; return res; }
  let maintRest = maint - c.avgExtra;
  const cur = c.maintRest, capped = Math.min(cur * 1.10, Math.max(cur * 0.90, maintRest));
  res.capped = Math.abs(capped - maintRest) > 1; res.maintRest = capped;
  const g = c.goal; res.rest = r10(capped * (1 + g)); res.workout = c.wDays.length ? r10((capped + c.wDays.reduce((a, i) => a + c.extras[i], 0) / c.wDays.length) * (1 + g)) : res.rest;
  res.maintRound = Math.round(maint / 50) * 50;
  return res;
}

/* ---------- Router ---------- */
function route() {
  const h = location.hash.slice(1) || '/';
  const [path, qs] = h.split('?');
  const q = Object.fromEntries(new URLSearchParams(qs || ''));
  return { path, q };
}
function go(path) { location.hash = path; }
window.addEventListener('hashchange', render);

function render() {
  document.documentElement.lang = S.lang;
  const { path, q } = route();
  const app = document.getElementById('app');
  if (!DB) { app.innerHTML = '<div class="screen"><p class="muted">…</p></div>'; return; }
  if (!S.profile && path !== '/onboarding' && path !== '/about') { startOnboarding(); return; }
  let html = '', nav = true, active = '';
  switch (path) {
    case '/onboarding': html = vOnboarding(); nav = false; break;
    case '/add': html = vAdd(q); nav = false; break;
    case '/food': html = vFood(q); nav = false; break;
    case '/myfood': html = vMyFood(q); nav = false; break;
    case '/scan': html = vScan(q); nav = false; break;
    case '/planner': html = vPlanner(q); active = 'planner'; break;
    case '/weight': html = vWeight(); active = 'weight'; break;
    case '/settings': html = vSettings(); active = 'settings'; break;
    case '/own': html = vOwn(); nav = false; break;
    case '/about': html = vAbout(); nav = false; break;
    default: html = vToday(q); active = 'today';
  }
  app.innerHTML = `<main class="screen${nav ? '' : ' nonav'}">${html}</main>${nav ? vNav(active) : ''}`;
  afterRender(path, q);
}
function vNav(active) {
  const a = (k, href, ic, label) => `<a href="#${href}" ${active === k ? 'aria-current="page"' : ''}>${icon[ic]}${esc(label)}</a>`;
  return `<nav class="nav" aria-label="Main"><div class="in">${a('today', '/', 'today', t('today'))}${a('planner', '/planner', 'plan', t('planner'))}${a('weight', '/weight', 'weight', t('weight'))}${a('settings', '/settings', 'settings', t('settings'))}</div></nav>`;
}
function backBtn(href) { return `<a class="iconbtn" href="#${href}" aria-label="${esc(t('back'))}">${icon.back}</a>`; }

/* ---------- Onboarding ---------- */
function startOnboarding(edit) {
  const p = S.profile;
  ob = { step: 0, lang: S.lang, sex: p ? p.sex : 'female', age: p ? p.age : '', height: p ? p.height : '', weight: p ? p.weight : '', life: p ? p.life : 'sit',
    days: p ? (p.workouts || []).map(w => w.day) : [], act: p && p.workouts && p.workouts[0] ? p.workouts[0].act : 'strength', min: p && p.workouts && p.workouts[0] ? p.workouts[0].min : 60,
    goal: p ? p.goal : 'maintain', pace: p ? p.pace : 'gentle', mode: p ? p.mode : 'split', edit: !!edit };
  if (location.hash !== '#/onboarding') go('/onboarding'); else render();
}
function obProfile() {
  return { sex: ob.sex, age: Number(ob.age), height: Number(ob.height), weight: Number(ob.weight), life: ob.life,
    workouts: ob.days.map(d => ({ day: d, act: ob.act, min: Number(ob.min) || 0 })), goal: ob.goal, pace: ob.pace, mode: ob.mode, custom: S.profile && S.profile.custom ? S.profile.custom : null, proteinT: S.profile ? S.profile.proteinT : null };
}
function vOnboarding() {
  if (!ob) startOnboarding();
  const steps = `<div class="steps" aria-label="${ob.step + 1}/6">${[0, 1, 2, 3, 4, 5].map(i => `<span class="${i <= ob.step ? 'on' : ''}"></span>`).join('')}</div>`;
  const head = `<div class="row between" style="min-height:44px">${ob.step > 0 ? `<button class="iconbtn" data-a="obBack" aria-label="${esc(t('back'))}">${icon.back}</button>` : '<span style="width:44px"></span>'}${steps}<span class="small muted" style="width:44px;text-align:right">${ob.step + 1} / 6</span></div>`;
  let body = '', foot = '';
  const nextBtn = (ok = true, label = t('next')) => `<button class="btn" data-a="obNext" ${ok ? '' : 'disabled'}>${esc(label)}</button>`;
  if (ob.step === 0) {
    body = `<h1>${esc(t('appName'))}</h1><p class="muted">${esc(t('obLang'))}</p>
      <div class="seg" role="group" aria-label="${esc(t('obLang'))}"><button data-a="obSet" data-k="lang" data-v="el" aria-pressed="${ob.lang === 'el'}">Ελληνικά</button><button data-a="obSet" data-k="lang" data-v="en" aria-pressed="${ob.lang === 'en'}">English</button></div>`;
    foot = nextBtn();
  } else if (ob.step === 1) {
    const ok = num(ob.age) >= 15 && num(ob.age) <= 100 && num(ob.height) >= 120 && num(ob.height) <= 230 && num(ob.weight) >= 30 && num(ob.weight) <= 300;
    body = `<h1>${esc(t('obAbout'))}</h1><p class="muted">${esc(t('obAboutSub'))}</p>
      <div class="field"><span class="lbl">${esc(t('sex'))}</span><div class="seg"><button data-a="obSet" data-k="sex" data-v="female" aria-pressed="${ob.sex === 'female'}">${esc(t('female'))}</button><button data-a="obSet" data-k="sex" data-v="male" aria-pressed="${ob.sex === 'male'}">${esc(t('male'))}</button></div></div>
      <div class="field"><label for="ob-age">${esc(t('age'))}</label><input id="ob-age" class="input mono" inputmode="numeric" data-in="ob" data-k="age" value="${esc(ob.age)}"></div>
      <div class="field"><label for="ob-h">${esc(t('height'))}</label><input id="ob-h" class="input mono" inputmode="numeric" data-in="ob" data-k="height" value="${esc(ob.height)}"></div>
      <div class="field"><label for="ob-w">${esc(t('weightKg'))}</label><input id="ob-w" class="input mono" inputmode="decimal" data-in="ob" data-k="weight" value="${esc(ob.weight)}"></div>`;
    foot = nextBtn(ok);
  } else if (ob.step === 2) {
    const opt = (k, l, ex) => `<button class="card" style="text-align:left;cursor:pointer;${ob.life === k ? 'border:2px solid var(--accent);padding:13px 15px' : ''}" data-a="obSet" data-k="life" data-v="${k}" aria-pressed="${ob.life === k}"><div style="font-weight:600">${esc(t(l))}</div><div class="small muted">${esc(t(ex))}</div></button>`;
    body = `<h1>${esc(t('obLife'))}</h1><p class="muted">${esc(t('obLifeSub'))}</p><div class="col" style="gap:10px">${opt('sit', 'lifeSit', 'lifeSitEx')}${opt('feet', 'lifeFeet', 'lifeFeetEx')}${opt('heavy', 'lifeHeavy', 'lifeHeavyEx')}</div>`;
    foot = nextBtn();
  } else if (ob.step === 3) {
    const order = [1, 2, 3, 4, 5, 6, 0];
    body = `<h1>${esc(t('obWork'))}</h1><p class="muted">${esc(t('obWorkSub'))}</p>
      <div class="daypick" role="group">${order.map(d => `<button data-a="obDay" data-v="${d}" aria-pressed="${ob.days.includes(d)}">${esc(t('days')[d])}</button>`).join('')}</div>
      ${ob.days.length ? `<div class="field"><label for="ob-act">${esc(t('activity'))}</label><select id="ob-act" class="input" data-in="ob" data-k="act">${ACTS.map(([k]) => `<option value="${k}" ${ob.act === k ? 'selected' : ''}>${esc(t('acts')[k])}</option>`).join('')}</select></div>
      <div class="field"><label for="ob-min">${esc(t('minutes'))}</label><input id="ob-min" class="input mono" inputmode="numeric" data-in="ob" data-k="min" value="${esc(ob.min)}"></div>
      <p class="xs muted">${esc(t('sameEach'))} · 2024 Compendium ${esc(ACT[ob.act].code)} · ${fmt(ACT[ob.act].met, 1)} MET</p>` : `<p class="small muted">${esc(t('noWorkouts'))}</p>`}`;
    foot = nextBtn();
  } else if (ob.step === 4) {
    const gp = GOALS[ob.goal];
    body = `<h1>${esc(t('obGoal'))}</h1>
      <div class="seg"><button data-a="obSet" data-k="goal" data-v="lose" aria-pressed="${ob.goal === 'lose'}">${esc(t('lose'))}</button><button data-a="obSet" data-k="goal" data-v="maintain" aria-pressed="${ob.goal === 'maintain'}">${esc(t('maintain'))}</button><button data-a="obSet" data-k="goal" data-v="gain" aria-pressed="${ob.goal === 'gain'}">${esc(t('gain'))}</button></div>
      ${ob.goal !== 'maintain' ? `<div class="field"><span class="lbl">${esc(t('pace'))}</span><div class="seg"><button data-a="obSet" data-k="pace" data-v="gentle" aria-pressed="${ob.pace === 'gentle'}">${esc(t('gentle'))}</button><button data-a="obSet" data-k="pace" data-v="standard" aria-pressed="${ob.pace === 'standard'}">${esc(t('standard'))}</button></div>
      <p class="xs muted">${esc(t('paceInfo')((gp.gentle > 0 ? '+' : '') + Math.round(gp.gentle * 100) + '%', (gp.standard > 0 ? '+' : '') + Math.round(gp.standard * 100) + '%'))}</p></div>` : ''}`;
    foot = nextBtn();
  } else {
    const p = obProfile(); const saveCalib = S.calib; S.calib = null; const c = calcTargets(p); S.calib = saveCalib;
    const split = ob.mode !== 'same';
    const nW = p.workouts.length;
    const low = Math.min(c.rest, c.workout) < c.bmr;
    body = `<h1>${esc(t('obTargets'))}</h1><p class="muted">${esc(t('obTargetsSub'))}</p>
      <div class="seg"><button data-a="obSet" data-k="mode" data-v="split" aria-pressed="${split}">${esc(t('sSplit'))}</button><button data-a="obSet" data-k="mode" data-v="same" aria-pressed="${!split}">${esc(t('sSame'))}</button></div>
      ${split && nW ? `<div class="grid2"><div class="card col" style="gap:4px"><span class="small muted">${esc(t('restDay'))}</span><span class="big">${fmt(c.rest)}</span><span class="small muted">${esc(t('daysWeek')(7 - nW))}</span></div>
        <div class="card strong col" style="gap:4px"><span class="small" style="color:var(--accent);font-weight:600">${esc(t('workoutDay'))}</span><span class="big">${fmt(c.workout)}</span><span class="small muted">${esc(t('daysWeek')(nW))}</span></div></div>
        <div class="row between" style="padding:0 4px"><span class="small muted">${esc(t('weeklyAvg'))}</span><span class="mono">${fmt(c.weekly)} kcal</span></div>`
        : `<div class="card strong col" style="gap:4px"><span class="small" style="color:var(--accent);font-weight:600">${esc(t('everyDay'))}</span><span class="big">${fmt(r10(c.weekly))}</span><span class="small muted">${esc(t('avgRounded'))}</span></div>`}
      ${howGot(p, c)}
      ${low ? `<div class="note plain">${icon.info}<span>${esc(t('lowNote')(fmt(c.bmr)))}</span></div>` : ''}
      <p class="small muted">${esc(t('estimates'))}</p>`;
    foot = `${nextBtn(true, t('useThese'))}<a class="btn secondary" href="#/own" data-a="obOwn">${esc(t('sOwn'))}</a>`;
  }
  return `${head}<div class="col" style="gap:16px">${body}</div><div class="col" style="margin-top:auto;gap:10px">${foot}</div>`;
}
function howGot(p, c) {
  const row = (a, b, v) => `<div class="kv"><div class="col" style="gap:2px"><span>${esc(a)}</span><span class="xs muted">${esc(b)}</span></div><span class="mono">${v}</span></div>`;
  const lifeL = { sit: 'lifeSit', feet: 'lifeFeet', heavy: 'lifeHeavy' }[p.life];
  const w = (p.workouts || [])[0];
  const gk = p.goal === 'maintain' ? t('maintain') : `${t(p.goal)} · ${t(p.pace)}`;
  return `<details class="card" open><summary style="font-weight:600;min-height:32px;cursor:pointer">${esc(t('howGot'))}</summary>
    ${row(t('resting'), t('restingSub'), fmt(c.bmr))}
    ${row(t('daily'), `${t(lifeL)} · × ${fmt(c.factor, 2)} · FAO/WHO/UNU`, fmt(c.bmr * c.factor))}
    ${w ? row(`${t('acts')[w.act]}, ${w.min} min`, `2024 Compendium ${ACT[w.act].code} · ${t('workoutDay')}`, '+' + fmt(workoutKcal(p, w.day))) : ''}
    ${c.calibrated ? row(t('calibrated'), '', fmt(c.maintRest)) : ''}
    ${row(t('goal'), gk, (c.goal > 0 ? '+' : c.goal < 0 ? '−' : '±') + Math.abs(Math.round(c.goal * 100)) + '%')}
  </details>`;
}

/* ---------- Today ---------- */
function vToday(q) {
  const ds = q.d || todayStr(); const isToday = ds === todayStr();
  const info = dayInfo(ds); const { tot, partial, approx } = dayTotals(ds); const L = S.log[ds] || { entries: [] };
  const eaten = tot[0], left = info.target - eaten;
  const C = 2 * Math.PI * 88, frac = Math.min(1, eaten / info.target);
  const kcalE = eaten || 0;
  const pct = k => kcalE > 0 ? tot[k] * (k === 3 ? 9 : 4) / kcalE * 100 : 0;
  const wkg = S.profile.weight;
  const protRef = Math.round(0.83 * wkg);
  const scale = (val, max, band, tick) => {
    const P = v => Math.max(0, Math.min(100, v / max * 100)) + '%';
    return `<div class="scale" aria-hidden="true"><div class="track"></div>${band ? `<div class="band" style="left:${P(band[0])};width:calc(${P(band[1])} - ${P(band[0])})"></div>` : ''}${tick != null ? `<div class="tick" style="left:${P(tick)}"></div>` : ''}<div class="dot" style="left:${P(val)}"></div></div>`;
  };
  const macro = (name, value, sc, ref) => `<div class="macro"><div class="row between" style="align-items:baseline"><span style="font-weight:600;font-size:14px">${esc(name)}</span><span class="mono" style="font-size:14px">${value}</span></div>${sc}<span class="xs muted">${esc(ref)}</span></div>`;
  const pT = S.profile.proteinT;
  const macros = [
    macro(t('protein'), `${fmt(tot[1])} g${pT ? ` / ${fmt(pT)}` : ''}`, scale(tot[1], Math.max(120, (pT || 0) * 1.3, protRef * 2), null, pT || protRef), t('refProtein')(protRef, fmt(wkg, 1))),
    macro(t('carbs'), `${fmt(tot[2])} g · ${fmt(pct(2))}%`, scale(pct(2), 80, [45, 60]), t('refCarbs')),
    macro(t('fat'), `${fmt(tot[3])} g · ${fmt(pct(3))}%`, scale(pct(3), 50, [20, 35], 30), t('refFat')),
    macro(t('fibre'), `${fmt(tot[5])} g`, scale(tot[5], 40, null, 25), t('refFibre'))
  ];
  const more = ui.moreOpen ? [
    macro(t('sugars'), `${fmt(tot[4])} g`, '', t('refSugars')),
    macro(t('satfat'), `${fmt(tot[6])} g · ${fmt(kcalE ? tot[6] * 9 / kcalE * 100 : 0)}%`, scale(kcalE ? tot[6] * 9 / kcalE * 100 : 0, 25, null, 10), t('refSat')),
    macro(t('salt'), `${fmt(tot[7], 1)} g`, scale(tot[7], 10, null, 5), t('refSalt'))
  ] : [];
  const cell = (k, i) => `<div class="col" style="gap:2px;min-width:0"><span class="xs muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t(k))}</span><span class="mono" style="font-size:14px">${fmt(tot[i])} g</span></div>`;
  const leftLine = `<span class="mono" style="font-weight:500">${fmt(Math.abs(left))}</span> ${esc(left >= 0 ? t('kcalLeft') : t('kcalOver'))}`;
  const summary = S.sumOpen
    ? `<div class="row" style="justify-content:flex-end;margin:-10px 0 -14px"><button class="btn ghost" data-a="toggleSum" aria-expanded="true" style="width:auto;height:40px;padding:0 4px;font-size:14px">${esc(t('hideDetails'))}${icon.up}</button></div>
    <div class="col" style="align-items:center;gap:8px">
      <div class="ring"><svg width="236" height="236" viewBox="0 0 236 236" role="img" aria-label="${fmt(eaten)} ${esc(t('of'))} ${fmt(info.target)} kcal">
        <circle cx="118" cy="118" r="114" fill="#FFFFFF" stroke="#E2E4DF"/><circle cx="118" cy="118" r="100" fill="none" stroke="#ECEEEA"/>
        <circle cx="118" cy="118" r="88" fill="none" stroke="#E6E8E3" stroke-width="12"/>
        <circle cx="118" cy="118" r="88" fill="none" stroke="#2B4C9B" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 118 118)" ${frac === 0 ? 'stroke-opacity="0"' : ''}/></svg>
        <div class="center"><span class="huge" style="font-size:40px">${fmt(eaten)}</span><span class="small muted">${esc(t('of'))} ${fmt(info.target)} kcal</span></div></div>
      <span style="font-size:15px">${leftLine}</span>
    </div>
    <div class="card" style="padding:4px 16px 6px">${macros.join('')}${more.join('')}
      <button class="btn ghost" data-a="toggleMore" style="justify-content:space-between;padding:0">${esc(ui.moreOpen ? t('less') : t('more'))}${ui.moreOpen ? '' : icon.fwd}</button></div>`
    : `<button class="card sum" data-a="toggleSum" aria-expanded="false">
      <div class="row between" style="align-items:baseline;gap:8px"><span><span class="mono" style="font-size:26px;font-weight:500;letter-spacing:-.02em">${fmt(eaten)}</span> <span class="small muted">/ ${fmt(info.target)} kcal</span></span><span class="small" style="text-align:right">${leftLine}</span></div>
      <div class="bar" aria-hidden="true"><div style="width:${(frac * 100).toFixed(1)}%"></div></div>
      <div class="grid3">${cell('protein', 1)}${cell('carbs', 2)}${cell('fat', 3)}</div>
      <span class="row xs" style="color:var(--accent);gap:2px;font-weight:600;justify-content:center">${esc(t('showDetails'))}${icon.down}</span></button>`;
  const meals = MEALS.map(m => {
    const items = L.entries.map((e, i) => [e, i]).filter(([e]) => e.meal === m);
    const sum = items.reduce((a, [e]) => a + (entryNut(e)[0] || 0), 0);
    return `<section class="col" style="gap:6px"><div class="row between" style="padding:0 4px"><h2>${esc(t(m))}</h2><span class="mono small muted">${items.length ? fmt(sum) : '—'}</span></div>
      <div class="card tight list">${items.map(([e, i]) => `<a class="item" href="#/food?d=${ds}&edit=${i}"><div class="grow"><div class="name">${esc((getFood(e.src, e.ref) || e).name)}</div><div class="tags"><span class="mono xs muted">${esc(amountLabel(e))}${e.state ? ' · ' + esc(t(e.state === 'dry' ? 'dry' : 'cooked')).split(',')[0].toLowerCase() : ''}</span><span class="tag">${esc(e.tag)}</span>${e.approx ? `<span class="tag approx">${esc(t('approx'))}</span>` : ''}</div></div><span class="mono">${fmt(entryNut(e)[0])}</span></a>`).join('')}
        <a class="item" href="#/add?meal=${m}&d=${ds}" style="min-height:48px;color:var(--accent)">${icon.plus}<span>${esc(t('add'))}</span></a></div></section>`;
  }).join('');
  return `<div class="row between" style="min-height:44px"><div class="row" style="gap:2px"><a class="iconbtn" href="#/?d=${addDays(ds, -1)}" aria-label="−1">${icon.back}</a><h1 style="font-size:22px">${esc(isToday ? t('today') : dayLabel(ds))}</h1>${!isToday ? `<a class="iconbtn" href="#/?d=${addDays(ds, 1)}" aria-label="+1">${icon.fwd}</a>` : ''}</div>
      <button class="chip" data-a="toggleType" data-d="${ds}" style="background:var(--accent-soft);color:var(--accent);border-color:transparent;font-weight:500">${esc(info.workout ? t('workoutDay') : t('restDay'))}</button></div>
    ${isToday && backupDue() ? `<div class="note info col" style="gap:10px;align-items:stretch"><div class="row" style="gap:10px;align-items:flex-start">${icon.info}<span>${esc(t('bkDue')(backupDue()))}</span></div><div class="grid2"><button class="btn" data-a="backup" style="height:44px;font-size:15px">${esc(t('bkNow'))}</button><button class="btn secondary" data-a="bkLater" style="height:44px;font-size:15px">${esc(t('bkLater'))}</button></div></div>` : ''}
    ${summary}
    ${approx ? `<div class="note approx">${icon.info}<span>${esc(t('approxToday')(approx))}</span></div>` : ''}
    ${partial ? `<div class="note plain">${icon.info}<span>${esc(t('partialDay'))}</span></div>` : ''}
    ${meals}
    <div class="card"><label class="check"><input type="checkbox" data-a="complete" data-d="${ds}" ${L.complete ? 'checked' : ''}>${esc(t('dayComplete'))}</label><p class="xs muted">${esc(t('dayCompleteHint'))}</p></div>`;
}

/* ---------- Add (meal builder) ---------- */
// The add screen is the meal builder: every food added lands back here, listed under the meal, until the user taps Done.
function mealItems(ds, meal) { return ((S.log[ds] || { entries: [] }).entries).map((e, i) => [e, i]).filter(([e]) => e.meal === meal); }
function vAdd(q) {
  const meal = q.meal || defaultMeal(), ds = q.d || todayStr();
  const qs = ui.query;
  const recents = S.recent.slice(0, 8).map(r => getFood(r.src, r.id)).filter(Boolean);
  const mine = S.myFoods.filter(f => !qs || norm(f.name).includes(norm(qs)));
  const res = qs ? searchFoods(qs) : [];
  const items = mealItems(ds, meal), sum = items.reduce((a, [e]) => a + (entryNut(e)[0] || 0), 0);
  const href = f => `#/food?src=${f.src}&id=${encodeURIComponent(f.id)}&meal=${meal}&d=${ds}`;
  const rowC = f => { const p = PAIR.get(f.id); const name = (S.lang === 'el' && f.el) || f.en; return `<a class="item" href="#/food?src=c&id=${f.id}&meal=${meal}&d=${ds}"><div class="grow"><div class="name">${esc(name)}</div><div class="tags"><span class="tag">Ciqual</span>${p ? `<span class="xs" style="color:var(--accent)">${esc(t('weighDryOrCooked'))}</span>` : ''}</div></div><span class="mono xs muted" style="text-align:right">${fmt(f.n[0])}<br>${esc(t('per100'))}</span></a>`; };
  const rowG = f => `<a class="item" href="${href(f)}"><div class="grow"><div class="name">${esc(f.name)}</div><div class="tags"><span class="tag">${esc(f.tag)}</span></div></div><span class="mono xs muted" style="text-align:right">${fmt(f.n[0])}<br>${esc(t('per100'))}</span></a>`;
  const prev = items.length ? null : lastMeal(ds, meal);
  const repeat = prev ? `<button class="card row" data-a="repeatLast" data-v="${prev.d}" style="width:100%;text-align:left;cursor:pointer;gap:12px;border-color:var(--accent)"><span style="color:var(--accent)">${icon.plus}</span><span class="grow"><span style="font-weight:600;display:block">${esc(t('sameAsLast')(t(meal).toLowerCase()))}</span><span class="xs muted">${esc(dayLabel(prev.d))} · ${esc(t('items')(prev.items.length))} · <span class="mono">${fmt(listKcal(prev.items))}</span> kcal</span></span></button>` : '';
  const mealRow = m => `<button class="item" data-a="mealUse" data-v="${esc(m.id)}"><span style="color:var(--accent)">${icon.plus}</span><div class="grow"><div class="name">${esc(m.name)}</div><div class="tags"><span class="xs muted">${esc(t('items')(m.items.length))} · <span class="mono">${fmt(listKcal(m.items))}</span> kcal</span></div></div></button>`;
  const savedMeals = S.meals.filter(m => !qs || norm(m.name).includes(norm(qs)));
  const mealsHtml = savedMeals.length ? `<div class="col" style="gap:6px"><span class="sectionlbl">${esc(t('myMeals'))}</span><div class="card tight list">${savedMeals.map(mealRow).join('')}</div></div>` : '';
  const saveBox = !items.length ? '' : ui.saveMeal != null
    ? `<div class="card col" style="gap:10px"><label class="field"><span class="lbl">${esc(t('name'))}</span><input id="mealname" class="input" data-in="mealName" value="${esc(ui.saveMeal)}"></label><div class="grid2"><button class="btn" data-a="mealSave" style="height:44px;font-size:15px">${esc(t('save'))}</button><button class="btn secondary" data-a="mealSaveCancel" style="height:44px;font-size:15px">${esc(t('cancel'))}</button></div></div>`
    : `<button class="btn ghost" data-a="mealSaveOpen" style="height:40px;justify-content:flex-start;padding:0 4px">${icon.plus}${esc(t('saveMeal'))}</button>`;
  const mealList = repeat + (items.length
    ? `<div class="col" style="gap:6px"><div class="row between" style="padding:0 4px"><span class="sectionlbl" style="padding:0">${esc(t('inMeal'))}</span><span class="mono small muted">${fmt(sum)} kcal</span></div>
      <div class="card tight list">${items.map(([e, i]) => `<a class="item" href="#/food?d=${ds}&edit=${i}&from=add"><div class="grow"><div class="name">${esc((getFood(e.src, e.ref) || e).name)}</div><div class="tags"><span class="mono xs muted">${esc(amountLabel(e))}</span>${e.approx ? `<span class="tag approx">${esc(t('approx'))}</span>` : ''}</div></div><span class="mono">${fmt(entryNut(e)[0])}</span></a>`).join('')}</div>${saveBox}</div>`
    : `<p class="small muted" style="padding:0 4px">${esc(t('mealHint'))}</p>`);
  return `<div class="head">${backBtn('/?d=' + ds)}<div class="col" style="gap:0"><h1 style="font-size:22px">${esc(t(meal))}</h1>${ds !== todayStr() ? `<span class="xs muted">${esc(dayLabel(ds))}</span>` : ''}</div></div>
    <div class="row"><label class="search grow">${icon.search}<span class="sr">${esc(t('searchPh'))}</span><input type="search" id="q" placeholder="${esc(t('searchPh'))}" value="${esc(qs)}" data-in="query" autocomplete="off"></label>
      <a class="iconbtn" href="#/scan?meal=${meal}&d=${ds}" aria-label="${esc(t('scan'))}" style="border:1px solid var(--chip);background:var(--card);width:48px;height:48px">${icon.barcode}</a></div>
    <div id="results" class="col" style="gap:16px">${addResults(qs, recents, mine, res, rowC, rowG, mealList, mealsHtml)}</div>
    <div class="col card" style="border-style:dashed;gap:10px"><h2>${esc(t('cantFind'))}</h2>
      <p class="small muted">${esc(t('closest'))}: ${esc(t('closestHint'))}</p>
      <a class="btn secondary" href="#/myfood?meal=${meal}&d=${ds}">${esc(t('createMy'))} · <span class="small muted">${esc(t('createMyHint'))}</span></a></div>
    <div class="donebar"><a class="btn" href="#/?d=${ds}">${esc(t('done'))}${items.length ? ` <span style="font-weight:500;opacity:.85">· ${esc(t('items')(items.length))} · <span class="mono">${fmt(sum)}</span> kcal</span>` : ''}</a></div>`;
}
function addResults(qs, recents, mine, res, rowC, rowG, mealList, mealsHtml) {
  let h = '';
  if (!qs) h += mealList;
  h += mealsHtml;
  if (!qs && recents.length) h += `<div class="col" style="gap:6px"><span class="sectionlbl">${esc(t('recent'))}</span><div class="card tight list">${recents.map(rowG).join('')}</div></div>`;
  if (mine.length) h += `<div class="col" style="gap:6px"><span class="sectionlbl">${esc(t('myFoods'))}</span><div class="card tight list">${mine.slice(0, 20).map(f => rowG(getFood('m', f.id))).join('')}</div></div>`;
  if (qs) h += `<div class="col" style="gap:6px"><span class="sectionlbl">${esc(t('foods'))}</span>${res.length ? `<div class="card tight list">${res.map(rowC).join('')}</div>` : `<p class="small muted" style="padding:0 4px">${esc(t('noResults'))}</p>`}</div>`;
  return h;
}
function defaultMeal() { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack'; }

/* ---------- Food (log / edit) ---------- */
let fd = null; // draft
const qtyLabel = v => v === 0.5 ? '½' : fmt(v, 2);
function fdGrams() { // grams the draft stands for, whichever unit is in use
  if (fd.unit === 'g') return Math.max(0, num(fd.grams) || 0);
  if (fd.unit === 'pc') return Math.max(0, (num(fd.qty) || 0) * (num(fd.gpp) || 0));
  const gpt = num(fd.gpt); if (!gpt || gpt <= 0) return 0;
  return Math.max(0, (num(fd.qty) || 0) * gpt / SPOON_DIV[fd.unit]);
}
function vFood(q) {
  const ds = q.d || todayStr();
  if (!fd || fd.key !== location.hash) {
    if (q.edit != null) {
      const e = (S.log[ds] || { entries: [] }).entries[Number(q.edit)];
      if (!e) { go('/?d=' + ds); return ''; }
      const sp = spoonFor(e.src, e.ref), pc = pieceFor(e.src, e.ref);
      fd = { key: location.hash, src: e.src, id: e.ref, grams: e.grams, meal: e.meal, approx: !!e.approx, edit: Number(q.edit), from: q.from || '',
        unit: e.unit || 'g', qty: e.qty != null ? e.qty : 1, gpt: e.gpt || (sp ? sp.g : ''), gptOpen: false,
        size: e.unit === 'pc' ? e.size : pc.size, gpp: e.unit === 'pc' ? e.gpp : pc.g };
    } else {
      const last = S.recent.find(r => r.src === q.src && String(r.id) === String(q.id));
      const id = q.src === 'c' ? Number(q.id) : q.id, sp = spoonFor(q.src, id), pc = pieceFor(q.src, id);
      // Countable foods (eggs, fruit) open in pieces the first time; after that the last unit used comes back.
      const unit = last && last.unit ? last.unit : pieceDefault(q.src, id) ? 'pc' : 'g';
      fd = { key: location.hash, src: q.src, id, grams: last ? last.grams : 100, meal: q.meal || defaultMeal(), approx: false, edit: null, from: 'add',
        unit, qty: last && last.qty != null ? last.qty : 1, gpt: sp ? sp.g : '', gptOpen: false, size: pc.size, gpp: pc.g };
    }
  }
  const f = getFood(fd.src, fd.id); if (!f) return `<div class="head">${backBtn('/')}</div><p>${esc(t('noResults'))}</p>`;
  const pair = fd.src === 'c' ? PAIR.get(f.id) : null;
  const g = fdGrams();
  const nn = f.n.map(v => v == null ? null : v * g / 100);
  let equiv = '';
  if (pair) {
    const other = getFood('c', pair.state === 'dry' ? pair.cooked : pair.dry);
    if (other && other.n[0]) equiv = pair.state === 'dry' ? t('onceCooked')(fmt(g * f.n[0] / other.n[0])) : t('beforeCooking')(fmt(g * f.n[0] / other.n[0]));
  }
  const spoon = fd.unit === 'tsp' || fd.unit === 'tbsp', div = SPOON_DIV[fd.unit] || 1, gpt = num(fd.gpt);
  const stepBtn = (a, v, lbl, ic) => `<button class="iconbtn" data-a="${a}" data-v="${v}" aria-label="${lbl}" style="border:1px solid var(--chip);border-radius:26px;width:52px;height:52px">${ic}</button>`;
  const pd = pieceDefault(fd.src, fd.id), gpp = num(fd.gpp);
  const sizeChips = pd && (Object.keys(pd.sizes).length > 1 || fd.size === 'mine') ? `<div class="chips" role="group">${[...SIZES.filter(z => pd.sizes[z]), ...(typeof S.piece[foodKey(fd.src, fd.id)] === 'number' || fd.size === 'mine' ? ['mine'] : [])].map(z => `<button class="chip" data-a="sizeSet" data-v="${z}" aria-pressed="${fd.size === z}">${esc(sizeName(z, pd.egg))}${z !== 'mine' ? ` <span class="mono xs">${fmt(pd.sizes[z])} g</span>` : ''}</button>`).join('')}</div>` : '';
  const amount = fd.unit === 'pc'
    ? `<div class="row between">${stepBtn('qStep', -1, '−1', icon.minus)}
        <label class="row" style="justify-content:center;gap:6px;align-items:baseline"><span class="sr">${esc(t('segPc'))}</span><input id="qty" class="huge" inputmode="decimal" data-in="qty" value="${esc(fd.qty)}" style="width:110px;border:0;background:transparent;text-align:right;padding:0;outline:0"><span id="pcu" style="font-size:20px;color:var(--ink2);font-weight:500">${esc(t('pc')(fd.qty))}</span></label>
        ${stepBtn('qStep', 1, '+1', icon.plus)}</div>
      <div class="grid4">${[1, 2, 3, 4].map(p => `<button class="chip" data-a="qSet" data-v="${p}" aria-pressed="${num(fd.qty) === p}" style="border-radius:10px;height:40px"><span class="mono">${p}</span> ${esc(t('pc')(p))}</button>`).join('')}</div>
      ${sizeChips}
      <span class="small muted" style="text-align:center" id="gEq">${gpp ? esc(t('gApprox')(fmt(g, 1))) : ''}</span>
      ${!gpp || fd.gptOpen
        ? `<label class="field"><span class="lbl">${esc(t('pieceAsk'))}</span><input id="gpp" class="input mono" inputmode="decimal" data-in="gpp" value="${gpp ? esc(gpp) : ''}" placeholder="g"><span class="xs muted">${esc(t('pieceHint'))}</span></label>`
        : `<div class="row between" style="border-top:1px solid var(--line2);padding-top:10px"><span class="small"><span class="mono">1 ${esc(t('pc')(1))} = ${fmt(gpp, 1)} g</span> <span class="muted">· ${esc(fd.size === 'mine' || !pd ? t('spoonMine') : pd.egg ? `${fd.size}, ${t('eggNote')}` : t('pieceTypical')(t('size' + fd.size)))}</span></span><button class="btn ghost" data-a="gptEdit" style="width:auto;height:36px;padding:0 4px;font-size:14px">${esc(t('change'))}</button></div>`}`
    : spoon
    ? `<div class="row between">${stepBtn('qStep', -0.5, '−½', icon.minus)}
        <label class="row" style="justify-content:center;gap:6px;align-items:baseline"><span class="sr">${esc(t(fd.unit + 'Long'))}</span><input id="qty" class="huge" inputmode="decimal" data-in="qty" value="${esc(fd.qty)}" style="width:110px;border:0;background:transparent;text-align:right;padding:0;outline:0"><span style="font-size:20px;color:var(--ink2);font-weight:500">${esc(t(fd.unit))}</span></label>
        ${stepBtn('qStep', 0.5, '+½', icon.plus)}</div>
      <div class="grid4">${[0.5, 1, 2, 3].map(p => `<button class="chip" data-a="qSet" data-v="${p}" aria-pressed="${num(fd.qty) === p}" style="border-radius:10px;height:40px"><span class="mono">${qtyLabel(p)}</span> ${esc(t(fd.unit))}</button>`).join('')}</div>
      <span class="small muted" style="text-align:center" id="gEq">${gpt ? esc(t('gApprox')(fmt(g, 1))) : ''}</span>
      ${!gpt || fd.gptOpen
        ? `<label class="field"><span class="lbl">${esc(t('spoonAsk')(t(fd.unit + 'Long')))}</span><input id="gpt" class="input mono" inputmode="decimal" data-in="gpt" value="${gpt ? esc(Math.round(gpt / div * 10) / 10) : ''}" placeholder="g"><span class="xs muted">${esc(t('spoonHint'))}</span></label>`
        : `<div class="row between" style="border-top:1px solid var(--line2);padding-top:10px"><span class="small"><span class="mono">${esc(t('spoonIs')(t(fd.unit), fmt(gpt / div, 1)))}</span> <span class="muted">· ${esc(gpt === spoonDefault(fd.src, fd.id) ? t('spoonTypical') : t('spoonMine'))}</span></span><button class="btn ghost" data-a="gptEdit" style="width:auto;height:36px;padding:0 4px;font-size:14px">${esc(t('change'))}</button></div>`}`
    : `<div class="row between">${stepBtn('gStep', -10, '−10 g', icon.minus)}
        <label class="row" style="justify-content:center;gap:4px;align-items:baseline"><span class="sr">${esc(t('grams'))}</span><input id="grams" class="huge" inputmode="decimal" data-in="grams" value="${esc(fd.grams)}" style="width:150px;border:0;background:transparent;text-align:right;padding:0;outline:0"><span class="mono" style="font-size:22px;color:var(--ink2)">g</span></label>
        ${stepBtn('gStep', 10, '+10 g', icon.plus)}</div>
      <div class="grid4">${[50, 100, 150, 200].map(p => `<button class="chip mono" data-a="gSet" data-v="${p}" aria-pressed="${g === p}" style="border-radius:10px;height:40px">${p} g</button>`).join('')}</div>`;
  const m = (k, i, d = 1) => `<div class="card col" style="gap:4px;padding:10px"><span class="xs muted">${esc(t(k))}</span><span class="mono" style="font-size:15px">${nn[i] == null ? '–' : fmt(nn[i], d)} g</span></div>`;
  const back = fd.edit != null && fd.from !== 'add' ? '/?d=' + ds : `/add?meal=${fd.meal}&d=${ds}`;
  return `<div class="head">${backBtn(back)}<div class="col" style="gap:2px"><h1 style="font-size:20px;line-height:1.25">${esc(f.name)}</h1><span class="xs muted">${esc(t('per100src'))} · ${esc(f.tag)}${fd.src === 'c' ? ' 2025 · #' + f.id : ''}</span></div></div>
    ${pair ? `<div class="field"><span class="lbl">${esc(t('iWeighed'))}</span><div class="seg"><button data-a="pairSwitch" data-v="dry" aria-pressed="${pair.state === 'dry'}">${esc(t('dry'))}</button><button data-a="pairSwitch" data-v="cooked" aria-pressed="${pair.state === 'cooked'}">${esc(t('cooked'))}</button></div></div>` : ''}
    <div class="seg" role="group" aria-label="${esc(t('measureIn'))}">${['g', 'pc', 'tsp', 'tbsp'].map(u => `<button data-a="unitSet" data-v="${u}" aria-pressed="${fd.unit === u}">${esc(t({ g: 'segG', pc: 'segPc', tsp: 'segTsp', tbsp: 'segTbsp' }[u]))}</button>`).join('')}</div>
    <div class="card col" style="gap:14px;padding:16px">
      ${amount}
      ${equiv ? `<span class="small muted" style="text-align:center" id="equiv">${esc(equiv)}</span>` : ''}
    </div>
    <div class="row between" style="padding:0 4px;align-items:baseline"><span style="font-weight:600">${esc(t('thisPortion'))}</span><span><span class="mono" style="font-size:28px;font-weight:500" id="kcal">${nn[0] == null ? '–' : fmt(nn[0])}</span> <span class="small muted">kcal</span></span></div>
    <div class="grid4" id="macros">${m('protein', 1)}${m('carbs', 2)}${m('fat', 3)}${m('fibre', 5)}</div>
    <div class="field"><span class="lbl">${esc(t('meal'))}</span><div class="chips">${MEALS.map(x => `<button class="chip" data-a="mealSet" data-v="${x}" aria-pressed="${fd.meal === x}">${esc(t(x))}</button>`).join('')}</div></div>
    <label class="check"><input type="checkbox" data-a="approxSet" ${fd.approx ? 'checked' : ''}>${esc(t('markApprox'))}</label>
    <div class="col" style="margin-top:auto;gap:10px"><button class="btn" data-a="logSave" data-d="${ds}" ${g > 0 ? '' : 'disabled'}>${esc(fd.edit != null ? t('update') : t('addToMeal')(t(fd.meal).toLowerCase()))}</button>
      ${fd.edit != null ? `<button class="btn danger" data-a="logDel" data-d="${ds}">${esc(t('remove'))}</button>` : ''}</div>`;
}
function updateFoodLive() {
  const f = getFood(fd.src, fd.id); const g = fdGrams();
  const nn = f.n.map(v => v == null ? null : v * g / 100);
  const k = document.getElementById('kcal'); if (k) k.textContent = nn[0] == null ? '–' : fmt(nn[0]);
  const ms = document.querySelectorAll('#macros .mono'); [1, 2, 3, 5].forEach((i, j) => { if (ms[j]) ms[j].textContent = (nn[i] == null ? '–' : fmt(nn[i], 1)) + ' g'; });
  const pair = fd.src === 'c' ? PAIR.get(f.id) : null; const eq = document.getElementById('equiv');
  if (pair && eq) { const o = getFood('c', pair.state === 'dry' ? pair.cooked : pair.dry); eq.textContent = pair.state === 'dry' ? t('onceCooked')(fmt(g * f.n[0] / o.n[0])) : t('beforeCooking')(fmt(g * f.n[0] / o.n[0])); }
  const ge = document.getElementById('gEq'); if (ge) ge.textContent = (fd.unit === 'pc' ? num(fd.gpp) : num(fd.gpt)) ? t('gApprox')(fmt(g, 1)) : '';
  document.querySelectorAll('[data-a="gSet"]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === g)));
  document.querySelectorAll('[data-a="qSet"]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === num(fd.qty))));
  const pu = document.getElementById('pcu'); if (pu) pu.textContent = t('pc')(fd.qty);
  document.querySelectorAll('[data-a="sizeSet"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === fd.size)));
  const sb = document.querySelector('[data-a="logSave"]'); if (sb) sb.disabled = !(g > 0);
}

/* ---------- My food ---------- */
let mf = null;
function vMyFood(q) {
  if (!mf || mf.key !== location.hash) {
    const ex = q.id ? S.myFoods.find(f => f.id === q.id) : null;
    mf = { key: location.hash, id: ex ? ex.id : null, name: ex ? ex.name : (q.name || ''), barcode: ex ? (ex.barcode || '') : (q.barcode || ''), n: ex ? ex.n.map(v => v == null ? '' : v) : ['', '', '', '', '', '', '', ''], meal: q.meal, d: q.d };
  }
  const labels = ['energy', 'protein', 'carbs', 'fat', 'sugars', 'fibre', 'satfat', 'salt'];
  const ok = mf.name.trim() && num(mf.n[0]) != null;
  return `<div class="head">${backBtn(q.meal ? `/add?meal=${q.meal}&d=${q.d || todayStr()}` : '/settings')}<h1 style="font-size:22px">${esc(t('myFoodTitle'))}</h1></div>
    <div class="field"><label for="mf-name">${esc(t('name'))}</label><input id="mf-name" class="input" data-in="mf" data-k="name" value="${esc(mf.name)}"></div>
    <div class="field"><label for="mf-bc">${esc(t('barcode'))}</label><input id="mf-bc" class="input mono" inputmode="numeric" data-in="mf" data-k="barcode" value="${esc(mf.barcode)}"></div>
    <span class="sectionlbl">${esc(t('per100g'))}</span>
    <div class="grid2">${labels.map((l, i) => `<div class="field"><label for="mf-${i}">${esc(t(l))} (${i === 0 ? 'kcal' : 'g'})</label><input id="mf-${i}" class="input mono" inputmode="decimal" data-in="mf" data-k="n${i}" value="${esc(mf.n[i])}"></div>`).join('')}</div>
    <div class="col" style="margin-top:auto;gap:10px"><button class="btn" data-a="mfSave" ${ok ? '' : 'disabled'}>${esc(t('save'))}</button>${mf.id ? `<button class="btn danger" data-a="mfDel">${esc(t('delete'))}</button>` : ''}</div>`;
}

/* ---------- Scan ---------- */
let scanState = { stream: null, status: '', product: null, code: '' };
function vScan(q) {
  const can = 'BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  const p = scanState.product;
  return `<div class="head">${backBtn(`/add?meal=${q.meal || defaultMeal()}&d=${q.d || todayStr()}`)}<h1 style="font-size:22px">${esc(t('scanTitle'))}</h1></div>
    ${can ? '<video class="scan" id="scanv" playsinline muted></video>' : `<div class="note plain">${icon.info}<span>${esc(t('scanNo'))}</span></div>`}
    <div class="row"><label class="field grow"><span class="lbl">${esc(t('scanType'))}</span><input class="input mono" id="bc" inputmode="numeric" value="${esc(scanState.code)}" data-in="bc"></label></div>
    <button class="btn secondary" data-a="lookup" data-meal="${q.meal || ''}" data-d="${q.d || ''}">${esc(t('lookup'))}</button>
    ${scanState.status ? `<p class="small muted" id="scanstatus">${esc(scanState.status)}</p>` : ''}
    ${p ? `<div class="card col"><span class="xs muted">${esc(t('offFound'))}</span><span style="font-weight:600">${esc(p.name)}</span>
        <div class="kv"><span>${esc(t('energy'))}</span><span class="mono">${fmt(p.n[0])} kcal/100 g</span></div><div class="kv"><span>${esc(t('protein'))}</span><span class="mono">${fmt(p.n[1], 1)} g</span></div><div class="kv"><span>${esc(t('carbs'))}</span><span class="mono">${fmt(p.n[2], 1)} g</span></div><div class="kv"><span>${esc(t('fat'))}</span><span class="mono">${fmt(p.n[3], 1)} g</span></div>
        <p class="xs muted">${esc(t('offNote'))}</p><button class="btn" data-a="offUse" data-meal="${q.meal || ''}" data-d="${q.d || ''}">${esc(t('next'))}</button></div>` : ''}
    ${scanState.notFound ? `<a class="btn secondary" href="#/myfood?meal=${q.meal || ''}&d=${q.d || ''}&barcode=${encodeURIComponent(scanState.code)}">${esc(t('addFromLabel'))}</a>` : ''}`;
}
async function startScan() {
  stopScan();
  const v = document.getElementById('scanv'); if (!v) return;
  try {
    const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    scanState.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    v.srcObject = scanState.stream; await v.play();
    const tick = async () => {
      if (!scanState.stream || !document.getElementById('scanv')) return;
      try { const r = await det.detect(v); if (r.length) { scanState.code = r[0].rawValue; stopScan(); lookup(); return; } } catch (e) { }
      requestAnimationFrame(tick);
    };
    tick();
  } catch (e) { scanState.status = t('scanNo'); }
}
function stopScan() { if (scanState.stream) { scanState.stream.getTracks().forEach(x => x.stop()); scanState.stream = null; } }
async function lookup() {
  const code = (scanState.code || '').replace(/\D/g, ''); if (!code) return;
  const mine = S.myFoods.find(f => f.barcode === code);
  const { q } = route();
  if (mine) { go(`/food?src=m&id=${encodeURIComponent(mine.id)}&meal=${q.meal || defaultMeal()}&d=${q.d || todayStr()}`); return; }
  scanState.status = t('looking'); scanState.product = null; scanState.notFound = false; render();
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_el,product_name_en,brands,nutriments`);
    const j = await r.json();
    const pr = j && j.product; const nu = pr && pr.nutriments;
    if (!pr || !nu || nu['energy-kcal_100g'] == null) { scanState.status = t('offNotFound'); scanState.notFound = true; }
    else {
      const nm = (S.lang === 'el' && pr.product_name_el) || pr.product_name || pr.product_name_en || code;
      const g = k => nu[k] == null ? null : Math.round(Number(nu[k]) * 100) / 100;
      scanState.product = { name: (pr.brands ? pr.brands.split(',')[0] + ' · ' : '') + nm, n: [g('energy-kcal_100g'), g('proteins_100g'), g('carbohydrates_100g'), g('fat_100g'), g('sugars_100g'), g('fiber_100g'), g('saturated-fat_100g'), g('salt_100g')] };
      scanState.status = '';
    }
  } catch (e) { scanState.status = t('offError'); scanState.notFound = true; }
  render();
}

/* ---------- Planner ---------- */
function vPlanner(q) {
  const P = ui.plan; const ds = todayStr();
  const f = getFood(P.food.src, P.food.id);
  const pair = f && P.food.src === 'c' ? PAIR.get(f.id) : null;
  const left = Math.max(0, dayInfo(ds).target - dayTotals(ds).tot[0]);
  const idx = { kcal: 0, p: 1, c: 2, f: 3 }[P.unit];
  const amount = P.mode === 'fill' ? left : Number(P.amount) || 0;
  const unitIdx = P.mode === 'fill' ? 0 : idx;
  const grams = food => { const v = food && food.n[unitIdx]; return v ? Math.round(amount / v * 100) : null; };
  let cards = '';
  if (f) {
    if (pair) {
      const d = getFood('c', pair.dry), c = getFood('c', pair.cooked);
      cards = `<div class="grid2"><div class="card strong col" style="gap:4px"><span class="small" style="color:var(--accent);font-weight:600">${esc(t('weighDry'))}</span><span class="big">${grams(d) == null ? '–' : fmt(grams(d))}<span class="unit">g</span></span><span class="xs muted">${esc(t('beforeCookingL'))}<br>${esc(t('perHundred')(fmt(d.n[0])))}</span></div>
        <div class="card col" style="gap:4px"><span class="small" style="font-weight:600">${esc(t('weighCooked'))}</span><span class="big">${grams(c) == null ? '–' : fmt(grams(c))}<span class="unit">g</span></span><span class="xs muted">${esc(t('onPlate'))}<br>${esc(t('perHundred')(fmt(c.n[0])))}</span></div></div>`;
    } else cards = `<div class="card strong col" style="gap:4px"><span class="small" style="color:var(--accent);font-weight:600">${esc(t('weighIt'))}</span><span class="big">${grams(f) == null ? '–' : fmt(grams(f))}<span class="unit">g</span></span><span class="xs muted">${esc(t('perHundred')(fmt(f.n[0])))}</span></div>`;
  }
  const units = [['kcal', 'unitKcal'], ['p', 'unitP'], ['c', 'unitC'], ['f', 'unitF']];
  return `<div class="col" style="gap:4px;min-height:44px;justify-content:center"><h1 style="font-size:22px">${esc(t('planner'))}</h1><span class="muted small">${esc(t('plannerQ'))}</span></div>
    <div class="seg"><button data-a="planMode" data-v="set" aria-pressed="${P.mode === 'set'}">${esc(t('setAmount'))}</button><button data-a="planMode" data-v="fill" aria-pressed="${P.mode === 'fill'}">${esc(t('fillLeft'))}</button></div>
    <div class="card col" style="gap:12px">
      ${P.mode === 'set' ? `<label class="field"><span class="lbl">${esc(t('iWant'))}</span><div class="row" style="align-items:baseline"><input class="huge" inputmode="decimal" data-in="planAmt" value="${esc(P.amount)}" style="width:${Math.max(2, String(P.amount).length) + 0.5}ch;border:0;background:transparent;padding:0;outline:0"><span class="unit">${esc(t(units.find(u => u[0] === P.unit)[1]))}</span></div></label>
        <div class="chips">${units.map(([k, l]) => `<button class="chip" data-a="planUnit" data-v="${k}" aria-pressed="${P.unit === k}">${esc(t(l))}</button>`).join('')}</div>`
        : `<div class="col" style="gap:4px"><span class="lbl">${esc(t('leftToday'))}</span><div class="row" style="align-items:baseline"><span class="huge">${fmt(left)}</span><span class="unit">kcal ${esc(t('of'))} ${fmt(dayInfo(ds).target)}</span></div>${left === 0 ? `<span class="small muted">${esc(t('nothingLeft'))}</span>` : ''}</div>`}
      <div style="height:1px;background:var(--line2)"></div>
      <button class="item" data-a="planPick" style="min-height:48px"><div class="grow"><div class="xs muted">${esc(t('from'))}</div><div class="name" style="font-weight:500">${f ? esc(f.name) : esc(t('pickFood'))} ${f ? `<span class="tag">${esc(f.tag)}</span>` : ''}</div></div><span class="small" style="color:var(--accent)">${esc(t('change'))}</span></button>
    </div>
    <div id="plancards">${cards}</div>`;
}
function openPicker() {
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="row between"><h2>${esc(t('pickFood'))}</h2><button class="iconbtn" data-close aria-label="${esc(t('cancel'))}">✕</button></div>
    <label class="search">${icon.search}<input type="search" id="pq" placeholder="${esc(t('searchPh'))}" autocomplete="off"></label><div id="pres" class="card tight list"></div></div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) close(); const it = e.target.closest('[data-pick]'); if (it) { const [src, id] = it.dataset.pick.split('|'); ui.plan.food = { src, id: src === 'c' ? Number(id) : id }; close(); render(); } });
  const inp = bg.querySelector('#pq'); const out = bg.querySelector('#pres');
  const draw = () => {
    const qv = inp.value; const mine = S.myFoods.filter(f => qv && norm(f.name).includes(norm(qv))).map(f => getFood('m', f.id));
    const res = searchFoods(qv, 30).map(f => getFood('c', f.id));
    out.innerHTML = [...mine, ...res].map(f => `<button class="item" data-pick="${f.src}|${esc(f.id)}"><div class="grow"><div class="name">${esc(f.name)}</div><div class="tags"><span class="tag">${esc(f.tag)}</span></div></div><span class="mono xs muted">${fmt(f.n[0])}</span></button>`).join('') || `<p class="small muted" style="padding:12px 0">${esc(qv ? t('noResults') : '')}</p>`;
  };
  inp.addEventListener('input', draw); setTimeout(() => inp.focus(), 50);
}

/* ---------- Weight ---------- */
function vWeight() {
  const ws = S.weights.slice().sort((a, b) => a.date < b.date ? 1 : -1);
  const cal = calibration(); const c = calcTargets(S.profile);
  let calHtml = '';
  if (cal && !cal.ready) calHtml = `<p class="small muted">${esc(t('calNeed')(cal.days, cal.weighins))}</p>`;
  else if (cal && cal.low) calHtml = `<div class="note plain">${icon.info}<span>${esc(t('calLow'))}</span></div>`;
  else if (cal) calHtml = `<p>${esc(t('calSuggest')(fmt(cal.maintRound)))}</p>
      <details class="card"><summary style="font-weight:600;min-height:32px;cursor:pointer">${esc(t('calWorking'))}</summary>
        <div class="kv"><span>${esc(t('calDays'))}</span><span class="mono">${cal.days}</span></div>
        <div class="kv"><span>${esc(t('calAvg'))}</span><span class="mono">${fmt(cal.avg)} kcal</span></div>
        <div class="kv"><span>${esc(t('calTrend'))}</span><span class="mono">${cal.slope >= 0 ? '+' : '−'}${fmt(Math.abs(cal.slope * 7), 2)} ${esc(t('calPerWeek'))}</span></div>
        <div class="kv"><span>${esc(t('calNew'))}</span><span class="mono">${fmt(cal.rest)} / ${fmt(cal.workout)}</span></div></details>
      ${cal.capped ? `<p class="xs muted">${esc(t('calCapped'))}</p>` : ''}
      ${S.profile.custom && S.profile.custom.rest ? `<p class="xs muted">${esc(t('calCustom'))}</p>` : ''}
      <div class="grid2"><button class="btn" data-a="calApply">${esc(t('calApply'))}</button><button class="btn secondary" data-a="calLater">${esc(t('calLater'))}</button></div>`;
  return `<div class="col" style="gap:4px;min-height:44px;justify-content:center"><h1 style="font-size:22px">${esc(t('wTitle'))}</h1></div>
    <div class="card col" style="gap:12px"><div class="grid2"><label class="field"><span class="lbl">${esc(t('wDate'))}</span><input type="date" class="input" id="wd" value="${todayStr()}" max="${todayStr()}"></label>
      <label class="field"><span class="lbl">${esc(t('wKg'))}</span><input class="input mono" id="wk" inputmode="decimal" value="${esc(S.profile.weight)}"></label></div>
      <button class="btn" data-a="wAdd">${esc(t('wAdd'))}</button></div>
    <div class="col" style="gap:6px"><span class="sectionlbl">${esc(t('calTitle'))}</span><div class="card col" style="gap:12px">${calHtml}</div></div>
    <div class="card tight list">${ws.length ? ws.slice(0, 60).map(w => `<div class="item" style="min-height:48px"><span class="grow">${esc(dayLabel(w.date))} <span class="xs muted">${w.date.slice(0, 4)}</span></span><span class="mono">${fmt(w.kg, 1)} kg</span><button class="iconbtn" data-a="wDel" data-v="${w.date}" aria-label="${esc(t('delete'))}">✕</button></div>`).join('') : `<p class="small muted" style="padding:14px 0">${esc(t('wNone'))}</p>`}</div>`;
}

/* ---------- Settings ---------- */
function vSettings() {
  const p = S.profile, c = calcTargets(p), own = p.custom && p.custom.rest;
  return `<div class="col" style="gap:4px;min-height:44px;justify-content:center"><h1 style="font-size:22px">${esc(t('sTitle'))}</h1></div>
    <div class="field"><span class="lbl">${esc(t('sLang'))}</span><div class="seg"><button data-a="lang" data-v="el" aria-pressed="${S.lang === 'el'}">Ελληνικά</button><button data-a="lang" data-v="en" aria-pressed="${S.lang === 'en'}">English</button></div></div>
    <div class="col" style="gap:6px"><span class="sectionlbl">${esc(t('sTargets'))}</span>
      <div class="card col" style="gap:10px">
        ${own ? `<div class="kv"><span>${esc(t('sRest'))}</span><span class="mono">${fmt(p.custom.rest)} kcal</span></div><div class="kv"><span>${esc(t('sWorkout'))}</span><span class="mono">${fmt(p.custom.workout || p.custom.rest)} kcal</span></div><span class="xs muted">${esc(t('sOwn'))}</span>`
        : `<div class="seg"><button data-a="mode" data-v="split" aria-pressed="${p.mode !== 'same'}">${esc(t('sSplit'))}</button><button data-a="mode" data-v="same" aria-pressed="${p.mode === 'same'}">${esc(t('sSame'))}</button></div>
          ${p.mode === 'same' ? `<div class="kv"><span>${esc(t('everyDay'))}</span><span class="mono">${fmt(r10(c.weekly))} kcal</span></div>` : `<div class="kv"><span>${esc(t('sRest'))}</span><span class="mono">${fmt(c.rest)} kcal</span></div><div class="kv"><span>${esc(t('sWorkout'))}</span><span class="mono">${fmt(c.workout)} kcal</span></div>`}
          ${howGot(p, c)}`}
        <div class="grid2"><a class="btn secondary" href="#/own">${esc(t('sOwn'))}</a>${own ? `<button class="btn secondary" data-a="useCalc">${esc(t('sUseCalc'))}</button>` : `<button class="btn secondary" data-a="redo">${esc(t('sRedo'))}</button>`}</div>
        <label class="field"><span class="lbl">${esc(t('sProteinT'))}</span><input class="input mono" inputmode="numeric" data-in="proteinT" value="${esc(p.proteinT || '')}"></label>
      </div></div>
    <div class="col" style="gap:6px"><span class="sectionlbl">${esc(t('sMyFoods'))}</span><div class="card tight list">${S.myFoods.map(f => `<a class="item" href="#/myfood?id=${encodeURIComponent(f.id)}"><span class="grow name">${esc(f.name)}</span><span class="mono xs muted">${fmt(f.n[0])} ${esc(t('per100'))}</span></a>`).join('')}<a class="item" href="#/myfood" style="color:var(--accent);min-height:48px">${icon.plus}<span>${esc(t('createMy'))}</span></a></div></div>
    <div class="col" style="gap:6px"><span class="sectionlbl">${esc(t('myMeals'))}</span><div class="card tight list">${S.meals.length ? S.meals.map(m => `<div class="item" style="min-height:52px"><div class="grow"><div class="name">${esc(m.name)}</div><div class="xs muted">${esc(t('items')(m.items.length))} · <span class="mono">${fmt(listKcal(m.items))}</span> kcal</div></div><button class="iconbtn" data-a="mealDel" data-v="${esc(m.id)}" aria-label="${esc(t('delete'))}">✕</button></div>`).join('') : `<p class="xs muted" style="padding:14px 0">${esc(t('noMeals'))}</p>`}</div></div>
    <div class="col" style="gap:6px"><span class="sectionlbl">${esc(t('sBackup'))}</span><div class="card col" style="gap:10px"><p class="small">${esc(t('bkLast')(S.backup.last ? t('ago')(daysSince(S.backup.last)) : t('bkNever')))}</p><p class="xs muted">${esc(t('bkHint'))}</p>
      <label class="check"><input type="checkbox" data-a="bkOn" ${S.backup.on ? 'checked' : ''}>${esc(t('bkRemind'))}</label>
      ${S.backup.on ? `<label class="row between"><span class="small">${esc(t('bkEvery'))}</span><input class="input mono" inputmode="numeric" data-in="bkDays" value="${esc(S.backup.days)}" style="width:90px;text-align:center"></label>` : ''}
      <button class="btn secondary" data-a="backup">${esc(t('sExport'))}</button><label class="btn secondary" style="cursor:pointer">${esc(t('sImport'))}<input type="file" accept="application/json,.json" data-a="import" class="sr"></label></div></div>
    <a class="btn ghost" href="#/about">${esc(t('sAbout'))}</a>
    <button class="btn danger" data-a="reset">${esc(t('sReset'))}</button>
    <p class="xs muted" style="text-align:center">Plain Plate v${APP_VERSION} · ${esc(t('installHint'))}</p>`;
}
let own = null;
function vOwn() {
  const p = S.profile || obProfile(); const c = calcTargets(p);
  if (!own) own = { rest: p.custom && p.custom.rest ? p.custom.rest : c.rest, workout: p.custom && p.custom.workout ? p.custom.workout : '' };
  const low = Math.min(num(own.rest) || 99999, num(own.workout) || 99999) < c.bmr;
  return `<div class="head">${backBtn(S.profile ? '/settings' : '/onboarding')}<h1 style="font-size:22px">${esc(t('ownTitle'))}</h1></div><p class="muted small">${esc(t('ownSub'))}</p>
    <label class="field"><span class="lbl">${esc(t('sRest'))} (kcal)</span><input class="input mono" inputmode="numeric" data-in="own" data-k="rest" value="${esc(own.rest)}"></label>
    <label class="field"><span class="lbl">${esc(t('sWorkout'))} (kcal)</span><input class="input mono" inputmode="numeric" data-in="own" data-k="workout" value="${esc(own.workout)}"></label>
    <div id="ownlow">${low ? `<div class="note plain">${icon.info}<span>${esc(t('lowNote')(fmt(c.bmr)))}</span></div>` : ''}</div>
    <div class="col" style="margin-top:auto"><button class="btn" data-a="ownSave">${esc(t('save'))}</button></div>`;
}
function vAbout() {
  return `<div class="head">${backBtn(S.profile ? '/settings' : '/onboarding')}<h1 style="font-size:22px">${esc(t('aboutTitle'))}</h1></div>${t('aboutBody').map(x => `<p class="small">${esc(x)}</p>`).join('')}`;
}

/* ---------- After render hooks ---------- */
function afterRender(path, q) {
  if (path === '/add') { const i = document.getElementById('q'); if (i && !('ontouchstart' in window)) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  if (path === '/scan') { if (!scanState.stream && !scanState.product && !scanState.status) startScan(); } else { stopScan(); if (path !== '/scan') { scanState = { stream: null, status: '', product: null, code: '' }; } }
  if (path !== '/food') fd = null;
  if (path !== '/myfood') mf = null;
  if (path !== '/own') own = null;
  if (path !== '/add') { ui.query = ''; ui.saveMeal = null; }
  window.scrollTo(0, 0);
}

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.tagName === 'INPUT') return;
  const a = el.dataset.a, v = el.dataset.v;
  const { q } = route();
  switch (a) {
    case 'obSet': ob[el.dataset.k] = v; if (el.dataset.k === 'lang') S.lang = v; if (el.dataset.k === 'goal' && v !== 'maintain' && !ob.pace) ob.pace = 'gentle'; render(); break;
    case 'obDay': { const d = Number(v); ob.days = ob.days.includes(d) ? ob.days.filter(x => x !== d) : [...ob.days, d]; render(); break; }
    case 'obBack': ob.step = Math.max(0, ob.step - 1); render(); break;
    case 'obNext':
      if (ob.step < 5) { ob.step++; render(); }
      else { const keepCustom = false; S.profile = obProfile(); if (!keepCustom) S.profile.custom = null; S.calib = null; S.lang = ob.lang; save(); ob = null; go('/'); }
      break;
    case 'obOwn': S.profile = obProfile(); S.lang = ob.lang; save(); break;
    case 'toggleMore': ui.moreOpen = !ui.moreOpen; render(); break;
    case 'toggleSum': S.sumOpen = !S.sumOpen; save(); render(); break;
    case 'toggleType': { const ds = el.dataset.d; const L = S.log[ds] || (S.log[ds] = { entries: [], complete: false }); const cur = dayInfo(ds).workout; L.type = cur ? 'rest' : 'workout'; save(); render(); break; }
    case 'pairSwitch': { const p = PAIR.get(fd.id); if (p && p.state !== v) { const f = getFood('c', fd.id); const o = getFood('c', v === 'dry' ? p.dry : p.cooked); fd.grams = Math.round(fdGrams() * f.n[0] / o.n[0]); fd.unit = 'g'; fd.id = o.id; const sp = spoonFor('c', o.id); fd.gpt = sp ? sp.g : ''; const pc = pieceFor('c', o.id); fd.size = pc.size; fd.gpp = pc.g; fd.gptOpen = false; render(); } break; }
    case 'unitSet': if (fd.unit !== v) { const fam = u => u === 'tsp' || u === 'tbsp' ? 'spoon' : u; if (v === 'g') fd.grams = Math.round(fdGrams()) || fd.grams; else if (fam(v) !== fam(fd.unit)) fd.qty = 1; fd.unit = v; fd.gptOpen = false; render(); } break;
    case 'sizeSet': { const pd = pieceDefault(fd.src, fd.id); fd.size = v; fd.gpp = v === 'mine' ? (S.piece[foodKey(fd.src, fd.id)] || fd.gpp) : pd.sizes[v]; fd.gptOpen = false; render(); break; }
    case 'qStep': fd.qty = Math.max(0, (num(fd.qty) || 0) + Number(v)); document.getElementById('qty').value = fd.qty; updateFoodLive(); break;
    case 'qSet': fd.qty = Number(v); document.getElementById('qty').value = fd.qty; updateFoodLive(); break;
    case 'gptEdit': fd.gptOpen = true; render(); { const gi = document.getElementById('gpt') || document.getElementById('gpp'); if (gi) { gi.focus(); gi.select(); } } break;
    case 'gStep': fd.grams = Math.max(0, (Number(String(fd.grams).replace(',', '.')) || 0) + Number(v)); document.getElementById('grams').value = fd.grams; updateFoodLive(); break;
    case 'gSet': fd.grams = Number(v); document.getElementById('grams').value = fd.grams; updateFoodLive(); break;
    case 'mealSet': fd.meal = v; render(); break;
    case 'logSave': {
      const ds = el.dataset.d; const f = getFood(fd.src, fd.id); const L = S.log[ds] || (S.log[ds] = { entries: [], complete: false });
      const pair = fd.src === 'c' ? PAIR.get(f.id) : null;
      const spoon = fd.unit === 'tsp' || fd.unit === 'tbsp', gpt = num(fd.gpt);
      const entry = { src: fd.src, ref: f.id, name: f.name, tag: f.tag, n: f.n, grams: Math.round(fdGrams() * 10) / 10, meal: fd.meal, approx: fd.approx, state: pair ? pair.state : null, at: fd.edit != null && L.entries[fd.edit] ? L.entries[fd.edit].at : Date.now() };
      if (fd.unit === 'pc') { entry.unit = 'pc'; entry.qty = num(fd.qty); entry.gpp = num(fd.gpp); entry.size = fd.size; S.piece[foodKey(fd.src, f.id)] = fd.size === 'mine' ? entry.gpp : fd.size; }
      else if (spoon) { entry.unit = fd.unit; entry.qty = num(fd.qty); entry.gpt = gpt; const key = foodKey(fd.src, f.id); if (gpt === spoonDefault(fd.src, f.id)) delete S.spoon[key]; else S.spoon[key] = gpt; }
      if (fd.edit != null) L.entries[fd.edit] = entry; else L.entries.push(entry);
      S.recent = [{ src: fd.src, id: f.id, grams: fd.unit !== 'g' ? (S.recent.find(r => r.src === fd.src && String(r.id) === String(f.id)) || { grams: 100 }).grams : entry.grams, unit: fd.unit, qty: fd.unit !== 'g' ? entry.qty : null }, ...S.recent.filter(r => !(r.src === fd.src && String(r.id) === String(f.id)))].slice(0, 30);
      save();
      if (fd.edit != null && fd.from !== 'add') { toast(t('saved')); go('/?d=' + ds); } else { toast(fd.edit != null ? t('saved') : t('addedTo')(t(fd.meal).toLowerCase())); go(`/add?meal=${fd.meal}&d=${ds}`); }
      break;
    }
    case 'logDel': { const ds = el.dataset.d; S.log[ds].entries.splice(fd.edit, 1); save(); toast(t('toastRemoved')); go(fd.from === 'add' ? `/add?meal=${fd.meal}&d=${ds}` : '/?d=' + ds); break; }
    case 'mfSave': {
      const n = mf.n.map(x => num(x)); const id = mf.id || 'm' + Date.now().toString(36);
      const obj = { id, name: mf.name.trim(), barcode: (mf.barcode || '').replace(/\D/g, '') || null, n, off: mf.off || false };
      const i = S.myFoods.findIndex(f => f.id === id); if (i >= 0) S.myFoods[i] = obj; else S.myFoods.push(obj);
      save(); toast(t('saved'));
      if (mf.meal) go(`/food?src=m&id=${encodeURIComponent(id)}&meal=${mf.meal}&d=${mf.d || todayStr()}`); else go('/settings');
      break;
    }
    case 'mfDel': if (confirm(t('delConfirm'))) { S.myFoods = S.myFoods.filter(f => f.id !== mf.id); save(); go('/settings'); } break;
    case 'lookup': scanState.code = document.getElementById('bc').value; lookup(); break;
    case 'offUse': {
      const p = scanState.product; const id = 'o' + scanState.code;
      const obj = { id, name: p.name, barcode: scanState.code, n: p.n, off: true };
      const i = S.myFoods.findIndex(f => f.id === id); if (i >= 0) S.myFoods[i] = obj; else S.myFoods.push(obj);
      save(); go(`/food?src=m&id=${encodeURIComponent(id)}&meal=${el.dataset.meal || defaultMeal()}&d=${el.dataset.d || todayStr()}`); break;
    }
    case 'planMode': ui.plan.mode = v; render(); break;
    case 'planUnit': ui.plan.unit = v; render(); break;
    case 'planPick': openPicker(); break;
    case 'wAdd': {
      const d = document.getElementById('wd').value, kg = num(document.getElementById('wk').value);
      if (!d || !kg || kg < 25 || kg > 400) return;
      S.weights = [...S.weights.filter(w => w.date !== d), { date: d, kg }];
      if (d >= (S.weights.reduce((m, w) => w.date > m ? w.date : m, ''))) S.profile.weight = kg;
      save(); toast(t('saved')); render(); break;
    }
    case 'wDel': S.weights = S.weights.filter(w => w.date !== v); save(); render(); break;
    case 'calApply': { const cal = calibration(); if (cal && cal.ready && !cal.low) { S.calib = { maintRest: cal.maintRest, date: todayStr() }; S.profile.custom = null; save(); toast(t('calApplied')); render(); } break; }
    case 'calLater': S.calib = S.calib || null; toast('OK'); break;
    case 'lang': S.lang = v; save(); render(); break;
    case 'mode': S.profile.mode = v; save(); render(); break;
    case 'redo': startOnboarding(true); break;
    case 'useCalc': S.profile.custom = null; save(); render(); break;
    case 'ownSave': { const r = num(own.rest), w = num(own.workout); if (!r || r < 500) return; S.profile.custom = { rest: Math.round(r), workout: w ? Math.round(w) : null }; save(); toast(t('saved')); go('/'); break; }
    case 'backup': doBackup(); break;
    case 'bkLater': S.backup.snooze = todayStr(); save(); render(); break;
    case 'repeatLast': { const meal = q.meal || defaultMeal(), ds = q.d || todayStr(); addEntries(ds, meal, mealItems(v, meal).map(([e]) => e)); break; }
    case 'mealUse': { const m = S.meals.find(x => x.id === v); if (m) addEntries(q.d || todayStr(), q.meal || defaultMeal(), m.items); break; }
    case 'mealSaveOpen': { ui.saveMeal = t('mealNameDef')(t(q.meal || defaultMeal()).toLowerCase()); render(); const mi = document.getElementById('mealname'); if (mi) { mi.focus(); mi.select(); } break; }
    case 'mealSaveCancel': ui.saveMeal = null; render(); break;
    case 'mealSave': { const name = (ui.saveMeal || '').trim(); if (!name) return; const items = mealItems(q.d || todayStr(), q.meal || defaultMeal()).map(([e]) => stripEntry(e));
      S.meals = [{ id: 'meal' + Date.now().toString(36), name, items }, ...S.meals]; ui.saveMeal = null; save(); toast(t('mealSaved')); render(); break; }
    case 'mealDel': if (confirm(t('mealDelQ'))) { S.meals = S.meals.filter(m => m.id !== v); save(); render(); } break;
    case 'export': {
      const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
      const a2 = document.createElement('a'); a2.href = URL.createObjectURL(blob); a2.download = `plain-plate-backup-${todayStr()}.json`; document.body.appendChild(a2); a2.click(); a2.remove(); break;
    }
    case 'reset': if (confirm(t('sResetQ'))) { localStorage.removeItem(STORE_KEY); S = blank(); go('/onboarding'); startOnboarding(); } break;
  }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.a === 'complete') { const ds = el.dataset.d; const L = S.log[ds] || (S.log[ds] = { entries: [], complete: false }); L.complete = el.checked; save(); }
  if (el.dataset.a === 'approxSet') { fd.approx = el.checked; }
  if (el.dataset.a === 'bkOn') { S.backup.on = el.checked; save(); render(); }
  if (el.dataset.a === 'import' && el.files[0]) {
    const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (d && d.v === 1) { S = Object.assign(blank(), d); save(); toast(t('sImported')); go('/'); render(); } } catch (x) { toast('✕'); } }; r.readAsText(el.files[0]);
  }
  if (el.dataset.in === 'ob' && el.tagName === 'SELECT') { ob[el.dataset.k] = el.value; render(); }
});
document.addEventListener('input', e => {
  const el = e.target, k = el.dataset.in; if (!k) return;
  if (k === 'ob') { ob[el.dataset.k] = el.value; const nb = document.querySelector('[data-a="obNext"]'); if (nb && ob.step === 1) { const ok = num(ob.age) >= 15 && num(ob.age) <= 100 && num(ob.height) >= 120 && num(ob.height) <= 230 && num(ob.weight) >= 30 && num(ob.weight) <= 300; nb.disabled = !ok; } }
  if (k === 'query') {
    ui.query = el.value; const { q } = route(); const meal = q.meal || defaultMeal(), ds = q.d || todayStr();
    const box = document.getElementById('results'); if (!box) return;
    // re-render only the result list, keeping focus in the box
    const tmp = document.createElement('div'); tmp.innerHTML = vAdd(q); box.innerHTML = tmp.querySelector('#results').innerHTML;
  }
  if (k === 'grams') { fd.grams = el.value; updateFoodLive(); }
  if (k === 'qty') { fd.qty = el.value; updateFoodLive(); }
  if (k === 'gpp') { const x = num(el.value); fd.gpp = x && x > 0 ? x : ''; fd.size = 'mine'; updateFoodLive(); }
  if (k === 'gpt') { const x = num(el.value); fd.gpt = x && x > 0 ? Math.round(x * SPOON_DIV[fd.unit] * 100) / 100 : ''; updateFoodLive(); }
  if (k === 'mf') { const kk = el.dataset.k; if (kk.startsWith('n')) mf.n[Number(kk.slice(1))] = el.value; else mf[kk] = el.value; const sb = document.querySelector('[data-a="mfSave"]'); if (sb) sb.disabled = !(mf.name.trim() && num(mf.n[0]) != null); }
  if (k === 'bc') scanState.code = el.value;
  if (k === 'planAmt') { ui.plan.amount = el.value; el.style.width = (Math.max(2, el.value.length) + 0.5) + 'ch'; const tmp = document.createElement('div'); tmp.innerHTML = vPlanner({}); document.getElementById('plancards').innerHTML = tmp.querySelector('#plancards').innerHTML; }
  if (k === 'own') { own[el.dataset.k] = el.value; const c = calcTargets(S.profile || obProfile()); const low = Math.min(num(own.rest) || 99999, num(own.workout) || 99999) < c.bmr; document.getElementById('ownlow').innerHTML = low ? `<div class="note plain">${icon.info}<span>${esc(t('lowNote')(fmt(c.bmr)))}</span></div>` : ''; }
  if (k === 'mealName') ui.saveMeal = el.value;
  if (k === 'bkDays') { const n = Math.round(num(el.value)); if (n >= 1 && n <= 90) { S.backup.days = n; save(); } }
  if (k === 'proteinT') { S.profile.proteinT = num(el.value) || null; save(); }
});
function toast(msg) { document.querySelectorAll('.toast').forEach(x => x.remove()); const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 1800); }

/* ---------- Boot ---------- */
(async function boot() {
  render();
  try { await loadDB(); } catch (e) { document.getElementById('app').innerHTML = '<main class="screen"><p>Could not load food data.</p></main>'; return; }
  render();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
})();
