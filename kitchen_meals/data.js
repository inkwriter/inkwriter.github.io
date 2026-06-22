// ─── CONSTANTS ───────────────────────────────────────────────────
const DAYS  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MEALS = ["Breakfast","Lunch","Dinner"];

const UNITS = ["ct","lb","oz","cup","bag","box","can","jar","gallon","tbsp","tsp","slices","packet","loaf","head","roll","bottle","pack"];

const GROCERY_CATS = ["Produce","Meat","Dairy","Grains","Canned/Dry","Frozen","Snacks","Household","Other"];

const SUPPLY_CATS = ["Paper Goods","Cleaning","Personal Care","Kitchen","Laundry","Baby/Kids","Other"];

const DEFAULT_RECIPES = [
  { id:"r1",  name:"Scrambled Eggs & Toast",     tags:["breakfast","quick"],        ingredients:[{name:"eggs",qty:6,unit:"ct"},{name:"bread",qty:4,unit:"slices"},{name:"butter",qty:1,unit:"tbsp"}] },
  { id:"r2",  name:"Pancakes",                   tags:["breakfast"],                ingredients:[{name:"pancake mix",qty:2,unit:"cup"},{name:"eggs",qty:2,unit:"ct"},{name:"milk",qty:1,unit:"cup"}] },
  { id:"r3",  name:"Cereal & Milk",              tags:["breakfast","quick"],        ingredients:[{name:"cereal",qty:1,unit:"box"},{name:"milk",qty:0.5,unit:"gallon"}] },
  { id:"r4",  name:"PB&J Sandwiches",            tags:["lunch","quick"],            ingredients:[{name:"bread",qty:10,unit:"slices"},{name:"peanut butter",qty:3,unit:"tbsp"},{name:"jelly",qty:3,unit:"tbsp"}] },
  { id:"r5",  name:"Grilled Cheese & Tomato Soup", tags:["lunch"],                 ingredients:[{name:"bread",qty:10,unit:"slices"},{name:"cheese",qty:10,unit:"slices"},{name:"butter",qty:2,unit:"tbsp"},{name:"tomato soup",qty:2,unit:"can"}] },
  { id:"r6",  name:"Mac & Cheese",               tags:["lunch","dinner","quick"],   ingredients:[{name:"mac & cheese",qty:3,unit:"box"},{name:"butter",qty:3,unit:"tbsp"},{name:"milk",qty:0.25,unit:"cup"}] },
  { id:"r7",  name:"Spaghetti & Meat Sauce",     tags:["dinner"],                  ingredients:[{name:"spaghetti",qty:1,unit:"lb"},{name:"ground beef",qty:1,unit:"lb"},{name:"pasta sauce",qty:1,unit:"jar"}] },
  { id:"r8",  name:"Chicken & Rice",             tags:["dinner"],                  ingredients:[{name:"chicken breast",qty:2,unit:"lb"},{name:"rice",qty:2,unit:"cup"},{name:"chicken broth",qty:2,unit:"cup"}] },
  { id:"r9",  name:"Tacos",                      tags:["dinner"],                  ingredients:[{name:"ground beef",qty:1.5,unit:"lb"},{name:"taco shells",qty:1,unit:"box"},{name:"taco seasoning",qty:1,unit:"packet"},{name:"shredded cheese",qty:1,unit:"bag"},{name:"sour cream",qty:1,unit:"ct"}] },
  { id:"r10", name:"Chili",                      tags:["dinner"],                  ingredients:[{name:"ground beef",qty:1,unit:"lb"},{name:"kidney beans",qty:2,unit:"can"},{name:"diced tomatoes",qty:2,unit:"can"},{name:"chili seasoning",qty:1,unit:"packet"}] },
  { id:"r11", name:"Frozen Pizza Night",         tags:["dinner","weekend"],        ingredients:[{name:"frozen pizza",qty:2,unit:"ct"}] },
  { id:"r12", name:"Hamburgers",                 tags:["dinner","weekend"],        ingredients:[{name:"ground beef",qty:2,unit:"lb"},{name:"hamburger buns",qty:8,unit:"ct"},{name:"cheese",qty:8,unit:"slices"}] },
];

const DEFAULT_SUPPLIES = [
  { id:"s1", name:"Toilet Paper",      qty:4, unit:"roll",   threshold:4, category:"Paper Goods" },
  { id:"s2", name:"Paper Towels",      qty:2, unit:"roll",   threshold:2, category:"Paper Goods" },
  { id:"s3", name:"Dish Soap",         qty:1, unit:"bottle", threshold:1, category:"Kitchen" },
  { id:"s4", name:"Trash Bags",        qty:1, unit:"box",    threshold:1, category:"Cleaning" },
  { id:"s5", name:"Laundry Detergent", qty:1, unit:"bottle", threshold:1, category:"Laundry" },
  { id:"s6", name:"Wasp Spray",        qty:1, unit:"ct",     threshold:1, category:"Cleaning" },
];

const DEFAULT_CATEGORIES = GROCERY_CATS.map((name, i) => ({ id: uid(), name, color: "#2a5c45", order: i }));

const DEFAULT_SETTINGS = {
  familyName:    "Sexton",
  familySize:    5,
  groceryBudget: 175,
  primaryStore:  "Walmart",
};

// ─── HELPERS ─────────────────────────────────────────────────────
function uid() {
  return "id_" + Math.random().toString(36).slice(2, 9);
}

function emptyPlan() {
  const plan = {};
  DAYS.forEach(d => { plan[d] = { Breakfast: "", Lunch: "", Dinner: "" }; });
  return plan;
}
